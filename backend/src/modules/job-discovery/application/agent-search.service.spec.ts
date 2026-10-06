import { AgentSearchService } from "./agent-search.service";
import { AgentPlannerService, AGENT_SOURCES } from "./agent-planner.service";
import { DiscoveryRepository, JobDiscoveryProvider } from "./discovery.ports";
import {
  DiscoveredJob,
  SourceReport,
  DiscoveryError,
} from "../domain/discovery";
import { JobDiscoveryService } from "./job-discovery.service";

const goal = { targetRoles: ["Backend Developer"], minimumSalary: 60000000 };
const job = (
  id: number,
  source = "jobinja.ir",
  confirmed = true,
): DiscoveredJob => ({
  title: "Backend Developer",
  company: `Company ${id}`,
  source,
  sourceUrl: `https://${source}/jobs/${id}`,
  location: null,
  workType: "Remote",
  experienceLevel: null,
  salaryMin: confirmed ? 60000000 : null,
  salaryMax: null,
  currency: "TOMAN",
  salaryPeriod: "MONTHLY",
  description: "PRIVATE_PAGE_TEXT",
  requiredSkills: [],
  preferredSkills: [],
  publishedAt: null,
});
const report = (source: string): SourceReport => ({
  source,
  query: "PRIVATE_QUERY",
  found: 0,
  accepted: 0,
  rejected: 0,
});
const signal = () => new AbortController().signal;
let discover: jest.Mock, provider: JobDiscoveryProvider, publish: jest.Mock;
beforeEach(() => {
  discover = jest.fn(async (_goal, _signal, _progress, options) => ({
    jobs: [],
    sources: options.sources.map(report),
  }));
  provider = { discover };
  publish = jest.fn(async () => undefined);
});
it("searches HR equivalents separately and stops after enough confirmed jobs", async () => {
  const intent = {
    targetRoles: ["کارشناس منابع انسانی"],
    requestedCount: 1,
    minimumSalary: 60000000,
    workTypes: ["Remote" as const],
    requiredSkills: ["Excel"],
    excludedCompanies: ["Excluded"],
  };
  const snapshot = JSON.stringify(intent);
  const hr = { ...job(1), title: "HR Specialist", requiredSkills: ["Excel"] };
  discover.mockImplementation(async (_goal, _signal, _progress, options) => ({
    jobs: options.queryTitles.includes("HR Specialist")
      ? [
          hr,
          hr,
          { ...hr, company: "Excluded" },
          { ...hr, workType: "OnSite" },
          { ...hr, salaryMin: 1 },
          { ...hr, requiredSkills: [] },
          { ...hr, title: "HR Manager" },
        ]
      : [],
    sources: options.sources.map(report),
  }));
  const result = await new AgentSearchService(
    provider,
    new AgentPlannerService(),
  ).search(intent, signal(), undefined, publish);
  expect(result.jobs).toEqual([hr]);
  expect(discover.mock.calls.map((call) => call[3].queryTitles)).toEqual([
    ["کارشناس منابع انسانی"],
    ["HR Specialist"],
  ]);
  for (const call of discover.mock.calls) expect(call[0]).toEqual(intent);
  expect(JSON.stringify(intent)).toBe(snapshot);
  expect(publish).toHaveBeenCalledWith(
    "agent.completed",
    expect.objectContaining({ reasonCode: "ENOUGH_RESULTS" }),
  );
});
it("does not retry unknown occupations or search exhausted source page budgets", async () => {
  await new AgentSearchService(provider, new AgentPlannerService()).search(
    { targetRoles: ["Medical Device Technician"] },
    signal(),
  );
  expect(discover).toHaveBeenCalledTimes(1);
  discover.mockClear();
  discover.mockImplementation(async (_goal, _signal, _progress, options) => {
    for (const source of options.sources)
      options.budgets.get(source).remainingFetches = 0;
    return { jobs: [], sources: options.sources.map(report) };
  });
  await new AgentSearchService(provider, new AgentPlannerService()).search(
    goal,
    signal(),
  );
  expect(discover).toHaveBeenCalledTimes(1);
});
it("shares budgets and caps the total at four rounds and sixteen source searches", async () => {
  await new AgentSearchService(provider, new AgentPlannerService()).search(
    { targetRoles: ["C#"] },
    signal(),
  );
  expect(discover).toHaveBeenCalledTimes(4);
  expect(discover.mock.calls.flatMap((call) => call[3].sources)).toHaveLength(
    16,
  );
  expect(
    new Set(
      discover.mock.calls.map((call) => JSON.stringify(call[3].queryTitles)),
    ).size,
  ).toBe(4);
  for (const call of discover.mock.calls)
    expect(call[3].budgets).toBe(discover.mock.calls[0][3].budgets);
});
it("merges each attempt once and clears a recovered source error", async () => {
  let attempt = 0;
  discover.mockImplementation(async (_goal, _signal, progress, options) => {
    attempt++;
    const current = {
      ...report("jobinja.ir"),
      found: 2,
      rejected: 1,
      evaluated: 1,
      ...(attempt === 1
        ? { error: "SEARCH_FAILED", accepted: 0 }
        : { accepted: 1 }),
    };
    await progress.sourceCompleted(current);
    return { jobs: attempt === 1 ? [] : [job(1)], sources: [current] };
  });
  const completed = jest.fn(async () => undefined);
  const result = await new AgentSearchService(
    provider,
    new AgentPlannerService(),
    ["jobinja.ir"],
  ).search({ ...goal, requestedCount: 1 }, signal(), {
    sourceStarted: jest.fn(),
    sourceCompleted: completed,
    jobCandidate: jest.fn(async () => true),
  });
  expect(discover).toHaveBeenCalledTimes(2);
  expect(result.partial).toBe(false);
  expect(result.sources).toEqual([
    {
      ...report("jobinja.ir"),
      found: 4,
      accepted: 1,
      rejected: 2,
      evaluated: 2,
    },
  ]);
  expect(completed).toHaveBeenLastCalledWith(result.sources[0]);
});
it.each([
  "JOB_SEARCH_PROVIDER_UNAVAILABLE",
  "JOB_FETCH_PROVIDER_UNAVAILABLE",
  "JOB_FETCH_SECURITY_UNVERIFIED",
])(
  "does not retry permanent provider prerequisite failure %s",
  async (code) => {
    discover.mockRejectedValue(new DiscoveryError(code, 503));
    const result = await new AgentSearchService(
      provider,
      new AgentPlannerService(),
    ).search(goal, signal());
    expect(discover).toHaveBeenCalledTimes(1);
    expect(result.failureCode).toBe(code);
    expect(result.partial).toBe(true);
  },
);
it("preserves first-round accepted jobs when a later attempt hangs", async () => {
  discover.mockResolvedValueOnce({
    jobs: [job(1)],
    sources: AGENT_SOURCES.map(report),
  });
  discover.mockImplementation(() => new Promise(() => undefined));
  const result = await new AgentSearchService(
    provider,
    new AgentPlannerService(),
  ).search(goal, signal(), undefined, publish, Date.now() + 100);
  expect(discover).toHaveBeenCalledTimes(2);
  expect(result.jobs).toEqual([job(1)]);
  expect(result.partial).toBe(true);
  expect(publish).toHaveBeenCalledWith(
    "agent.completed",
    expect.objectContaining({ reasonCode: "TIME_LIMIT" }),
  );
});
it("enforces the shared deadline even when a planner ignores cancellation", async () => {
  const planner = {
    decide: jest.fn(() => new Promise(() => undefined)),
  } as unknown as AgentPlannerService;
  const result = await new AgentSearchService(provider, planner).search(
    goal,
    signal(),
    undefined,
    publish,
    Date.now() + 30,
  );
  expect(discover).not.toHaveBeenCalled();
  expect(result.partial).toBe(true);
});
it("does not start work when cancellation or deadline has already occurred", async () => {
  const controller = new AbortController();
  controller.abort();
  const planner = new AgentPlannerService();
  const decide = jest.spyOn(planner, "decide");
  await new AgentSearchService(provider, planner).search(
    goal,
    controller.signal,
  );
  await new AgentSearchService(provider, planner).search(
    goal,
    signal(),
    undefined,
    undefined,
    Date.now() - 1,
  );
  expect(decide).not.toHaveBeenCalled();
  expect(discover).not.toHaveBeenCalled();
});
it("does not start a provider after cancellation during a progress publish", async () => {
  const controller = new AbortController();
  publish.mockImplementation(async (type) => {
    if (type === "agent.decision") controller.abort();
  });
  const result = await new AgentSearchService(
    provider,
    new AgentPlannerService(),
  ).search(goal, controller.signal, undefined, publish);
  expect(discover).not.toHaveBeenCalled();
  expect(result.partial).toBe(true);
});
it("uses the requested ten jobs as the goal and combines concurrent sources", async () => {
  discover.mockImplementationOnce(
    async (_goal, _signal, _progress, options) => ({
      jobs: [
        ...[1, 2, 3, 4, 5].map((id) => job(id, options.sources[0])),
        ...[6, 7, 8, 9, 10].map((id) => job(id, options.sources[1])),
      ],
      sources: options.sources.map(report),
    }),
  );
  const planner = new AgentPlannerService();
  const decide = jest.spyOn(planner, "decide");
  const result = await new AgentSearchService(provider, planner).search(
    { ...goal, requestedCount: 10 },
    signal(),
    undefined,
    publish,
  );
  expect(discover).toHaveBeenCalledTimes(1);
  expect(result.jobs).toHaveLength(10);
  expect(decide.mock.calls[0][0]).toMatchObject({
    goal: { requestedCount: 10 },
    remainingSources: AGENT_SOURCES,
  });
  expect(publish).toHaveBeenCalledWith(
    "agent.started",
    expect.objectContaining({ targetValidJobs: 10 }),
  );
  expect(publish).toHaveBeenCalledWith(
    "agent.completed",
    expect.objectContaining({ reasonCode: "ENOUGH_RESULTS" }),
  );
});
it("searches every active source even when one source supplies enough jobs", async () => {
  discover.mockImplementationOnce(
    async (_goal, _signal, _progress, options) => ({
      jobs: [1, 2, 3, 4, 5].map((id) => job(id)),
      sources: options.sources.map(report),
    }),
  );
  const result = await new AgentSearchService(
    provider,
    new AgentPlannerService(),
  ).search(goal, signal(), undefined, publish);
  expect(result.jobs).toHaveLength(5);
  expect(result.partial).toBe(false);
  expect(discover).toHaveBeenCalledTimes(1);
  expect(discover.mock.calls[0][3]).toMatchObject({
    sources: AGENT_SOURCES,
    queryTitles: goal.targetRoles,
  });
  expect(publish).toHaveBeenCalledWith(
    "agent.decision",
    expect.objectContaining({ action: "FINISH", reasonCode: "ENOUGH_RESULTS" }),
  );
});
it("keeps uncertain jobs visible and continues until confirmed results or source exhaustion", async () => {
  discover.mockImplementation(async (_goal, _signal, _progress, options) => ({
    jobs: [1, 2, 3, 4, 5].map((id) => job(id, options.sources[0], false)),
    sources: options.sources.map(report),
  }));
  const result = await new AgentSearchService(
    provider,
    new AgentPlannerService(),
  ).search(goal, signal(), undefined, publish);
  expect(discover).toHaveBeenCalledTimes(3);
  expect(result.jobs).toHaveLength(5);
  expect(publish).toHaveBeenCalledWith(
    "agent.completed",
    expect.objectContaining({ validJobCount: 0, uncertainJobCount: 5 }),
  );
  expect(JSON.stringify(publish.mock.calls)).not.toMatch(
    /PRIVATE_PAGE_TEXT|PRIVATE_QUERY/,
  );
});
it("retains streamed jobs and completed sources when another source keeps throwing", async () => {
  discover.mockImplementation(async (_goal, _signal, progress, options) => {
    await progress.jobCandidate(job(1));
    await progress.sourceCompleted(report(options.sources[0]));
    throw new Error("provider offline");
  });
  const result = await new AgentSearchService(
    provider,
    new AgentPlannerService(),
  ).search(goal, signal());
  expect(result.jobs).toHaveLength(1);
  expect(result.partial).toBe(true);
  expect(result.sources.filter((source) => source.error)).toHaveLength(3);
  expect(
    result.sources.find((source) => source.source === "jobinja.ir")?.error,
  ).toBeUndefined();
});
it("retains streamed candidates when a provider never completes", async () => {
  discover.mockImplementation(async (_goal, _signal, progress, options) => {
    await progress.jobCandidate(job(1, options.sources[0]));
    return new Promise(() => undefined);
  });
  const result = await new AgentSearchService(
    provider,
    new AgentPlannerService(),
  ).search(goal, signal(), undefined, publish, Date.now() + 30);
  expect(result.jobs).toHaveLength(1);
  expect(result.partial).toBe(true);
  expect(publish).toHaveBeenCalledWith(
    "agent.completed",
    expect.objectContaining({ reasonCode: "TIME_LIMIT" }),
  );
});
it("preserves a completed source when another concurrent source exceeds the deadline", async () => {
  discover.mockImplementation(async (_goal, _signal, progress) => {
    await progress.jobCandidate(job(1));
    await progress.sourceCompleted({
      ...report("jobinja.ir"),
      found: 1,
      accepted: 1,
    });
    return new Promise(() => undefined);
  });
  const result = await new AgentSearchService(
    provider,
    new AgentPlannerService(),
  ).search(goal, signal(), undefined, publish, Date.now() + 30);
  expect(result.jobs).toHaveLength(1);
  expect(
    result.sources.find((source) => source.source === "jobinja.ir"),
  ).toEqual({ ...report("jobinja.ir"), found: 1, accepted: 1 });
  expect(
    result.sources.filter((source) => source.error === "TIMEOUT"),
  ).toHaveLength(3);
  expect(result.partial).toBe(true);
});
it("counts duplicate and filtered jobs only once after applying user constraints", async () => {
  discover.mockImplementation(async (_goal, _signal, _progress, options) => ({
    jobs: [
      job(1, options.sources[0]),
      job(1, options.sources[0]),
      { ...job(2, options.sources[0]), salaryMin: 40000000 },
    ],
    sources: options.sources.map(report),
  }));
  const result = await new AgentSearchService(
    provider,
    new AgentPlannerService(),
  ).search(goal, signal(), undefined, publish);
  expect(result.jobs).toHaveLength(1);
  expect(publish).toHaveBeenCalledWith(
    "agent.completed",
    expect.objectContaining({ validJobCount: 1 }),
  );
});
it("enforces all sources and immutable user goal even when a planner chooses just one", async () => {
  const planner = {
    decide: jest.fn(async (input) => {
      input.goal.minimumSalary = 1;
      return {
        action: "SEARCH_SOURCES",
        sources: input.remainingSources.slice(0, 1),
        reasonCode: "INITIAL_SEARCH",
      };
    }),
  } as unknown as AgentPlannerService;
  await new AgentSearchService(provider, planner).search(goal, signal());
  expect(discover).toHaveBeenCalledTimes(3);
  for (const call of discover.mock.calls)
    expect(call[3].sources).toEqual(AGENT_SOURCES);
  expect(discover.mock.calls.map((call) => call[0].minimumSalary)).toEqual([
    60000000, 60000000, 60000000,
  ]);
  expect(goal.minimumSalary).toBe(60000000);
});
it("observes one persistently failed source while retaining results from other sources", async () => {
  discover.mockImplementation(async (_goal, _signal, _progress, options) => ({
    jobs: [job(1)],
    sources: options.sources.map((source: string) => ({
      ...report(source),
      ...(source === "jobvision.ir" ? { error: "SEARCH_FAILED" } : {}),
    })),
  }));
  const result = await new AgentSearchService(
    provider,
    new AgentPlannerService(),
  ).search(goal, signal(), undefined, publish);
  expect(result.jobs).toHaveLength(1);
  expect(result.partial).toBe(true);
  expect(result.sources).toHaveLength(4);
  expect(publish).toHaveBeenCalledWith(
    "agent.observation",
    expect.objectContaining({
      totalValidJobs: 1,
      failedSources: ["jobvision.ir"],
      remainingSources: [],
    }),
  );
});
it("never searches disabled or nonallowlisted domains", async () => {
  const result = await new AgentSearchService(
    provider,
    new AgentPlannerService(),
    ["linkedin.com", "jobinja.ir"],
  ).search(goal, signal());
  expect(result.sources.map((source) => source.source)).toEqual(["jobinja.ir"]);
  for (const call of discover.mock.calls)
    expect(call[3].sources).toEqual(["jobinja.ir"]);
});
it("uses one discovery run and skips the planner on cache hits", async () => {
  const repository = {
    context: jest.fn().mockResolvedValue({ intent: goal, version: 1 }),
    begin: jest.fn().mockResolvedValue({ id: "run", cached: false }),
    complete: jest.fn(async (_id, jobs, sources, partial) => ({
      runId: "run",
      jobs,
      sources,
      partial,
    })),
    fail: jest.fn(),
    latest: jest.fn(),
    saveCandidate: jest.fn(),
  } as unknown as jest.Mocked<DiscoveryRepository>;
  const planner = new AgentPlannerService();
  const decide = jest.spyOn(planner, "decide");
  const service = new JobDiscoveryService(
    repository,
    provider,
    60000,
    new AgentSearchService(provider, planner),
  );
  await service.search("owner", "conversation");
  expect(repository.begin).toHaveBeenCalledTimes(1);
  expect(repository.complete).toHaveBeenCalledTimes(1);
  expect(discover).toHaveBeenCalledTimes(3);
  repository.begin.mockResolvedValueOnce({
    id: "run",
    status: "COMPLETED",
    cached: true,
    jobs: [],
    sources: [],
  });
  decide.mockClear();
  discover.mockClear();
  await service.search("owner", "conversation");
  expect(decide).not.toHaveBeenCalled();
  expect(discover).not.toHaveBeenCalled();
});
it("fails when every source fails and no usable jobs exist", async () => {
  discover.mockRejectedValue(new Error("offline"));
  const repository = {
    context: jest.fn().mockResolvedValue({ intent: goal, version: 1 }),
    begin: jest.fn().mockResolvedValue({ id: "run", cached: false }),
    complete: jest.fn(),
    fail: jest.fn(),
    latest: jest.fn(),
    saveCandidate: jest.fn(),
  } as unknown as DiscoveryRepository;
  await expect(
    new JobDiscoveryService(repository, provider).search(
      "owner",
      "conversation",
    ),
  ).rejects.toMatchObject({ code: "JOB_DISCOVERY_UNAVAILABLE" });
  expect(repository.fail).toHaveBeenCalledWith(
    "run",
    "JOB_DISCOVERY_UNAVAILABLE",
    expect.arrayContaining(
      AGENT_SOURCES.map((source) =>
        expect.objectContaining({ source, error: "PROVIDER_FAILURE" }),
      ),
    ),
  );
});
