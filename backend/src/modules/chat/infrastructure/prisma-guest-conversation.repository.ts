import { Injectable } from "@nestjs/common";
import { Prisma, GuestChatSession } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  ConversationConflict,
  ConversationContext,
  emptyContext,
} from "../domain/conversation";
import {
  GUEST_MESSAGE_LIMIT,
  GuestConversation,
  GuestMessage,
  GuestSessionUnavailable,
} from "../domain/guest-conversation";
import { GuestConversationRepository } from "../application/guest-conversation.repository";

const json = (value: unknown) => value as Prisma.InputJsonValue;
const record = (row: GuestChatSession): GuestConversation => ({
  ...row,
  context: row.context as unknown as ConversationContext,
  messages: row.messages as unknown as GuestMessage[],
});

@Injectable()
export class PrismaGuestConversationRepository extends GuestConversationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  async get(tokenHash: string) {
    const row = await this.prisma.guestChatSession.findUnique({
      where: { tokenHash },
    });
    return row ? record(row) : null;
  }
  async create(tokenHash: string) {
    await this.prisma.guestChatSession.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    const row = await this.prisma.guestChatSession.upsert({
      where: { tokenHash },
      update: {},
      create: {
        tokenHash,
        context: json(emptyContext()),
        messages: [],
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    return record(row);
  }
  async save(previous: GuestConversation, next: GuestConversation) {
    const result = await this.prisma.guestChatSession.updateMany({
      where: {
        tokenHash: previous.tokenHash,
        turns: previous.turns,
        claimedBy: null,
        expiresAt: { gt: new Date() },
        AND: { turns: { lt: GUEST_MESSAGE_LIMIT } },
      },
      data: {
        context: json(next.context),
        messages: json(next.messages),
        turns: { increment: 1 },
      },
    });
    if (result.count !== 1) throw new ConversationConflict();
    return next;
  }
  async claim(tokenHash: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.guestChatSession.findUnique({
        where: { tokenHash },
      });
      if (!session || session.expiresAt <= new Date()) return null;
      if (session.claimedBy) {
        if (session.claimedBy !== userId) throw new GuestSessionUnavailable();
        return session.conversationId;
      }
      if (!session.turns) return null;
      const claimed = await tx.guestChatSession.updateMany({
        where: { tokenHash, claimedBy: null, turns: session.turns },
        data: { claimedBy: userId },
      });
      if (claimed.count !== 1) throw new ConversationConflict();
      const conversation = await tx.conversation.create({
        data: {
          userId,
          context: session.context as Prisma.InputJsonValue,
          version: session.turns,
          messages: {
            create: (session.messages as unknown as GuestMessage[]).map(
              (message) => ({
                role: message.role,
                content: message.content,
                sequence: message.sequence,
                createdAt: new Date(message.createdAt),
              }),
            ),
          },
        },
      });
      await tx.guestChatSession.update({
        where: { tokenHash },
        data: { conversationId: conversation.id },
      });
      return conversation.id;
    });
  }
}
