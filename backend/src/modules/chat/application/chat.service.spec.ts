import { ChatService } from "./chat.service";
import { ContextService } from "../domain/context.service";
import { ConversationRepository } from "./conversation.repository";
import {
  ConversationConflict,
  ConversationNotFound,
  ConversationRecord,
  emptyContext,
} from "../domain/conversation";

describe("Chat application", () => {
  const previous: ConversationRecord = {
    id: "conversation",
    userId: "owner",
    version: 1,
    updatedAt: new Date(),
    context: emptyContext(),
    messages: [],
  };
  let repository: jest.Mocked<ConversationRepository>;
  let service: ChatService;
  beforeEach(() => {
    repository = { list: jest.fn(), get: jest.fn(), saveTurn: jest.fn() };
    repository.saveTurn.mockResolvedValue(previous);
    service = new ChatService(repository, new ContextService());
  });
  it("starts from empty context and persists a message pair with role-only readiness", async () => {
    const result = await service.send("owner", "Backend");
    expect(repository.get).not.toHaveBeenCalled();
    expect(result.readyForSearch).toBe(true);
    expect(result.message).not.toContain("جستجو می‌کنم");
    expect(repository.saveTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "owner",
        content: "Backend",
        intent: "JOB_SEARCH",
      }),
    );
  });
  it("asks only for a missing role", async () => {
    const result = await service.send("owner", "دورکار");
    expect(result.readyForSearch).toBe(false);
    expect(result.message).toContain("نقش");
  });
  it("makes the reported .NET request ready for automatic frontend discovery", async () => {
    const result = await service.send(
      "owner",
      "یه کار بکند دات نت با حقوق 60 تومن حضوری تهران",
    );
    expect(result.readyForSearch).toBe(true);
    expect(result.intent).toBe("JOB_SEARCH");
    expect(result.searchContext.minimumSalary).toBe(60000000);
  });
  it("does not write when ownership lookup fails", async () => {
    repository.get.mockRejectedValue(new ConversationNotFound());
    await expect(
      service.send("other", "Backend", "conversation"),
    ).rejects.toBeInstanceOf(ConversationNotFound);
    expect(repository.get).toHaveBeenCalledWith("other", "conversation");
    expect(repository.saveTurn).not.toHaveBeenCalled();
  });
  it("propagates a stale-write conflict", async () => {
    repository.get.mockResolvedValue(previous);
    repository.saveTurn.mockRejectedValue(new ConversationConflict());
    await expect(
      service.send("owner", "Remote", "conversation"),
    ).rejects.toBeInstanceOf(ConversationConflict);
  });
  it("does not claim resume execution", async () => {
    expect((await service.send("owner", "رزومه بساز")).message).toContain(
      "تولید نمی‌شود",
    );
  });
});
