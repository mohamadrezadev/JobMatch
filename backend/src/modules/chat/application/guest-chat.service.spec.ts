import { GuestChatService } from "./guest-chat.service";
import { GuestConversationRepository } from "./guest-conversation.repository";
import { ContextService } from "../domain/context.service";
import { emptyContext, ConversationConflict } from "../domain/conversation";
import {
  GuestConversation,
  GuestLimitReached,
  GuestSessionUnavailable,
} from "../domain/guest-conversation";
import { GuestDiscoveryService } from "./guest-discovery.service";

describe("Guest chat allowance", () => {
  let repository: jest.Mocked<GuestConversationRepository>;
  let service: GuestChatService;
  let session: GuestConversation;
  beforeEach(() => {
    session = {
      tokenHash: "opaque",
      context: emptyContext(),
      messages: [],
      turns: 0,
      expiresAt: new Date(Date.now() + 86400000),
      claimedBy: null,
      conversationId: null,
    };
    repository = {
      get: jest.fn(
        async (_key: string): Promise<GuestConversation | null> => session,
      ),
      create: jest.fn(async (_key: string) => session),
      save: jest.fn(async (_previous, next) => {
        session = next;
        return next;
      }),
      claim: jest.fn(),
    };
    service = new GuestChatService(repository, new ContextService());
  });
  it("restores an empty allowance without creating a session", async () => {
    expect(await service.get()).toMatchObject({
      remaining: 5,
      messages: [],
      authRequired: false,
    });
    expect(repository.create).not.toHaveBeenCalled();
  });
  it("accepts five turns, retains context and rejects the sixth without writing", async () => {
    await service.send("opaque", "Backend");
    await service.send("opaque", "فقط دورکار");
    await service.send("opaque", "حداقل ۲۰ میلیون");
    await service.send("opaque", "Python بلد نیستم");
    const result = await service.send("opaque", "React بلدم");
    expect(result).toMatchObject({
      remaining: 0,
      authRequired: true,
      context: {
        searchContext: {
          targetRoles: ["Backend Developer"],
          workTypes: ["Remote"],
          minimumSalary: 20000000,
        },
        candidateFacts: { deniedSkills: ["Python"] },
      },
    });
    expect(result.messages).toHaveLength(10);
    await expect(service.send("opaque", "more")).rejects.toBeInstanceOf(
      GuestLimitReached,
    );
    expect(repository.save).toHaveBeenCalledTimes(5);
    expect(await service.get("opaque")).toMatchObject({ remaining: 0 });
  });
  it.each(["expired", "claimed"])(
    "does not read or mutate a %s session",
    async (state) => {
      if (state === "expired") session.expiresAt = new Date(0);
      else session.claimedBy = "owner";
      expect(await service.get("opaque")).toMatchObject({
        remaining: 5,
        messages: [],
        authRequired: false,
      });
      await expect(service.send("opaque", "Backend")).rejects.toBeInstanceOf(
        GuestSessionUnavailable,
      );
      expect(repository.save).not.toHaveBeenCalled();
    },
  );
  it("does not consume allowance on a failed concurrent write", async () => {
    repository.save.mockRejectedValue(new ConversationConflict());
    await expect(service.send("opaque", "Backend")).rejects.toBeInstanceOf(
      ConversationConflict,
    );
    expect(session.turns).toBe(0);
  });
  it("searches after the user's second message supplies the role and preserves the first message's constraints", async () => {
    const discovery = {
      search: jest.fn(async () => ({ jobs: [], sources: [], partial: false })),
    };
    service = new GuestChatService(
      repository,
      new ContextService(),
      discovery as unknown as GuestDiscoveryService,
    );
    const first = await service.send(
      "opaque",
      "فقط حضوری، حداقل حقوق ۳۰ میلیون",
    );
    expect(first.messages.at(-1)?.content).toContain("عنوان شغلی");
    expect(discovery.search).not.toHaveBeenCalled();
    const second = await service.send("opaque", "حسابدار");
    expect(discovery.search).toHaveBeenCalledTimes(1);
    expect(discovery.search).toHaveBeenCalledWith(
      expect.objectContaining({
        targetRoles: ["حسابدار"],
        workTypes: ["OnSite"],
        minimumSalary: 30000000,
        currency: "TOMAN",
      }),
    );
    expect(second.messages.at(-1)?.content).toContain("پیدا نشد");
    expect(second.messages.at(-1)?.content).not.toContain("آماده است");
    expect(second.remaining).toBe(3);
    expect(second.discovery).toEqual({ jobs: [], sources: [], partial: false });
    expect((await service.get("opaque")).discovery).toEqual(second.discovery);
  });
  it("reports actual jobs and keeps results available after refresh", async () => {
    const results = {
      jobs: [{ title: "حسابدار", sourceUrl: "https://jobinja.ir/jobs/1" }],
      sources: [],
      partial: true,
    };
    const discovery = { search: jest.fn(async () => results) };
    service = new GuestChatService(
      repository,
      new ContextService(),
      discovery as unknown as GuestDiscoveryService,
    );
    const response = await service.send("opaque", "حسابدار");
    expect(response.messages.at(-1)?.content).toContain(
      "۱ موقعیت مرتبط پیدا شد",
    );
    expect(response.messages.at(-1)?.content).toContain("بعضی منابع");
    expect((await service.get("opaque")).discovery).toEqual(results);
  });
  it("retries the same search without replacing the role or conditions", async () => {
    const discovery = {
      search: jest.fn(async () => ({
        jobs: [],
        sources: [],
        partial: true,
        error: "JOB_DISCOVERY_UNAVAILABLE",
      })),
    };
    service = new GuestChatService(
      repository,
      new ContextService(),
      discovery as unknown as GuestDiscoveryService,
    );
    await service.send("opaque", "فقط حضوری، حداقل حقوق ۳۰ میلیون");
    const failed = await service.send("opaque", "حسابدار");
    expect(failed.messages.at(-1)?.content).toContain(
      "پاسخ قابل استفاده ندادند",
    );
    await service.send("opaque", "دوباره جستجو کن");
    expect(discovery.search).toHaveBeenCalledTimes(2);
    expect(discovery.search.mock.calls[1]).toEqual(
      discovery.search.mock.calls[0],
    );
  });
  it("blocks duplicate messages while a guest search is running", async () => {
    let release!: () => void;
    const discovery = {
      search: jest.fn(
        () =>
          new Promise((resolve) => {
            release = () => resolve({ jobs: [], sources: [], partial: false });
          }),
      ),
    };
    service = new GuestChatService(
      repository,
      new ContextService(),
      discovery as unknown as GuestDiscoveryService,
    );
    const pending = service.send("opaque", "حسابدار");
    await new Promise((resolve) => setImmediate(resolve));
    await expect(service.send("opaque", "حسابدار")).rejects.toBeInstanceOf(
      ConversationConflict,
    );
    expect(discovery.search).toHaveBeenCalledTimes(1);
    release();
    await pending;
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
});
