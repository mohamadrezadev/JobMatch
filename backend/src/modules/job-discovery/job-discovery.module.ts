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
import { V1mJobPageDecisionProvider } from "./infrastructure/v1m-job-page-decision.provider";
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
          Math.max(1000, Math.min(30000, Number(config.get(key)) || fallback));
        const nineRouterBaseUrl =
          config.get<string>("NINEROUTER_BASE_URL") ?? "http://127.0.0.1:20128";
        const nineRouterApiKey = config.get<string>("NINEROUTER_API_KEY");
        const threshold = (key: string, fallback: number) => {
          const value = Number(config.get(key));
          return Number.isFinite(value) && value >= 0 && value <= 1
            ? value
            : fallback;
        };
        return new NineRouterJobDiscoveryProvider(
          new NineRouterClient({
            baseUrl: nineRouterBaseUrl,
            apiKey: nineRouterApiKey,
            searchModel:
              config.get<string>("NINEROUTER_SEARCH_MODEL")?.trim() ||
              "search-combo",
            fetchModel: config.get("NINEROUTER_FETCH_MODEL"),
            fetchPolicyVerified:
              config.get("NINEROUTER_FETCH_POLICY_VERIFIED") === "true",
            searchTimeout: bounded("JOB_DISCOVERY_SEARCH_TIMEOUT_MS", 20000),
            fetchTimeout: bounded("JOB_DISCOVERY_FETCH_TIMEOUT_MS", 20000),
            // The shared tinyfish account locks out for 19-30s under concurrent
            // load; serializing fetches avoids triggering that lock at all.
            fetchConcurrency: Math.max(
              1,
              Math.min(5, Number(config.get("NINEROUTER_FETCH_CONCURRENCY")) || 1),
            ),
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
                config.get<string>("JOB_DISCOVERY_EXTRACTION_MODEL") ||
                  config.get<string>("OPENAI_MODEL") ||
                  "agents",
                Number(config.get("JOB_DISCOVERY_EXTRACTION_TIMEOUT_MS")) ||
                  8000,
              )
            : undefined,
          config.get<string>("V1M_ENABLED") === "true"
            ? new V1mJobPageDecisionProvider({
                // Shares the 9Router gateway's host and key; V1M is reached
                // through the same verified endpoint, just a different path.
                baseUrl: nineRouterBaseUrl.replace(/\/v1$/, ""),
                apiKey: nineRouterApiKey,
                models: (
                  config.get<string>("V1M_MODELS") ??
                  "openrouter/typesafe/jev-1.13,oc/jev-1.13-free"
                )
                  .split(",")
                  .map((model) => model.trim())
                  .filter(Boolean),
                timeoutMs: bounded("V1M_TIMEOUT_MS", 1500),
                jobThreshold: threshold("V1M_JOB_THRESHOLD", 0.7),
                closedThreshold: threshold("V1M_CLOSED_THRESHOLD", 0.7),
                spamThreshold: threshold("V1M_SPAM_THRESHOLD", 0.7),
                maxContentChars:
                  Number(config.get("V1M_MAX_CONTENT_CHARS")) || 30000,
              })
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
              120000,
              Number(config.get("JOB_DISCOVERY_TOTAL_TIMEOUT_MS")) || 90000,
            ),
          ),
          agent,
        ),
    },
  ],
})
export class JobDiscoveryModule {}
