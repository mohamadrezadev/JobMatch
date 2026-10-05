import { PrismaGuestConversationRepository } from "./prisma-guest-conversation.repository";
import { PrismaService } from "../../../prisma/prisma.service";
import { emptyContext, ConversationConflict } from "../domain/conversation";
import { GuestSessionUnavailable } from "../domain/guest-conversation";

describe("Guest conversation transfer", () => {
  let prisma: any;
  let repository: PrismaGuestConversationRepository;
  const session = () => ({
    tokenHash: "hash",
    turns: 1,
    claimedBy: null,
    conversationId: null,
    expiresAt: new Date(Date.now() + 86400000),
    context: emptyContext(),
    messages: [
      {
        role: "user",
        content: "Backend",
        sequence: 1,
        createdAt: new Date().toISOString(),
      },
      {
        role: "assistant",
        content: "ready",
        sequence: 2,
        createdAt: new Date().toISOString(),
      },
    ],
  });
  beforeEach(() => {
    prisma = {
      guestChatSession: {
        findUnique: jest.fn(async () => session()),
        updateMany: jest.fn(async () => ({ count: 1 })),
        update: jest.fn(),
      },
      conversation: {
        create: jest.fn(async () => ({ id: "owned-conversation" })),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
    repository = new PrismaGuestConversationRepository(prisma as PrismaService);
  });
  it("claims by compare-and-swap and atomically copies transcript, context and version", async () => {
    expect(await repository.claim("hash", "owner")).toBe("owned-conversation");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.guestChatSession.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: "hash", claimedBy: null, turns: 1 },
      data: { claimedBy: "owner" },
    });
    expect(prisma.conversation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "owner",
        version: 1,
        context: emptyContext(),
        messages: {
          create: expect.arrayContaining([
            expect.objectContaining({ content: "Backend", sequence: 1 }),
          ]),
        },
      }),
    });
  });
  it("is idempotent for the owner and rejects a different owner", async () => {
    prisma.guestChatSession.findUnique.mockResolvedValue({
      ...session(),
      claimedBy: "owner",
      conversationId: "owned-conversation",
    });
    expect(await repository.claim("hash", "owner")).toBe("owned-conversation");
    await expect(repository.claim("hash", "other")).rejects.toBeInstanceOf(
      GuestSessionUnavailable,
    );
    expect(prisma.conversation.create).not.toHaveBeenCalled();
  });
  it("rejects a concurrent claim before creating a second conversation", async () => {
    prisma.guestChatSession.updateMany.mockResolvedValue({ count: 0 });
    await expect(repository.claim("hash", "owner")).rejects.toBeInstanceOf(
      ConversationConflict,
    );
    expect(prisma.conversation.create).not.toHaveBeenCalled();
  });
  it("does not import empty or expired sessions", async () => {
    prisma.guestChatSession.findUnique.mockResolvedValue({
      ...session(),
      turns: 0,
    });
    expect(await repository.claim("hash", "owner")).toBeNull();
    prisma.guestChatSession.findUnique.mockResolvedValue({
      ...session(),
      expiresAt: new Date(0),
    });
    expect(await repository.claim("hash", "owner")).toBeNull();
    expect(prisma.conversation.create).not.toHaveBeenCalled();
  });
});
