import { create } from "zustand";
import apiClient from "@/lib/api-client";
import { readRunStream } from "@/lib/chat-run-stream";
import { useChatStore } from "./useChatStore";
import { runFinished, type ChatRunView, type RunEvent } from "@/types/chat-run";
import type { Conversation } from "@/types/chat";
import type {
  DiscoveryJob,
  DiscoveryResult,
  DiscoveryIssue,
} from "@/types/discovery";

interface RunState {
  generation: number;
  runs: ChatRunView[];
  pending: boolean;
  connection:
    "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";
  error: string | null;
  pendingMessage: string | null;
  reset: () => void;
  start: (
    message: string,
    conversationId?: string,
    retryOf?: string,
  ) => Promise<boolean>;
  restore: (conversationId: string) => Promise<void>;
  receive: (event: RunEvent, applyChat?: boolean) => void;
  reconnect: () => void;
}
let controller: AbortController | undefined;
let uncertain:
  | {
      requestId: string;
      message: string;
      conversationId?: string;
      retryOf?: string;
    }
  | undefined;
const blank = (
  runId: string,
  message: string,
  conversationId: string | null,
): ChatRunView => ({
  runId,
  message,
  conversationId,
  userMessageId: null,
  assistantMessageId: null,
  status: "QUEUED",
  events: [],
  sequence: 0,
  jobs: [],
  sources: [],
  retryable: false,
  error: null,
});
function requestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function connect(runId: string, generation: number) {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  const valid = () =>
    !current.signal.aborted &&
    useChatRunStore.getState().generation === generation;
  for (let attempt = 0; valid(); attempt++) {
    const state = useChatRunStore.getState();
    const run = state.runs.find((item) => item.runId === runId);
    if (!run || runFinished(run.status)) {
      useChatRunStore.setState({ connection: "idle" });
      return;
    }
    useChatRunStore.setState({
      connection: attempt ? "reconnecting" : "connecting",
    });
    try {
      await readRunStream(runId, run.sequence, current.signal, (event) => {
        if (!valid()) return;
        useChatRunStore.setState({ connection: "connected" });
        useChatRunStore.getState().receive(event);
      });
      if (!valid()) return;
      const latest = useChatRunStore
        .getState()
        .runs.find((item) => item.runId === runId);
      if (latest && runFinished(latest.status)) {
        useChatRunStore.setState({ connection: "idle" });
        return;
      }
      throw new Error("Stream interrupted");
    } catch (error) {
      if (!valid()) return;
      const status = (error as { status?: number }).status;
      if (attempt >= 4 || status === 401 || status === 404) {
        useChatRunStore.setState({
          connection: "disconnected",
          error:
            status === 401
              ? "برای ادامه مشاهده وارد حساب شوید."
              : "اتصال قطع شد؛ نتایج حفظ شده‌اند. اتصال را دوباره برقرار کنید.",
        });
        return;
      }
      useChatRunStore.setState({ connection: "reconnecting" });
      await new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timer);
          current.signal.removeEventListener("abort", done);
          resolve();
        };
        const timer = setTimeout(done, Math.min(5000, 500 * 2 ** attempt));
        current.signal.addEventListener("abort", done, { once: true });
      });
    }
  }
}

export const useChatRunStore = create<RunState>((set, get) => ({
  generation: 0,
  runs: [],
  pending: false,
  connection: "idle",
  error: null,
  pendingMessage: null,
  reset: () => {
    controller?.abort();
    uncertain = undefined;
    set((s) => ({
      generation: s.generation + 1,
      runs: [],
      pending: false,
      connection: "idle",
      error: null,
      pendingMessage: null,
    }));
  },
  start: async (message, conversationId, retryOf) => {
    if (
      get().pending ||
      !useChatStore.getState().owner ||
      (!retryOf && !message.trim())
    )
      return false;
    const generation = get().generation;
    if (
      !uncertain ||
      uncertain.message !== message ||
      uncertain.conversationId !== conversationId ||
      uncertain.retryOf !== retryOf
    )
      uncertain = { requestId: requestId(), message, conversationId, retryOf };
    const request = uncertain;
    set({
      pending: true,
      error: null,
      pendingMessage: retryOf ? null : message,
    });
    try {
      const body = retryOf
        ? { requestId: request.requestId, retryOf }
        : {
            requestId: request.requestId,
            message,
            ...(conversationId ? { conversationId } : {}),
          };
      let response;
      try {
        response = await apiClient.post("/api/chat/runs", body, {
          timeout: 10000,
        });
      } catch (error) {
        if (
          (error as { response?: unknown }).response ||
          generation !== get().generation
        )
          throw error;
        // A lost POST response must reuse its idempotency key.
        response = await apiClient.post("/api/chat/runs", body, {
          timeout: 10000,
        });
      }
      if (generation !== get().generation) return false;
      const { runId, conversationId: id } = response.data.data;
      const previous = retryOf
        ? get().runs.find((run) => run.runId === retryOf)
        : undefined;
      set((s) => ({
        runs: [
          ...s.runs,
          {
            ...blank(runId, previous?.message ?? message, id),
            userMessageId: previous?.userMessageId ?? null,
            assistantMessageId: previous?.assistantMessageId ?? null,
          },
        ],
        pendingMessage: null,
      }));
      uncertain = undefined;
      void connect(runId, generation);
      return true;
    } catch (error) {
      if (generation === get().generation) {
        const status = (error as { response?: { status?: number } }).response
          ?.status;
        if (status) uncertain = undefined;
        set({
          pending: false,
          pendingMessage: null,
          error:
            status === 409
              ? "اجرای قبلی هنوز فعال است یا ترجیحات گفتگو تغییر کرده‌اند؛ گفتگو را دوباره باز کنید."
              : status === 429
                ? "تعداد درخواست‌ها زیاد شده؛ کمی بعد دوباره تلاش کنید."
                : "ارسال تأیید نشد؛ متن حفظ شده است. دوباره تلاش کنید یا تاریخچه را بررسی کنید.",
        });
      }
      return false;
    }
  },
  receive: (event, applyChat = true) => {
    const run = get().runs.find((item) => item.runId === event.runId);
    if (!run || event.sequence <= run.sequence) return;
    // A missing event needs replay, never silently advance over it.
    if (event.sequence !== run.sequence + 1)
      throw new Error("Missing run event");
    const next = {
      ...run,
      events: [...run.events, event],
      sequence: event.sequence,
    };
    const data = event.data;
    if (event.type === "run.started") next.status = "RUNNING";
    if (event.type === "context.updated") {
      const conversation = data.conversation as Conversation;
      next.conversationId = conversation.id;
      next.userMessageId = data.userMessageId as string;
      next.assistantMessageId = data.assistantMessageId as string;
      if (applyChat)
        useChatStore.setState((s) => ({
          active: {
            ...conversation,
            messages: [
              ...(s.active?.id === conversation.id
                ? s.active.messages.filter(
                    (m) =>
                      !conversation.messages.some(
                        (incoming) => incoming.id === m.id,
                      ),
                  )
                : []),
              ...conversation.messages,
            ],
          },
          discoveryTrigger: 0,
          conversations: [
            { id: conversation.id, updatedAt: conversation.updatedAt },
            ...s.conversations.filter((c) => c.id !== conversation.id),
          ],
        }));
    }
    if (event.type === "job.accepted") {
      const job = data.job as DiscoveryJob;
      next.jobs = [...run.jobs.filter((item) => item.id !== job.id), job];
    }
    if (
      event.type === "source.completed" ||
      event.type === "source.failed" ||
      event.type === "source.started" ||
      event.type === "source.progress"
    ) {
      const source = data.source as string;
      const previous = run.sources.find((item) => item.source === source);
      next.sources = [
        ...run.sources.filter((item) => item.source !== source),
        {
          source,
          found: Number(
            data.found ??
              (event.type === "source.progress" ? previous?.found : 0) ??
              0,
          ),
          accepted: Number(
            data.accepted ??
              (event.type === "source.progress" ? previous?.accepted : 0) ??
              0,
          ),
          rejected: Number(
            data.rejected ??
              (event.type === "source.progress" ? previous?.rejected : 0) ??
              0,
          ),
          ...(data.issue ? { issue: data.issue as DiscoveryIssue } : {}),
          ...(event.type === "source.failed"
            ? { error: "SOURCE_UNAVAILABLE" }
            : {}),
        },
      ];
    }
    if (event.type === "search.completed" || event.type === "search.cached") {
      next.jobs = data.jobs as DiscoveryJob[];
      next.sources = (
        data.sources as Array<
          DiscoveryResult["sources"][number] & { failed?: boolean }
        >
      ).map((source) => ({
        ...source,
        ...(source.failed ? { error: "SOURCE_UNAVAILABLE" } : {}),
      }));
    }
    if (event.type === "assistant.completed" && applyChat) {
      useChatStore.setState((s) => ({
        active:
          s.active?.id === next.conversationId
            ? {
                ...s.active,
                messages: s.active.messages.map((m) =>
                  m.id === data.messageId
                    ? { ...m, content: data.text as string }
                    : m,
                ),
              }
            : s.active,
      }));
    }
    if (event.type === "run.completed")
      next.status = data.partial ? "PARTIAL" : "COMPLETED";
    if (event.type === "run.failed") {
      next.status = "FAILED";
      next.error = data.message as string;
      next.retryable = Boolean(data.retryable);
    }
    set((s) => ({
      runs: s.runs.map((item) => (item.runId === next.runId ? next : item)),
      pending: s.runs.some(
        (item) =>
          !runFinished(item.runId === next.runId ? next.status : item.status),
      ),
    }));
  },
  restore: async (conversationId) => {
    get().reset();
    const generation = get().generation;
    set({ pending: true });
    try {
      const response = await apiClient.get(
        `/api/chat/conversations/${conversationId}/runs`,
      );
      if (generation !== get().generation) return;
      const records = response.data.data as Array<{
        id: string;
        message: string;
        conversationId: string;
        userMessageId: string | null;
        assistantMessageId: string | null;
        events: Array<RunEvent & { createdAt: string }>;
      }>;
      set({
        pending: false,
        runs: records.map((record) => ({
          ...blank(record.id, record.message, record.conversationId),
          userMessageId: record.userMessageId,
          assistantMessageId: record.assistantMessageId,
        })),
      });
      for (const record of records)
        for (const event of record.events)
          get().receive({ ...event, timestamp: event.createdAt }, false);
      const active = get().runs.find((run) => !runFinished(run.status));
      if (active) {
        set({ pending: true });
        void connect(active.runId, generation);
      }
    } catch {
      if (generation === get().generation)
        set({
          pending: false,
          error: "تاریخچه فعالیت‌ها بارگذاری نشد. گفتگو را دوباره باز کنید.",
        });
    }
  },
  reconnect: () => {
    const active = get().runs.find((run) => !runFinished(run.status));
    if (active) {
      set({ error: null });
      void connect(active.runId, get().generation);
    }
  },
}));
