import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { ModelContextService } from "./infrastructure/model-context.service";
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
import { JobDiscoveryModule } from "../job-discovery/job-discovery.module";
import { AgentSearchService } from "../job-discovery/application/agent-search.service";
import { GuestDiscoveryService } from "./application/guest-discovery.service";

@Module({
  exports: [ChatService],
  imports: [PrismaModule, JobDiscoveryModule],
  controllers: [ChatController, GuestChatController],
  providers: [
    {
      provide: GuestDiscoveryService,
      inject: [AgentSearchService],
      useFactory: (agent: AgentSearchService) =>
        new GuestDiscoveryService(agent),
    },
    {
      provide: ContextService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new ModelContextService(
          config.get<string>("OPENAI_API_KEY")
            ? new OpenAI({
                apiKey: config.get<string>("OPENAI_API_KEY"),
                baseURL: config.get<string>("OPENAI_BASE_URL") || undefined,
                maxRetries: 0,
              })
            : undefined,
          config.get<string>("AGENT_INTENT_MODEL") ||
            config.get<string>("OPENAI_MODEL") ||
            "agents",
        ),
    },
    {
      provide: GuestConversationRepository,
      useClass: PrismaGuestConversationRepository,
    },
    {
      provide: GuestChatService,
      useFactory: (
        repository: GuestConversationRepository,
        context: ContextService,
        discovery: GuestDiscoveryService,
      ) => new GuestChatService(repository, context, discovery),
      inject: [
        GuestConversationRepository,
        ContextService,
        GuestDiscoveryService,
      ],
    },
    { provide: ConversationRepository, useClass: PrismaConversationRepository },
    {
      provide: ChatService,
      useFactory: (
        repository: ConversationRepository,
        context: ContextService,
      ) => new ChatService(repository, context),
      inject: [ConversationRepository, ContextService],
    },
  ],
})
export class ChatModule {}
