import OpenAI from "openai";
import { ChatRun } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ChatRunService } from "./chat-run.service";
import { ChatService } from "../chat/application/chat.service";
import { ModelContextService } from "../chat/infrastructure/model-context.service";
import { emptyContext, ConversationContext } from "../chat/domain/conversation";
import { JobDiscoveryService } from "../job-discovery/application/job-discovery.service";
import { AgentSearchService } from "../job-discovery/application/agent-search.service";
import { AgentPlannerService } from "../job-discovery/application/agent-planner.service";

it.each([false, true])(
  "runs understanding before planning and reports incomplete empty searches accurately (partial=%s)",
  async (partial) => {
    const order: string[] = [];
    const events: Array<{ type: string; data: any }> = [];
    let context: ConversationContext = emptyContext();
    const create = jest.fn(async (input) => {
      if (input.model === "intent-model") {
        order.push("understand");
        expect(JSON.parse(input.messages[1].content).message).toBe(
          "10 تا شغل حسابداری بهم پیشنهاد بده",
        );
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  intent: "JOB_SEARCH",
                  understood: true,
                  context: {
                    ...emptyContext(),
                    searchContext: {
                      targetRoles: ["حسابداری"],
                      requestedCount: 10,
                    },
                  },
                }),
              },
            },
          ],
        };
      }
      order.push("plan");
      const inputGoal = JSON.parse(input.messages[1].content);
      expect(inputGoal.goal).toEqual(context.searchContext);
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                action: "SEARCH_SOURCES",
                sources: inputGoal.remainingSources,
                reasonCode: "INITIAL_SEARCH",
              }),
            },
          },
        ],
      };
    });
    const client = { chat: { completions: { create } } } as unknown as OpenAI;
    const chat = new ChatService(
      {
        list: jest.fn(),
        get: jest.fn(),
        saveTurn: jest.fn(async (input) => {
          order.push("save-goal");
          context = input.context;
          return {
            id: "conversation",
            userId: "owner",
            updatedAt: new Date(),
            version: 1,
            context,
            messages: [
              {
                id: "user-message",
                role: "user",
                content: input.content,
                sequence: 1,
                createdAt: new Date(),
              },
              {
                id: "assistant-message",
                role: "assistant",
                content: input.reply,
                sequence: 2,
                createdAt: new Date(),
              },
            ],
          };
        }),
      },
      new ModelContextService(client, "intent-model"),
    );
    const provider = {
      discover: jest.fn(async (goal) => {
        order.push("search");
        expect(goal).toEqual({ targetRoles: ["حسابداری"], requestedCount: 10 });
        return {
          jobs: [],
          sources: [
            {
              source: "jobinja.ir",
              query: "",
              found: 0,
              accepted: 0,
              rejected: 0,
              ...(partial ? { error: "TIMEOUT", evaluated: 1 } : {}),
            },
          ],
        };
      }),
    };
    const discovery = new JobDiscoveryService(
      {
        context: jest.fn(async () => ({
          intent: context.searchContext,
          version: 1,
        })),
        begin: jest.fn(async () => ({
          id: "discovery",
          status: "RUNNING",
          jobs: [],
          sources: [],
          cached: false,
        })),
        complete: jest.fn(async (_id, candidates, sources, partial) => ({
          runId: "discovery",
          jobs: candidates.map((job, index) => ({
            ...job,
            id: String(index),
            warnings: [],
          })),
          sources,
          partial,
        })),
        latest: jest.fn(),
        fail: jest.fn(),
        saveCandidate: jest.fn(),
        recordCandidate: jest.fn(),
        listCandidates: jest.fn(),
      },
      provider,
      1000,
      new AgentSearchService(
        provider,
        new AgentPlannerService(client, "planner-model"),
        ["jobinja.ir"],
      ),
    );
    let row = {
      id: "run",
      userId: "owner",
      message: "10 تا شغل حسابداری بهم پیشنهاد بده",
      eventSequence: 0,
    } as ChatRun;
    const prisma = {
      chatRun: {
        update: jest.fn(async ({ data }) => {
          row = {
            ...row,
            ...data,
            eventSequence:
              row.eventSequence + (data.eventSequence?.increment ?? 0),
          };
          return row;
        }),
      },
      chatRunEvent: {
        create: jest.fn(async ({ data }) => {
          events.push(data);
          return data;
        }),
      },
      analyticsEvent: { create: jest.fn() },
      conversationMessage: { update: jest.fn() },
      $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
        operation(prisma),
    };
    const runs = new ChatRunService(
      prisma as unknown as PrismaService,
      chat,
      discovery,
    );
    await runs["execute"](row);
    expect(order).toEqual([
      "understand",
      "save-goal",
      "search",
      "search",
      "search",
      "search",
      "search",
      "search",
      "search",
    ]);
    expect(provider.discover).toHaveBeenCalledTimes(7);
    expect(row.status).toBe(partial ? "PARTIAL" : "COMPLETED");
    expect(prisma.conversationMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: expect.stringContaining(
            partial ? "هنوز آگهی منطبق" : "آگهی معتبری با شرایط فعلی پیدا نشد",
          ),
        }),
      }),
    );
    const goalEvent = events.find((event) => event.type === "context.updated")!;
    expect(goalEvent.data.understandingMode).toBe("model");
    expect(
      events.find((event) => event.type === "agent.started")!.data
        .targetValidJobs,
    ).toBe(10);
    expect(
      events.findIndex((event) => event.type === "context.updated"),
    ).toBeLessThan(
      events.findIndex((event) => event.type === "agent.planning"),
    );
  },
);
