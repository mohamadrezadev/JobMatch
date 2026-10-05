import { Module, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { INestApplication } from "@nestjs/common";
import { randomUUID } from "crypto";
import { AddressInfo } from "net";
import { ChatController } from "../../src/modules/chat/presentation/chat.controller";
import { ChatService } from "../../src/modules/chat/application/chat.service";
import { ContextService } from "../../src/modules/chat/domain/context.service";
import {
  ConversationRecord,
  ConversationNotFound,
  ConversationConflict,
} from "../../src/modules/chat/domain/conversation";
import { ConversationRepository } from "../../src/modules/chat/application/conversation.repository";
import { PrismaService } from "../../src/prisma/prisma.service";
import { JwtStrategy } from "../../src/modules/auth/jwt.strategy";
import { JwtAuthGuard } from "../../src/common/guards/jwt-auth.guard";
import { GuestChatController } from "../../src/modules/chat/presentation/guest-chat.controller";
import { GuestChatService } from "../../src/modules/chat/application/guest-chat.service";
import { GuestConversationRepository } from "../../src/modules/chat/application/guest-conversation.repository";
import {
  GuestConversation,
  GuestSessionUnavailable,
} from "../../src/modules/chat/domain/guest-conversation";
import { emptyContext } from "../../src/modules/chat/domain/conversation";

const guests = new Map<string, GuestConversation>();
const guestRepository: GuestConversationRepository = {
  get: async (key) => guests.get(key) ?? null,
  create: async (key) => {
    const session: GuestConversation = {
      tokenHash: key,
      context: emptyContext(),
      messages: [],
      turns: 0,
      claimedBy: null,
      conversationId: null,
      expiresAt: new Date(Date.now() + 86400000),
    };
    guests.set(key, session);
    return session;
  },
  save: async (previous, next) => {
    if (guests.get(previous.tokenHash)?.turns !== previous.turns)
      throw new ConversationConflict();
    guests.set(previous.tokenHash, next);
    return next;
  },
  claim: async (key, userId) => {
    const session = guests.get(key);
    if (!session) return null;
    if (session.claimedBy) {
      if (session.claimedBy !== userId) throw new GuestSessionUnavailable();
      return session.conversationId;
    }
    const id = randomUUID();
    records.set(id, {
      id,
      userId,
      context: session.context,
      version: session.turns,
      updatedAt: new Date(),
      messages: session.messages.map((message) => ({
        ...message,
        createdAt: new Date(message.createdAt),
      })),
    });
    session.claimedBy = userId;
    session.conversationId = id;
    return id;
  },
};

const records = new Map<string, ConversationRecord>();
const repository: ConversationRepository = {
  list: async (userId) =>
    [...records.values()].filter((c) => c.userId === userId),
  get: async (userId, id) => {
    const row = records.get(id);
    if (!row || row.userId !== userId) throw new ConversationNotFound();
    return row;
  },
  saveTurn: async (input) => {
    if (
      input.previous &&
      records.get(input.previous.id)?.version !== input.previous.version
    )
      throw new ConversationConflict();
    const version = (input.previous?.version ?? 0) + 1;
    const row: ConversationRecord = {
      id: input.previous?.id ?? randomUUID(),
      userId: input.userId,
      context: input.context,
      version,
      updatedAt: new Date(),
      messages: [
        ...(input.previous?.messages ?? []),
        {
          id: randomUUID(),
          content: input.content,
          role: "user",
          sequence: version * 2 - 1,
          createdAt: new Date(),
        },
        {
          id: randomUUID(),
          content: input.reply,
          role: "assistant",
          sequence: version * 2,
          createdAt: new Date(),
        },
      ],
    };
    records.set(row.id, row);
    return row;
  },
};
const testSecret = "public-test-fixture-not-a-production-secret";
@Module({
  controllers: [ChatController, GuestChatController],
  providers: [
    {
      provide: GuestChatService,
      useValue: new GuestChatService(guestRepository, new ContextService()),
    },
    {
      provide: ChatService,
      useValue: new ChatService(repository, new ContextService()),
    },
    { provide: ConfigService, useValue: { getOrThrow: () => testSecret } },
    {
      provide: PrismaService,
      useValue: {
        user: {
          findUnique: async ({ where }: { where: { id: string } }) =>
            ["owner", "other"].includes(where.id)
              ? { id: where.id, email: where.id + "@example.test" }
              : null,
        },
      },
    },
    JwtStrategy,
    JwtAuthGuard,
  ],
})
class HttpTestModule {}

describe("Chat HTTP contract with actual JWT guard", () => {
  let app: INestApplication;
  let base: string;
  const jwt = new JwtService({ secret: testSecret });
  const token = (sub = "owner") =>
    jwt.sign({ sub, email: sub + "@example.test" }, { expiresIn: "1h" });
  const send = (body: unknown, bearer = token()) =>
    fetch(base + "/api/chat/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + bearer,
      },
      body: JSON.stringify(body),
    });
  beforeAll(async () => {
    app = await NestFactory.create(HttpTestModule, { logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0, "127.0.0.1");
    base =
      "http://127.0.0.1:" + (app.getHttpServer().address() as AddressInfo).port;
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    records.clear();
    guests.clear();
  });
  it("rejects unauthenticated requests in the error envelope", async () => {
    const response = await fetch(base + "/api/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Backend" }),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(records.size).toBe(0);
  });
  it("validates guest input and foreign origins without writes", async () => {
    for (const body of [
      { message: " " },
      { message: "a".repeat(4001) },
      { message: "Backend", conversationId: randomUUID() },
    ]) {
      const response = await fetch(base + "/api/chat/guest/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
    }
    const foreign = await fetch(base + "/api/chat/guest/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://foreign.example",
      },
      body: JSON.stringify({ message: "Backend" }),
    });
    expect(foreign.status).toBe(403);
    expect(guests.size).toBe(0);
  });
  it("enforces guest quota across restores and transfers history behind the actual JWT guard", async () => {
    let cookie = "";
    for (let i = 0; i < 5; i++) {
      const response = await fetch(base + "/api/chat/guest/message", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ message: i === 0 ? "Backend" : "فقط دورکار" }),
      });
      expect(response.status).toBe(200);
      cookie = response.headers.get("set-cookie")!.split(";")[0];
      expect(response.headers.get("set-cookie")).toContain("HttpOnly");
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    const restored = await fetch(base + "/api/chat/guest", {
      headers: { Cookie: cookie },
    });
    expect(await restored.json()).toMatchObject({
      data: {
        remaining: 0,
        authRequired: true,
        context: {
          searchContext: {
            targetRoles: ["Backend Developer"],
            workTypes: ["Remote"],
          },
        },
      },
    });
    const blocked = await fetch(base + "/api/chat/guest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ message: "React" }),
    });
    expect(blocked.status).toBe(403);
    expect(await blocked.json()).toMatchObject({
      error: { code: "GUEST_LIMIT_REACHED" },
    });
    expect(
      (
        await fetch(base + "/api/chat/guest/claim", {
          method: "POST",
          headers: { Cookie: cookie },
        })
      ).status,
    ).toBe(401);
    const claim = await fetch(base + "/api/chat/guest/claim", {
      method: "POST",
      headers: { Cookie: cookie, Authorization: "Bearer " + token() },
    });
    expect(claim.status).toBe(200);
    const id = ((await claim.json()) as { data: { conversationId: string } })
      .data.conversationId;
    expect(records.get(id)?.messages).toHaveLength(10);
    const continued = await send({
      conversationId: id,
      message: "حداقل ۲۰ میلیون",
    });
    expect(continued.status).toBe(200);
    expect(records.get(id)?.messages).toHaveLength(12);
    expect(
      (
        await fetch(base + "/api/chat/guest/claim", {
          method: "POST",
          headers: {
            Cookie: cookie,
            Authorization: "Bearer " + token("other"),
          },
        })
      ).status,
    ).toBe(403);
  });
  it("rejects expired and nonexistent-user access tokens", async () => {
    expect(
      (
        await send(
          { message: "Backend" },
          jwt.sign(
            { sub: "owner", email: "owner@example.test" },
            { expiresIn: -1 },
          ),
        )
      ).status,
    ).toBe(401);
    expect((await send({ message: "Backend" }, token("deleted"))).status).toBe(
      401,
    );
  });
  it("rejects blank messages and invalid IDs without writes", async () => {
    expect((await send({ message: "   " })).status).toBe(400);
    expect(
      (await send({ message: "Backend", conversationId: "invalid" })).status,
    ).toBe(400);
    expect((await send({ message: "Backend", unexpected: true })).status).toBe(
      400,
    );
    expect(records.size).toBe(0);
  });
  it("creates, updates and restores a persisted conversation without a profile", async () => {
    const first = await send({ message: "کار بک‌اند می‌خوام" });
    expect(first.status).toBe(200);
    const body = (await first.json()) as { data: { conversationId: string } };
    expect(body).toMatchObject({
      success: true,
      data: {
        readyForSearch: true,
        intent: "JOB_SEARCH",
        searchContext: { targetRoles: ["Backend Developer"] },
      },
    });
    const id = body.data.conversationId;
    const second = await send({ conversationId: id, message: "فقط دورکار" });
    expect(await second.json()).toMatchObject({
      data: {
        intent: "UPDATE_SEARCH",
        searchContext: {
          targetRoles: ["Backend Developer"],
          workTypes: ["Remote"],
        },
      },
    });
    const history = await fetch(base + "/api/chat/conversations/" + id, {
      headers: { Authorization: "Bearer " + token() },
    });
    expect(
      ((await history.json()) as { data: { messages: unknown[] } }).data
        .messages,
    ).toHaveLength(4);
  });
  it("returns 404 for foreign reads and writes", async () => {
    const first = await send({ message: "Backend" });
    const id = ((await first.json()) as { data: { conversationId: string } })
      .data.conversationId;
    expect(
      (await send({ conversationId: id, message: "React" }, token("other")))
        .status,
    ).toBe(404);
    const read = await fetch(base + "/api/chat/conversations/" + id, {
      headers: { Authorization: "Bearer " + token("other") },
    });
    expect(read.status).toBe(404);
    const list = await fetch(base + "/api/chat/conversations", {
      headers: { Authorization: "Bearer " + token("other") },
    });
    expect(((await list.json()) as { data: unknown[] }).data).toEqual([]);
    expect(records.get(id)?.messages).toHaveLength(2);
  });
  it('bounds repeated guest requests with a rate-limit error', async () => {
    let limited = false;
    for (let i = 0; i < 21; i++) {
      const response = await fetch(base + '/api/chat/guest/message', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Backend' }),
      });
      if (response.status === 429) {
        limited = true;
        expect(await response.json()).toMatchObject({ error: { code: 'RATE_LIMITED' } });
      }
    }
    expect(limited).toBe(true);
  });
});
