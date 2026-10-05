import { GuestChatService } from "./guest-chat.service";
import { GuestConversationRepository } from "./guest-conversation.repository";
import { ContextService } from "../domain/context.service";
import { emptyContext, ConversationConflict } from "../domain/conversation";
import {
  GuestConversation,
  GuestLimitReached,
  GuestSessionUnavailable,
} from "../domain/guest-conversation";

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
      await expect(service.get("opaque")).rejects.toBeInstanceOf(
        GuestSessionUnavailable,
      );
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
});
