import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ContextService } from "./domain/context.service";
import { ChatService } from "./application/chat.service";
import { ConversationRepository } from "./application/conversation.repository";
import { PrismaConversationRepository } from "./infrastructure/prisma-conversation.repository";
import { ChatController } from "./presentation/chat.controller";
import { GuestChatController } from "./presentation/guest-chat.controller";
import { GuestChatService } from "./application/guest-chat.service";
import { GuestConversationRepository } from "./application/guest-conversation.repository";
import { PrismaGuestConversationRepository } from "./infrastructure/prisma-guest-conversation.repository";

@Module({
  imports: [PrismaModule],
  controllers: [ChatController, GuestChatController],
  providers: [
    {
      provide: GuestConversationRepository,
      useClass: PrismaGuestConversationRepository,
    },
    {
      provide: GuestChatService,
      useFactory: (repository: GuestConversationRepository) =>
        new GuestChatService(repository, new ContextService()),
      inject: [GuestConversationRepository],
    },
    { provide: ConversationRepository, useClass: PrismaConversationRepository },
    {
      provide: ChatService,
      useFactory: (repository: ConversationRepository) =>
        new ChatService(repository, new ContextService()),
      inject: [ConversationRepository],
    },
  ],
})
export class ChatModule {}
