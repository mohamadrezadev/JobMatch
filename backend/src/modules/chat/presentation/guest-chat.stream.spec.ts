import { INestApplication, Module, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { GuestChatController } from "./guest-chat.controller";
import { GuestChatService } from "../application/guest-chat.service";
import { GuestLimitReached } from "../domain/guest-conversation";
const chat = { send: jest.fn(), get: jest.fn() };
@Module({
  controllers: [GuestChatController],
  providers: [{ provide: GuestChatService, useValue: chat }],
})
class StreamTestModule {}
describe("Guest HTTP progress stream", () => {
  let app: INestApplication, base: string;
  const state = {
    messages: [],
    context: {},
    remaining: 4,
    limit: 5,
    authRequired: false,
  };
  beforeAll(async () => {
    app = await NestFactory.create(StreamTestModule, { logger: false });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    chat.send.mockReset();
  });
  const post = (headers = {}) =>
    fetch(base + "/api/chat/guest/message/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ message: "Backend" }),
    });
  it("sends actual progress before completion and sets a cookie scoped to guest chat", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    chat.send.mockImplementation(async (_hash, _message, publish) => {
      await publish("context.processing", {});
      await gate;
      await publish("source.progress", {
        source: "jobvision.ir",
        stage: "extract",
      });
      return state;
    });
    const response = await post();
    try {
      expect(response.headers.get("content-type")).toContain(
        "text/event-stream",
      );
      expect(response.headers.get("set-cookie")).toContain(
        "Path=/api/chat/guest",
      );
      const reader = response.body!.getReader();
      const first = new TextDecoder().decode((await reader.read()).value);
      expect(first).toContain("context.processing");
      expect(first).not.toContain("guest.completed");
      release();
      let rest = "";
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        rest += new TextDecoder().decode(chunk.value);
      }
      expect(rest).toContain("source.progress");
      expect(rest).toContain("guest.completed");
      expect(chat.send).toHaveBeenCalledTimes(1);
      expect(chat.send.mock.calls[0][0]).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      release();
    }
  });
  it("sends quota failures as safe terminal events after stream headers", async () => {
    chat.send.mockRejectedValue(new GuestLimitReached());
    const response = await post(),
      text = await response.text();
    expect(text).toContain("guest.failed");
    expect(text).toContain("GUEST_LIMIT_REACHED");
    expect(text).not.toContain("guest.completed");
  });
  it("rejects a foreign origin before opening a stream or starting a turn", async () => {
    const response = await post({ Origin: "https://foreign.example" });
    expect(response.status).toBe(403);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(chat.send).not.toHaveBeenCalled();
  });
});
