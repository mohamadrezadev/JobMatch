import { PrismaConversationRepository } from "./prisma-conversation.repository";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  ConversationConflict,
  ConversationNotFound,
  ConversationRecord,
  emptyContext,
} from "../domain/conversation";

describe("Owned conversation repository", () => {
  const previous: ConversationRecord = {
    id: "c",
    userId: "u",
    version: 2,
    context: emptyContext(),
    updatedAt: new Date(),
    messages: [],
  };
  const tx = {
    conversation: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    conversationMessage: { createMany: jest.fn() },
  };
  const db = {
    conversation: { findFirst: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  let repository: PrismaConversationRepository;
  beforeEach(() => {
    jest.clearAllMocks();
    db.$transaction.mockImplementation((callback) => callback(tx));
    tx.conversation.findUniqueOrThrow.mockResolvedValue(previous);
    repository = new PrismaConversationRepository(
      db as unknown as PrismaService,
    );
  });
  it("scopes reads to ownership and orders history", async () => {
    db.conversation.findFirst.mockResolvedValue(previous);
    await repository.get("u", "c");
    expect(db.conversation.findFirst).toHaveBeenCalledWith({
      where: { id: "c", userId: "u" },
      include: { messages: { orderBy: { sequence: "asc" } } },
    });
  });
  it("does not disclose absent/foreign IDs", async () => {
    db.conversation.findFirst.mockResolvedValue(null);
    await expect(repository.get("u", "c")).rejects.toBeInstanceOf(
      ConversationNotFound,
    );
  });
  it("scopes summary lists", async () => {
    await repository.list("u");
    expect(db.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u" }, take: 50 }),
    );
  });
  it("compares owner and version before inserting ordered message pairs", async () => {
    tx.conversation.updateMany.mockResolvedValue({ count: 1 });
    await repository.saveTurn({
      userId: "u",
      previous,
      context: emptyContext(),
      content: "Backend",
      reply: "ready",
      intent: "JOB_SEARCH",
    });
    expect(tx.conversation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c", userId: "u", version: 2 } }),
    );
    expect(tx.conversationMessage.createMany).toHaveBeenCalledWith({
      data: [
        { conversationId: "c", role: "user", content: "Backend", sequence: 5 },
        {
          conversationId: "c",
          role: "assistant",
          content: "ready",
          sequence: 6,
          metadata: { intent: "JOB_SEARCH" },
        },
      ],
    });
  });
  it("avoids partial message inserts when a stale version loses", async () => {
    tx.conversation.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      repository.saveTurn({
        userId: "u",
        previous,
        context: emptyContext(),
        content: "x",
        reply: "y",
        intent: "UPDATE_SEARCH",
      }),
    ).rejects.toBeInstanceOf(ConversationConflict);
    expect(tx.conversationMessage.createMany).not.toHaveBeenCalled();
  });
  it("creates a conversation in the same transaction as its messages", async () => {
    tx.conversation.create.mockResolvedValue({ id: "new", version: 1 });
    await repository.saveTurn({
      userId: "u",
      context: emptyContext(),
      content: "x",
      reply: "y",
      intent: "JOB_SEARCH",
    });
    expect(tx.conversation.create).toHaveBeenCalledWith({
      data: { userId: "u", context: emptyContext(), version: 1 },
    });
    expect(
      tx.conversationMessage.createMany.mock.calls[0][0].data.map(
        (m: { sequence: number }) => m.sequence,
      ),
    ).toEqual([1, 2]);
  });
});
