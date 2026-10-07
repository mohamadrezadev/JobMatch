import { Module, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { PrismaModule } from "../../prisma/prisma.module";
import {
  DiscoveryRepository,
  JobDiscoveryProvider,
} from "./application/discovery.ports";
import { JobDiscoveryService } from "./application/job-discovery.service";
import { INITIAL_SOURCES } from "./domain/discovery";
import { NineRouterClient } from "./infrastructure/nine-router.client";
import { NineRouterJobDiscoveryProvider } from "./infrastructure/nine-router-job-discovery.provider";
import { PrismaDiscoveryRepository } from "./infrastructure/prisma-discovery.repository";
import { SourceValidator } from "./infrastructure/source-validator";
import { JobDiscoveryController } from "./presentation/job-discovery.controller";
import { AgentsJobContentExtractor } from "./infrastructure/agents-job-content.extractor";
import {
  AgentPlannerService,
  AGENT_SOURCES,
} from "./application/agent-planner.service";
import { AgentSearchService } from "./application/agent-search.service";
import { ChatAdmissionModule } from "../chat-admission/chat-admission.module";

@Module({
  exports: [JobDiscoveryService, AgentSearchService],
  imports: [PrismaModule, ChatAdmissionModule],
  controllers: [JobDiscoveryController],
  providers: [
    { provide: DiscoveryRepository, useClass: PrismaDiscoveryRepository },
    {
      provide: JobDiscoveryProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const domains = (
          config.get<string>("JOB_DISCOVERY_ALLOWED_DOMAINS") ??
          INITIAL_SOURCES.join(",")
        )
          .split(",")
          .map((domain) => domain.trim().toLowerCase())
          .filter((domain) => AGENT_SOURCES.includes(domain));
        const bounded = (key: string, fallback: number) =>
          Math.max(1000, Math.min(15000, Number(config.get(key)) || fallback));
        return new NineRouterJobDiscoveryProvider(
          new NineRouterClient({
            baseUrl:
              config.get("NINEROUTER_BASE_URL") ?? "http://127.0.0.1:20128",
            apiKey: config.get("NINEROUTER_API_KEY"),
            searchModel:
              config.get<string>("NINEROUTER_SEARCH_MODEL")?.trim() ||
              "search-combo",
            fetchModel: config.get("NINEROUTER_FETCH_MODEL"),
            fetchPolicyVerified:
              config.get("NINEROUTER_FETCH_POLICY_VERIFIED") === "true",
            searchTimeout: bounded("JOB_DISCOVERY_SEARCH_TIMEOUT_MS", 15000),
            fetchTimeout: bounded("JOB_DISCOVERY_FETCH_TIMEOUT_MS", 15000),
          }),
          new SourceValidator(domains),
          domains,
          config.get<string>("OPENAI_API_KEY")
            ? new AgentsJobContentExtractor(
                new OpenAI({
                  apiKey: config.get<string>("OPENAI_API_KEY"),
                  baseURL: config.get<string>("OPENAI_BASE_URL") || undefined,
                  maxRetries: 0,
                }),
                config.get<string>("OPENAI_MODEL") || "agents",
                Number(config.get("JOB_DISCOVERY_EXTRACTION_TIMEOUT_MS")) ||
                  8000,
              )
            : undefined,
        );
      },
    },
    {
      provide: AgentPlannerService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new AgentPlannerService(
          config.get<string>("OPENAI_API_KEY")
            ? new OpenAI({
                apiKey: config.get<string>("OPENAI_API_KEY"),
                baseURL: config.get<string>("OPENAI_BASE_URL") || undefined,
                maxRetries: 0,
              })
            : undefined,
          config.get<string>("AGENT_PLANNER_MODEL") ||
            config.get<string>("OPENAI_MODEL") ||
            "agents",
        ),
    },
    {
      provide: AgentSearchService,
      inject: [JobDiscoveryProvider, AgentPlannerService, ConfigService],
      useFactory: (
        provider: JobDiscoveryProvider,
        planner: AgentPlannerService,
        config: ConfigService,
      ) =>
        new AgentSearchService(
          provider,
          planner,
          (
            config.get<string>("JOB_DISCOVERY_ALLOWED_DOMAINS") ??
            INITIAL_SOURCES.join(",")
          )
            .split(",")
            .map((source) => source.trim().toLowerCase())
            .filter((source) => AGENT_SOURCES.includes(source)),
          (summary) =>
            new Logger("DiscoveryPerformance").log(JSON.stringify(summary)),
        ),
    },
    {
      provide: JobDiscoveryService,
      inject: [
        DiscoveryRepository,
        JobDiscoveryProvider,
        ConfigService,
        AgentSearchService,
      ],
      useFactory: (
        repository: DiscoveryRepository,
        provider: JobDiscoveryProvider,
        config: ConfigService,
        agent: AgentSearchService,
      ) =>
        new JobDiscoveryService(
          repository,
          provider,
          Math.max(
            1000,
            Math.min(
              60000,
              Number(config.get("JOB_DISCOVERY_TOTAL_TIMEOUT_MS")) || 60000,
            ),
          ),
          agent,
        ),
    },
  ],
})
export class JobDiscoveryModule {}
