import { randomUUID } from "crypto";
import { PrismaService } from "../../src/prisma/prisma.service";
import {
  ChatAdmissionService,
  ChatAdmissionError,
} from "../../src/modules/chat-admission/chat-admission.service";
import { ChatRunService } from "../../src/modules/chat-runs/chat-run.service";
import { ChatService } from "../../src/modules/chat/application/chat.service";
import { JobDiscoveryService } from "../../src/modules/job-discovery/application/job-discovery.service";
import { Module, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { JwtStrategy } from "../../src/modules/auth/jwt.strategy";
import { ChatRunController } from "../../src/modules/chat-runs/chat-run.controller";
import { ContextService } from "../../src/modules/chat/domain/context.service";
import { PrismaConversationRepository } from "../../src/modules/chat/infrastructure/prisma-conversation.repository";
import { GuestChatController } from "../../src/modules/chat/presentation/guest-chat.controller";
import { GuestChatService } from "../../src/modules/chat/application/guest-chat.service";
import { PrismaGuestConversationRepository } from "../../src/modules/chat/infrastructure/prisma-guest-conversation.repository";
import { GuestDiscoveryService } from "../../src/modules/chat/application/guest-discovery.service";
import { ChatController } from "../../src/modules/chat/presentation/chat.controller";
import { JobDiscoveryController } from "../../src/modules/job-discovery/presentation/job-discovery.controller";

const suite =
  process.env.CHAT_ADMISSION_DB_TEST === "true" ? describe : describe.skip;
suite("PostgreSQL request admission across independent workers", () => {
  const a = new PrismaService(),
    b = new PrismaService();
  const gates = [new ChatAdmissionService(a), new ChatAdmissionService(b)];
  const prefix = `admission-test:${randomUUID()}`;
  const keys: string[] = [];
  let userId: string;
  const key = () => {
    const value = `${prefix}:${keys.length}`;
    keys.push(value);
    return value;
  };
  beforeAll(async () => {
    await Promise.all([a.$connect(), b.$connect()]);
    userId = (
      await a.user.create({
        data: {
          email: `${randomUUID()}@example.test`,
          password: "test",
          firstName: "Admission",
          lastName: "Fixture",
        },
      })
    ).id;
    keys.push(`user:${userId}`);
  });
  afterAll(async () => {
    await a.$executeRaw`DELETE FROM "chat_request_gates" WHERE "key" = ANY(${keys}::text[])`;
    await a.user.delete({ where: { id: userId } });
    await Promise.all([a.$disconnect(), b.$disconnect()]);
  });
  it("admits exactly one of twelve simultaneous reservations", async () => {
    const identity = key();
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, (_, i) =>
        gates[i % 2].reserve(identity, randomUUID()),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(11);
    expect((await gates[1].availability(identity)).active).toBe(true);
    for (const result of results)
      if (result.status === "rejected")
        expect(result.reason).toBeInstanceOf(ChatAdmissionError);
  });
  it("shares cooldown across workers, keeps identities independent and releases failures", async () => {
    const identity = key(),
      lease = randomUUID();
    await gates[0].reserve(identity, lease);
    await gates[1].release(identity, lease, true);
    const status = await gates[0].availability(identity);
    expect(status.active).toBe(false);
    expect(status.retryAfterSeconds).toBeGreaterThan(0);
    await expect(
      gates[1].reserve(identity, randomUUID()),
    ).rejects.toBeInstanceOf(ChatAdmissionError);
    const independent = key();
    await gates[1].reserve(independent, lease);
    await gates[0].release(independent, lease, false);
    await expect(
      gates[1].reserve(independent, randomUUID()),
    ).resolves.toBeUndefined();
  });
  it("expires crashed leases and fences stale worker release", async () => {
    const identity = key(),
      oldLease = randomUUID(),
      newLease = randomUUID();
    await gates[0].reserve(identity, oldLease);
    await a.$executeRaw`UPDATE "chat_request_gates" SET "leaseUntil" = CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE "key" = ${identity}`;
    await gates[1].reserve(identity, newLease);
    await gates[0].release(identity, oldLease, false);
    expect((await gates[1].availability(identity)).active).toBe(true);
    await expect(
      gates[0].reserve(identity, randomUUID()),
    ).rejects.toBeInstanceOf(ChatAdmissionError);
  });
  it("rolls back a reservation if run insertion cannot commit", async () => {
    const identity = key();
    await expect(
      a.$transaction(async (tx) => {
        await gates[0].reserve(identity, randomUUID(), tx);
        throw new Error("insertion failed");
      }),
    ).rejects.toThrow("insertion failed");
    await expect(
      gates[1].reserve(identity, randomUUID()),
    ).resolves.toBeUndefined();
  });
  it("reuses one authenticated run across conversations and replays its request during a pause", async () => {
    const conversations = await Promise.all(
      [0, 1].map(() =>
        a.conversation.create({ data: { userId, context: {} } }),
      ),
    );
    const chat = {
      get: jest.fn(async () => ({ version: 0 })),
    } as unknown as ChatService;
    const services = [a, b].map(
      (prisma, i) =>
        new ChatRunService(prisma, chat, {} as JobDiscoveryService, gates[i]),
    );
    const executions = services.map((service) =>
      jest.spyOn(service as any, "execute").mockResolvedValue(undefined),
    );
    const requestId = randomUUID();
    const responses = await Promise.all(
      services.map((service, i) =>
        service.create(userId, {
          requestId: i ? randomUUID() : requestId,
          message: i ? "a different request" : "Backend Tehran",
          conversationId: conversations[i].id,
        }),
      ),
    );
    expect(new Set(responses.map((r) => r.runId)).size).toBe(1);
    expect(executions.reduce((n, fn) => n + fn.mock.calls.length, 0)).toBe(1);
    expect(await a.chatRun.count({ where: { userId } })).toBe(1);
    const run = await a.chatRun.findFirstOrThrow({ where: { userId } });
    await a.chatRun.update({
      where: { id: run.id },
      data: { status: "COMPLETED" },
    });
    await gates[0].release(`user:${userId}`, run.id, true);
    const replay = await services[1].create(userId, {
      requestId: run.requestId,
      message: run.message,
    });
    expect(replay.runId).toBe(run.id);
    await expect(
      services[0].create(userId, { requestId: randomUUID(), message: "new" }),
    ).rejects.toBeInstanceOf(ChatAdmissionError);
    expect(await a.chatRun.count({ where: { userId } })).toBe(1);
  });
  it("delivers real HTTP admission, terminal cooldown and guest restoration without provider resubmission", async () => {
    await a.$executeRaw`DELETE FROM "chat_request_gates" WHERE "key" = ${`user:${userId}`}`;
    const secret = "admission-http-test",
      user = await a.user.findUniqueOrThrow({ where: { id: userId } });
    const jwt = new JwtService({ secret });
    const auth = {
      Authorization: `Bearer ${jwt.sign({ sub: userId, email: user.email })}`,
      "Content-Type": "application/json",
    };
    const chat = new ChatService(
      new PrismaConversationRepository(a),
      new ContextService(),
    );
    const calls: string[] = [];
    let release!: () => void;
    let blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const discovery = {
      search: async (
        _user: string,
        _conversation: string,
        live?: {
          publish: (
            type: string,
            data: Record<string, unknown>,
          ) => Promise<void>;
        },
      ) => {
        calls.push("search");
        await live?.publish("search.started", {});
        await live?.publish("source.progress", {
          source: "jobvision.ir",
          stage: "extract",
        });
        await blocked;
        return { jobs: [], sources: [], partial: true };
      },
    } as unknown as JobDiscoveryService;
    const guestDiscovery = {
      search: async (
        _intent: unknown,
        publish: (type: string, data: Record<string, unknown>) => Promise<void>,
      ) => {
        calls.push("guest-search");
        await publish("agent.started", { targetValidJobs: 10 });
        return { jobs: [], sources: [], partial: true };
      },
    } as unknown as GuestDiscoveryService;
    const runs = new ChatRunService(a, chat, discovery, gates[0]);
    const guest = new GuestChatService(
      new PrismaGuestConversationRepository(a),
      new ContextService(),
      guestDiscovery,
    );
    @Module({
      controllers: [
        ChatRunController,
        ChatController,
        JobDiscoveryController,
        GuestChatController,
      ],
      providers: [
        { provide: PrismaService, useValue: a },
        { provide: ConfigService, useValue: { getOrThrow: () => secret } },
        JwtStrategy,
        { provide: ChatRunService, useValue: runs },
        { provide: ChatService, useValue: chat },
        { provide: JobDiscoveryService, useValue: discovery },
        { provide: GuestChatService, useValue: guest },
        { provide: ChatAdmissionService, useValue: gates[0] },
      ],
    })
    class TestModule {}
    const app = await NestFactory.create(TestModule, { logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const post = (
      path: string,
      body: unknown,
      headers: Record<string, string> = auth,
    ) =>
      fetch(base + path, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    try {
      const requestId = randomUUID();
      const first = await post("/api/chat/runs", {
        requestId,
        message: "10 آگهی بک اند در تهران پیدا کن",
      });
      expect(first.status).toBe(202);
      const initial = ((await first.json()) as any).data;
      const duplicate = await post("/api/chat/runs", {
        requestId: randomUUID(),
        message: "another",
      });
      expect(((await duplicate.json()) as any).data).toMatchObject({
        runId: initial.runId,
        reused: true,
      });
      const active = await fetch(base + "/api/chat/availability", {
        headers: auth,
      });
      expect(((await active.json()) as any).data).toMatchObject({
        active: true,
        activeRunId: initial.runId,
      });
      const legacy = await post("/api/chat/message", { message: "legacy" });
      expect(legacy.status).toBe(409);
      expect(((await legacy.json()) as any).error.code).toBe("REQUEST_ACTIVE");
      release();
      const stream = await fetch(
        base + `/api/chat/runs/${initial.runId}/events`,
        { headers: auth },
      );
      const frames = await stream.text();
      expect(frames).toContain("source.progress");
      expect(frames).toContain("run.completed");
      expect(frames).toContain("availability");
      const paused = await post("/api/chat/runs", {
        requestId: randomUUID(),
        message: "repeat",
      });
      expect(paused.status).toBe(429);
      expect(Number(paused.headers.get("retry-after"))).toBeGreaterThan(0);
      expect(((await paused.json()) as any).error).toMatchObject({
        code: "SEARCH_COOLDOWN",
        active: false,
      });
      const replay = await post("/api/chat/runs", {
        requestId,
        message: "10 آگهی بک اند در تهران پیدا کن",
      });
      expect(((await replay.json()) as any).data.runId).toBe(initial.runId);
      const legacySearch = await post("/api/job-discovery/search", {
        conversationId: randomUUID(),
      });
      expect(legacySearch.status).toBe(429);
      expect(calls.filter((c) => c === "search")).toHaveLength(1);
      const guestResponse = await post(
        "/api/chat/guest/message/stream",
        { message: "10 آگهی بک اند در تهران پیدا کن" },
        { "Content-Type": "application/json" },
      );
      const cookie = guestResponse.headers.get("set-cookie")!.split(";")[0];
      const guestFrames = await guestResponse.text();
      expect(guestFrames).toContain("guest.completed");
      expect(guestFrames).toContain("retryAfterSeconds");
      const restored = await fetch(base + "/api/chat/guest", {
        headers: { Cookie: cookie },
      });
      const restoredState = ((await restored.json()) as any).data;
      expect(restoredState.remaining).toBe(4);
      expect(restoredState.availability.retryAfterSeconds).toBeGreaterThan(0);
      const rejectedGuest = await post(
        "/api/chat/guest/message/stream",
        { message: "repeat" },
        { "Content-Type": "application/json", Cookie: cookie },
      );
      expect(rejectedGuest.status).toBe(429);
      expect(calls.filter((c) => c === "guest-search")).toHaveLength(1);
      const tokenHash = (await import("crypto"))
        .createHash("sha256")
        .update(cookie.split("=")[1])
        .digest("hex");
      await a.$executeRaw`DELETE FROM "chat_request_gates" WHERE "key" = ${`guest:${tokenHash}`}`;
      await a.guestChatSession.delete({ where: { tokenHash } });
    } finally {
      release();
      await app.close();
    }
  }, 20000);
});
