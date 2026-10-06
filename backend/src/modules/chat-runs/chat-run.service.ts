import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from "@nestjs/common";
import { Prisma, ChatRun } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ChatService } from "../chat/application/chat.service";
import { JobDiscoveryService } from "../job-discovery/application/job-discovery.service";
import { DiscoveryError } from "../job-discovery/domain/discovery";
import {
  ConversationConflict,
  ConversationNotFound,
  ConversationRecord,
} from "../chat/domain/conversation";

export const terminal = (status: string) =>
  ["COMPLETED", "PARTIAL", "FAILED", "CANCELLED"].includes(status);
export interface CreateRunInput {
  requestId: string;
  message?: string;
  conversationId?: string;
  retryOf?: string;
}

@Injectable()
export class ChatRunService implements OnModuleDestroy {
  private readonly logger = new Logger(ChatRunService.name);
  private readonly tasks = new Set<Promise<void>>();
  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly discovery: JobDiscoveryService,
  ) {}
  async owned(userId: string, id: string) {
    const run = await this.prisma.chatRun.findFirst({ where: { id, userId } });
    if (!run) throw new NotFoundException("Run not found");
    return this.recover(run);
  }
  async list(userId: string, conversationId: string) {
    await this.chat.get(userId, conversationId);
    const records = await this.prisma.chatRun.findMany({
      where: { userId, conversationId },
      orderBy: { startedAt: "asc" },
      take: 100,
    });
    for (const record of records) await this.recover(record);
    return this.prisma.chatRun.findMany({
      where: { userId, conversationId },
      orderBy: { startedAt: "asc" },
      take: 100,
      include: { events: { orderBy: { sequence: "asc" }, take: 200 } },
    });
  }
  async create(userId: string, input: CreateRunInput) {
    const existing = await this.prisma.chatRun.findUnique({
      where: { userId_requestId: { userId, requestId: input.requestId } },
    });
    if (existing) return this.view(existing);
    let previous: ChatRun | undefined;
    if (input.retryOf) {
      previous = await this.owned(userId, input.retryOf);
      if (
        previous.status !== "FAILED" ||
        !previous.conversationId ||
        previous.contextVersion == null
      )
        throw new ConflictException(
          "Only a failed committed run can be retried",
        );
      const conversation = await this.chat.get(userId, previous.conversationId);
      if (conversation.version !== previous.contextVersion)
        throw new ConflictException("Conversation context changed");
    } else if (input.conversationId)
      await this.chat.get(userId, input.conversationId);
    const conversationId = previous?.conversationId ?? input.conversationId;
    if (conversationId) {
      const active = await this.prisma.chatRun.findFirst({
        where: {
          conversationId,
          userId,
          status: { in: ["QUEUED", "RUNNING"] },
        },
      });
      if (active && !terminal((await this.recover(active)).status))
        throw new ConflictException("A run is already active");
    }
    let run: ChatRun;
    try {
      run = await this.prisma.chatRun.create({
        data: {
          userId,
          requestId: input.requestId,
          message: previous?.message ?? input.message!.trim(),
          conversationId,
          retryOf: previous?.id,
          contextVersion: previous?.contextVersion,
          userMessageId: previous?.userMessageId,
          assistantMessageId: previous?.assistantMessageId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const duplicate = await this.prisma.chatRun.findUnique({
          where: { userId_requestId: { userId, requestId: input.requestId } },
        });
        if (duplicate) return this.view(duplicate);
        throw new ConflictException(
          "A run is already active for this conversation",
        );
      }
      throw error;
    }
    await this.publish(run.id, "run.created", {});
    const task = this.execute(run).catch((error) => {
      this.logger.error(
        `Run ${run.id} could not persist its terminal state`,
        error,
      );
    });
    this.tasks.add(task);
    void task.finally(() => this.tasks.delete(task));
    return this.view(run);
  }
  view(run: ChatRun) {
    return { runId: run.id, conversationId: run.conversationId };
  }
  async publish(runId: string, type: string, data: Record<string, unknown>) {
    // The row increment and event insert commit together, even across processes.
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.chatRun.update({
        where: { id: runId, status: { in: ["QUEUED", "RUNNING"] } },
        data: { eventSequence: { increment: 1 } },
      });
      return tx.chatRunEvent.create({
        data: {
          runId,
          sequence: run.eventSequence,
          type,
          data: data as Prisma.InputJsonValue,
        },
      });
    });
  }
  async events(userId: string, runId: string, after: number) {
    const run = await this.owned(userId, runId);
    const events = await this.prisma.chatRunEvent.findMany({
      where: { runId, sequence: { gt: after } },
      orderBy: { sequence: "asc" },
      take: 100,
    });
    return {
      events,
      finished:
        terminal(run.status) &&
        events.some((e) => ["run.completed", "run.failed"].includes(e.type)),
      status: run.status,
    };
  }
  private async execute(initial: ChatRun) {
    let run = initial;
    let startedTool = false;
    try {
      await this.prisma.chatRun.update({
        where: { id: run.id },
        data: { status: "RUNNING" },
      });
      await this.publish(run.id, "run.started", {});
      if (!run.conversationId)
        await this.prisma.analyticsEvent.create({
          data: {
            userId: run.userId,
            name: "Chat Started",
            resourceId: run.id,
          },
        });
      let reply: string;
      let shouldSearch = Boolean(run.retryOf);
      if (!run.retryOf) {
        await this.publish(run.id, "context.processing", {});
        let committed: ConversationRecord | undefined;
        const turn = await this.chat.send(
          run.userId,
          run.message,
          run.conversationId ?? undefined,
          (saved) => {
            committed = saved;
          },
        );
        if (!committed) throw new Error("Committed conversation missing");
        const conversation = committed as ConversationRecord;
        const messages = conversation.messages.slice(-2);
        run = await this.prisma.chatRun.update({
          where: { id: run.id },
          data: {
            conversationId: turn.conversationId,
            contextVersion: conversation.version,
            userMessageId: messages[0].id,
            assistantMessageId: messages[1].id,
          },
        });
        await this.publish(run.id, "context.updated", {
          conversation: { ...conversation, messages },
          understandingMode: turn.understandingMode,
          userMessageId: run.userMessageId,
          assistantMessageId: run.assistantMessageId,
        });
        shouldSearch =
          turn.readyForSearch &&
          ["JOB_SEARCH", "UPDATE_SEARCH"].includes(turn.intent);
        reply = turn.message;
      } else {
        const conversation = await this.chat.get(
          run.userId,
          run.conversationId!,
        );
        if (conversation.version !== run.contextVersion)
          throw new ConflictException("Context changed");
        await this.publish(run.id, "context.updated", {
          conversation: {
            ...conversation,
            messages: conversation.messages.filter((m) =>
              [run.userMessageId, run.assistantMessageId].includes(m.id),
            ),
          },
          userMessageId: run.userMessageId,
          assistantMessageId: run.assistantMessageId,
        });
        reply = "جستجو انجام شد.";
      }
      let partial = false;
      if (shouldSearch) {
        startedTool = true;
        await this.prisma.analyticsEvent.create({
          data: {
            userId: run.userId,
            name: "Job Search Started",
            resourceId: run.id,
          },
        });
        await this.publish(run.id, "tool.started", { tool: "job_search" });
        const result = await this.discovery.search(
          run.userId,
          run.conversationId!,
          {
            contextVersion: run.contextVersion!,
            publish: (type, data) =>
              this.publish(run.id, type, data).then(() => undefined),
          },
        );
        partial = result.partial;
        await this.prisma.analyticsEvent.create({
          data: {
            userId: run.userId,
            name: "Job Search Completed",
            resourceId: run.id,
          },
        });
        reply = result.jobs.length
          ? `${result.jobs.length.toLocaleString("fa-IR")} موقعیت مرتبط پیدا شد.`
          : "آگهی معتبری با شرایط فعلی پیدا نشد.";
        if (partial)
          reply += " بعضی منابع کامل بررسی نشدند؛ نتایج موجود حفظ شده‌اند.";
        await this.publish(run.id, "tool.completed", { tool: "job_search" });
      }
      await this.prisma.conversationMessage.update({
        where: { id: run.assistantMessageId! },
        data: { content: reply },
      });
      await this.publish(run.id, "assistant.completed", {
        text: reply,
        messageId: run.assistantMessageId,
      });
      await this.finish(
        run.id,
        partial ? "PARTIAL" : "COMPLETED",
        "run.completed",
        { partial },
      );
    } catch (error) {
      const code =
        error instanceof DiscoveryError
          ? error.code
          : error instanceof ConversationNotFound
            ? "CONVERSATION_NOT_FOUND"
            : error instanceof ConversationConflict ||
                error instanceof ConflictException
              ? "CONTEXT_CHANGED"
              : "RUN_FAILED";
      if (startedTool)
        await this.publish(run.id, "tool.failed", { tool: "job_search" });
      await this.finish(
        run.id,
        "FAILED",
        "run.failed",
        {
          code,
          retryable: Boolean(
            startedTool && run.conversationId && run.contextVersion != null,
          ),
          message: "عملیات انجام نشد. گفتگو و نتایج دریافت‌شده حفظ شده‌اند.",
        },
        code,
      );
    }
  }
  private async finish(
    id: string,
    status: string,
    type: string,
    data: Record<string, unknown>,
    errorCode?: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const run = await tx.chatRun.update({
        where: { id, status: { in: ["QUEUED", "RUNNING"] } },
        data: {
          status,
          completedAt: new Date(),
          errorCode,
          eventSequence: { increment: 1 },
        },
      });
      await tx.chatRunEvent.create({
        data: {
          runId: id,
          sequence: run.eventSequence,
          type,
          data: data as Prisma.InputJsonValue,
        },
      });
    });
  }
  private async recover(run: ChatRun): Promise<ChatRun> {
    // Recover a killed process without silently executing a committed message again.
    if (terminal(run.status) || Date.now() - run.startedAt.getTime() < 180000)
      return run;
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.chatRun.updateMany({
        where: { id: run.id, status: { in: ["QUEUED", "RUNNING"] } },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorCode: "RUN_INTERRUPTED",
          eventSequence: { increment: 1 },
        },
      });
      if (!changed.count) return;
      const current = await tx.chatRun.findUniqueOrThrow({
        where: { id: run.id },
      });
      await tx.chatRunEvent.create({
        data: {
          runId: run.id,
          sequence: current.eventSequence,
          type: "run.failed",
          data: {
            code: "RUN_INTERRUPTED",
            retryable: Boolean(
              run.contextVersion != null && run.conversationId,
            ),
            message:
              "اجرای قبلی متوقف شد. گفتگو و نتایج دریافت‌شده حفظ شده‌اند.",
          },
        },
      });
    });
    return this.prisma.chatRun.findUniqueOrThrow({ where: { id: run.id } });
  }
  async onModuleDestroy() {
    await Promise.allSettled(this.tasks);
  }
}
