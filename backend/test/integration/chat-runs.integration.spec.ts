import { INestApplication, Module, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../src/prisma/prisma.service";
import { JwtStrategy } from "../../src/modules/auth/jwt.strategy";
import { ChatService } from "../../src/modules/chat/application/chat.service";
import { ContextService } from "../../src/modules/chat/domain/context.service";
import { PrismaConversationRepository } from "../../src/modules/chat/infrastructure/prisma-conversation.repository";
import { JobDiscoveryService } from "../../src/modules/job-discovery/application/job-discovery.service";
import { PrismaDiscoveryRepository } from "../../src/modules/job-discovery/infrastructure/prisma-discovery.repository";
import { ChatRunService } from "../../src/modules/chat-runs/chat-run.service";
import { ChatRunController } from "../../src/modules/chat-runs/chat-run.controller";
import {
  DiscoveryError,
  DiscoveredJob,
} from "../../src/modules/job-discovery/domain/discovery";
import { DiscoveryProgress } from "../../src/modules/job-discovery/application/discovery.ports";

jest.setTimeout(20000);

const databaseSuite =
  process.env.CHAT_RUN_DB_TEST === "true" ? describe : describe.skip;
databaseSuite("Live runs with HTTP SSE, real JWT and PostgreSQL", () => {
  let prisma: PrismaService,
    app: INestApplication,
    base: string,
    owner: string,
    other: string;
  let release: (() => void) | undefined,
    blocked = false,
    unavailable = false;
  const unblockProvider = () => {
    blocked = false;
    release?.();
  };
  const marker = "Live run fixture " + randomUUID(),
    secret = "live-runs-integration-only";
  const jwt = new JwtService({ secret });
  const auth = (id = owner) => ({
    Authorization: `Bearer ${jwt.sign({ sub: id, email: `${id}@example.test` })}`,
  });
  const job: DiscoveredJob = {
    title: "Backend Developer",
    company: marker,
    location: "Tehran",
    workType: "Remote",
    experienceLevel: null,
    salaryMin: 25000000,
    salaryMax: 35000000,
    currency: "TOMAN",
    salaryPeriod: "MONTHLY",
    description: "API work",
    requiredSkills: ["Node.js"],
    preferredSkills: [],
    source: "jobinja.ir",
    sourceUrl: `https://jobinja.ir/jobs/${randomUUID()}`,
    publishedAt: null,
  };
  const provider = {
    async discover(
      _intent: unknown,
      _signal: AbortSignal,
      progress?: DiscoveryProgress,
      options?: { sources: string[] },
    ) {
      if (unavailable)
        throw new DiscoveryError("JOB_DISCOVERY_UNAVAILABLE", 503);
      if (options && !options.sources.includes("jobinja.ir")) {
        const sources = options.sources.map((source) => ({
          source,
          query: "INTERNAL_QUERY",
          found: 0,
          accepted: 0,
          rejected: 0,
        }));
        for (const source of options.sources)
          await progress?.sourceStarted(source);
        for (const report of sources) await progress?.sourceCompleted(report);
        return { jobs: [], sources };
      }
      await progress?.sourceStarted("jobinja.ir");
      await progress?.sourceStarted("jobvision.ir");
      await progress?.sourceProgress?.("jobvision.ir", "extract");
      await progress?.jobCandidate(job);
      await progress?.jobCandidate({
        ...job,
        source: "jobvision.ir",
        sourceUrl: "https://jobvision.ir/jobs/duplicate",
      });
      if (blocked)
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      const sources = [
        {
          source: "jobinja.ir",
          query: "INTERNAL_QUERY",
          found: 1,
          accepted: 1,
          rejected: 0,
        },
        {
          source: "jobvision.ir",
          query: "INTERNAL_QUERY",
          found: 1,
          accepted: 0,
          rejected: 1,
          error: "RAW_PROVIDER_ERROR",
        },
      ];
      for (const report of sources) await progress?.sourceCompleted(report);
      return { jobs: [job], sources };
    },
  };
  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    owner = randomUUID();
    other = randomUUID();
    for (const id of [owner, other])
      await prisma.user.create({
        data: {
          id,
          email: `${id}@example.test`,
          password: "fixture",
          firstName: "Test",
          lastName: marker,
        },
      });
    const chat = new ChatService(
      new PrismaConversationRepository(prisma),
      new ContextService(),
    );
    const discovery = new JobDiscoveryService(
      new PrismaDiscoveryRepository(prisma),
      provider,
    );
    @Module({
      controllers: [ChatRunController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { getOrThrow: () => secret } },
        JwtStrategy,
        {
          provide: ChatRunService,
          useFactory: () => new ChatRunService(prisma, chat, discovery),
        },
      ],
    })
    class TestModule {}
    app = await NestFactory.create(TestModule, { logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
  });
  afterAll(async () => {
    release?.();
    await app?.close();
    if (prisma) {
      await prisma.user.deleteMany({ where: { id: { in: [owner, other] } } });
      await prisma.job.deleteMany({ where: { company: marker } });
      await prisma.$disconnect();
    }
  });
  const create = (body: unknown, id = owner) =>
    fetch(base + "/api/chat/runs", {
      method: "POST",
      headers: { ...auth(id), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const json = async (response: Response): Promise<{ data: any }> =>
    (await response.json()) as { data: any };
  async function consume(
    runId: string,
    after = 0,
    onEvent?: (event: any) => Promise<void>,
  ) {
    const response = await fetch(`${base}/api/chat/runs/${runId}/events`, {
      headers: { ...auth(), "Last-Event-ID": String(after) },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const events: any[] = [],
      reader = response.body!.getReader(),
      decoder = new TextDecoder();
    let buffer = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const line = frame
            .split("\n")
            .find((part) => part.startsWith("data: "));
          if (line) {
            const event = JSON.parse(line.slice(6));
            events.push(event);
            await onEvent?.(event);
          }
        }
      }
    } finally {
      await reader.cancel();
    }
    return events;
  }
  it("validates payloads and rejects unauthenticated and foreign resources", async () => {
    expect(
      (
        await fetch(base + "/api/chat/runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: randomUUID(), message: "Backend" }),
        })
      ).status,
    ).toBe(401);
    expect((await create({ requestId: randomUUID() })).status).toBe(400);
    expect(
      (await create({ requestId: randomUUID(), message: " " })).status,
    ).toBe(400);
    const foreign = await prisma.conversation.create({
      data: { userId: other, context: {}, version: 1 },
    });
    expect(
      (
        await create({
          requestId: randomUUID(),
          message: "Backend",
          conversationId: foreign.id,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await fetch(`${base}/api/chat/runs/${randomUUID()}/events`, {
          headers: auth(),
        })
      ).status,
    ).toBe(404);
  });
  it("shows a persisted unique job before completion and replays without repeating work", async () => {
    blocked = true;
    const requestId = randomUUID();
    const created = await create({
      requestId,
      message: "کار بک‌اند Node دورکار بالای ۲۰ میلیون",
    });
    expect(created.status).toBe(202);
    const { runId } = (await json(created)).data;
    expect(
      (
        await json(
          await create({
            requestId,
            message: "کار بک‌اند Node دورکار بالای ۲۰ میلیون",
          }),
        )
      ).data.runId,
    ).toBe(runId);
    let found = false;
    const events = await consume(runId, 0, async (event) => {
      if (event.type !== "job.accepted") return;
      found = true;
      expect(
        (await prisma.chatRun.findUniqueOrThrow({ where: { id: runId } }))
          .status,
      ).toBe("RUNNING");
      expect(
        await prisma.job.findUnique({ where: { id: event.data.job.id } }),
      ).not.toBeNull();
      const active = await prisma.chatRun.findUniqueOrThrow({
        where: { id: runId },
      });
      expect(
        (
          await create({
            requestId: randomUUID(),
            message: "React",
            conversationId: active.conversationId,
          })
        ).status,
      ).toBe(409);
      blocked = false;
      release!();
    });
    expect(found).toBe(true);
    expect(events.find((e) => e.type === "source.progress")).toMatchObject({
      data: { source: "jobvision.ir", stage: "extract" },
    });
    expect(events.find((e) => e.type === "source.failed")).toMatchObject({
      data: { issue: { category: "unknown" } },
    });
    const actions = events
      .filter((e) => e.type === "agent.decision")
      .map((e) => e.data.action);
    expect(actions[0]).toBe("SEARCH_SOURCES");
    expect(actions.at(-1)).toBe("FINISH");
    const searches = actions.filter(
      (action) => action === "SEARCH_SOURCES",
    ).length;
    // Five original-query waves and at most three equivalent-query waves.
    expect(searches).toBeLessThanOrEqual(8);
    expect(events.filter((e) => e.type === "agent.observation")).toHaveLength(
      searches,
    );
    expect(events.filter((e) => e.type === "job.accepted")).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({
      type: "run.completed",
      data: { partial: true },
    });
    expect(events.map((e) => e.sequence)).toEqual(events.map((_e, i) => i + 1));
    expect(JSON.stringify(events)).not.toMatch(
      /INTERNAL_QUERY|RAW_PROVIDER_ERROR/,
    );
    expect(await consume(runId, 3)).toEqual(
      events.filter((e) => e.sequence > 3),
    );
    expect(
      (
        await fetch(`${base}/api/chat/runs/${runId}/events`, {
          headers: auth(other),
        })
      ).status,
    ).toBe(404);
    const run = await prisma.chatRun.findUniqueOrThrow({
      where: { id: runId },
    });
    expect(
      await prisma.conversationMessage.count({
        where: { conversationId: run.conversationId! },
      }),
    ).toBe(2);
    expect(
      (
        await json(
          await fetch(
            `${base}/api/chat/conversations/${run.conversationId}/runs`,
            { headers: auth() },
          ),
        )
      ).data[0].events,
    ).toHaveLength(events.length);
    expect(
      (
        await fetch(`${base}/api/chat/runs/${runId}/events?after=invalid`, {
          headers: auth(),
        })
      ).status,
    ).toBe(400);
  });
  it("commits and completes the requested one-job goal while provider work is still blocked", async () => {
    blocked = true;
    release = undefined;
    const created = await create({
      requestId: randomUUID(),
      message: "۱ تا کار بک‌اند Node دورکار بالای ۲۰ میلیون پیدا کن",
    });
    expect(created.status).toBe(202);
    const { runId } = (await json(created)).data;
    try {
      const events = await consume(runId);
      const accepted = events.filter((event) => event.type === "job.accepted");
      expect(accepted).toHaveLength(1);
      expect(
        await prisma.job.findUnique({ where: { id: accepted[0].data.job.id } }),
      ).not.toBeNull();
      expect(
        events.find((event) => event.type === "agent.completed"),
      ).toMatchObject({
        data: {
          reasonCode: "ENOUGH_RESULTS",
          validJobCount: 1,
          partial: false,
        },
      });
      expect(events.at(-1)).toMatchObject({
        type: "run.completed",
        data: { partial: false },
      });
      expect(
        events.filter(
          (event) =>
            event.type === "agent.decision" &&
            event.data.action === "SEARCH_SOURCES",
        ),
      ).toHaveLength(1);
      expect(
        (await prisma.chatRun.findUniqueOrThrow({ where: { id: runId } }))
          .status,
      ).toBe("COMPLETED");
      const count = await prisma.chatRunEvent.count({ where: { runId } });
      unblockProvider();
      await new Promise((resolve) => setImmediate(resolve));
      expect(await prisma.chatRunEvent.count({ where: { runId } })).toBe(count);
    } finally {
      unblockProvider();
    }
  });
  it("retries with a new run while preserving the committed message pair", async () => {
    unavailable = true;
    const { runId } = (
      await json(
        await create({ requestId: randomUUID(), message: "کار بک‌اند دورکار" }),
      )
    ).data;
    expect((await consume(runId)).at(-1)).toMatchObject({
      type: "run.failed",
      data: { retryable: true },
    });
    unavailable = false;
    const retried = await create({ requestId: randomUUID(), retryOf: runId });
    expect(retried.status).toBe(202);
    const retriedId = (await json(retried)).data.runId;
    expect(retriedId).not.toBe(runId);
    expect((await consume(retriedId)).at(-1).type).toBe("run.completed");
    const original = await prisma.chatRun.findUniqueOrThrow({
      where: { id: runId },
    });
    expect(original.status).toBe("FAILED");
    expect(
      await prisma.conversationMessage.count({
        where: { conversationId: original.conversationId! },
      }),
    ).toBe(2);
    await prisma.conversation.update({
      where: { id: original.conversationId! },
      data: { version: { increment: 1 } },
    });
    expect(
      (await create({ requestId: randomUUID(), retryOf: runId })).status,
    ).toBe(409);
  });
  it("recovers an interrupted execution as a retryable failure", async () => {
    const conversation = await prisma.conversation.create({
      data: { userId: owner, context: {}, version: 1 },
    });
    const run = await prisma.chatRun.create({
      data: {
        userId: owner,
        conversationId: conversation.id,
        requestId: randomUUID(),
        message: "Backend",
        status: "RUNNING",
        contextVersion: 1,
        startedAt: new Date(Date.now() - 200000),
      },
    });
    expect((await consume(run.id)).at(-1)).toMatchObject({
      type: "run.failed",
      data: { code: "RUN_INTERRUPTED", retryable: true },
    });
  });
});
