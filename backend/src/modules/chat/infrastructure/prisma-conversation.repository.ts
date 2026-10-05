import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { ConversationRepository } from "../application/conversation.repository";
import {
  ConversationConflict,
  ConversationContext,
  ConversationNotFound,
  ConversationRecord,
} from "../domain/conversation";

@Injectable()
export class PrismaConversationRepository extends ConversationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  list(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
  }
  async get(userId: string, id: string): Promise<ConversationRecord> {
    const row = await this.prisma.conversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { sequence: "asc" } } },
    });
    if (!row) throw new ConversationNotFound();
    return { ...row, context: row.context as unknown as ConversationContext };
  }
  async saveTurn(
    input: Parameters<ConversationRepository["saveTurn"]>[0],
  ): Promise<ConversationRecord> {
    return this.prisma.$transaction(async (tx) => {
      const context = input.context as unknown as Prisma.InputJsonValue;
      let id: string;
      let version: number;
      if (input.previous) {
        const update = await tx.conversation.updateMany({
          where: {
            id: input.previous.id,
            userId: input.userId,
            version: input.previous.version,
          },
          data: { context, version: { increment: 1 } },
        });
        if (update.count !== 1) throw new ConversationConflict();
        id = input.previous.id;
        version = input.previous.version + 1;
      } else {
        const created = await tx.conversation.create({
          data: { userId: input.userId, context, version: 1 },
        });
        id = created.id;
        version = 1;
      }
      await tx.conversationMessage.createMany({
        data: [
          {
            conversationId: id,
            role: "user",
            content: input.content,
            sequence: version * 2 - 1,
          },
          {
            conversationId: id,
            role: "assistant",
            content: input.reply,
            sequence: version * 2,
            metadata: { intent: input.intent },
          },
        ],
      });
      const row = await tx.conversation.findUniqueOrThrow({
        where: { id },
        include: { messages: { orderBy: { sequence: "asc" } } },
      });
      return { ...row, context: row.context as unknown as ConversationContext };
    });
  }
}
