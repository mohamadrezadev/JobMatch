import { GuestDiscoveryService } from "./guest-discovery.service";
import { AgentSearchService } from "../../job-discovery/application/agent-search.service";
import { AgentPlannerService } from "../../job-discovery/application/agent-planner.service";
import { DiscoveredJob } from "../../job-discovery/domain/discovery";

const goal = { targetRoles: ["حسابدار"], minimumSalary: 30000000 };
const job: DiscoveredJob = {
  title: "حسابدار",
  company: "شرکت نمونه",
  location: "Tehran",
  workType: "OnSite",
  experienceLevel: null,
  salaryMin: null,
  salaryMax: null,
  currency: null,
  salaryPeriod: null,
  source: "jobinja.ir",
  sourceUrl: "https://jobinja.ir/jobs/1",
  publishedAt: null,
  description: "PRIVATE_PAGE_CONTENT",
  requiredSkills: [],
  preferredSkills: [],
};
it("returns real source links with salary warnings and excludes private diagnostics", async () => {
  const agent = {
    search: jest.fn(async () => ({
      jobs: [job],
      sources: [
        {
          source: "jobinja.ir",
          query: "PRIVATE_QUERY",
          found: 1,
          accepted: 1,
          rejected: 0,
        },
      ],
      partial: false,
    })),
  };
  const result = await new GuestDiscoveryService(
    agent as unknown as AgentSearchService,
  ).search(goal);
  expect(result.jobs[0].sourceUrl).toBe(job.sourceUrl);
  expect(result.jobs[0].warnings).toContain(
    "حداقل حقوق درخواستی در این آگهی تأیید نشده است.",
  );
  expect(JSON.stringify(result)).not.toContain("PRIVATE_");
});
it("keeps streamed jobs when another source exceeds the deadline", async () => {
  const provider = {
    discover: jest.fn(async (_goal, _signal, progress) => {
      await progress.jobCandidate(job);
      return new Promise<never>(() => undefined);
    }),
  };
  const agent = new AgentSearchService(provider, new AgentPlannerService());
  const result = await new GuestDiscoveryService(agent, 30).search(goal);
  expect(result.jobs).toHaveLength(1);
  expect(result.partial).toBe(true);
});
it("returns a visible failure when the provider is unavailable", async () => {
  const agent = {
    search: jest.fn().mockRejectedValue(new Error("private provider error")),
  };
  const result = await new GuestDiscoveryService(
    agent as unknown as AgentSearchService,
  ).search(goal);
  expect(result).toEqual({
    jobs: [],
    sources: [],
    partial: true,
    error: "JOB_DISCOVERY_UNAVAILABLE",
    issue: expect.objectContaining({ category: "unknown" }),
  });
});
it("streams source stages and preserves safe per-source failure explanations", async () => {
  const publish = jest.fn(async () => undefined);
  const report = {
    source: "e-estekhdam.com",
    found: 1,
    accepted: 0,
    rejected: 1,
    error: "PAGE_CONNECTION_ERROR",
  };
  const agent = {
    search: jest.fn(async (_goal, _signal, progress) => {
      await progress.sourceStarted(report.source);
      await progress.sourceProgress(report.source, "fetch");
      await progress.sourceCompleted(report);
      return { jobs: [job], sources: [report], partial: true };
    }),
  };
  const result = await new GuestDiscoveryService(
    agent as unknown as AgentSearchService,
  ).search(goal, publish);
  expect(publish).toHaveBeenCalledWith("source.progress", {
    source: report.source,
    stage: "fetch",
  });
  expect(result.sources[0].issue?.category).toBe("site");
  expect(result.jobs).toHaveLength(1);
});
it("reports no matches rather than provider failure after examining filtered vacancies", async () => {
  const agent = {
    search: jest.fn().mockResolvedValue({
      jobs: [],
      sources: [
        {
          source: "jobinja.ir",
          found: 31,
          accepted: 0,
          rejected: 10,
          evaluated: 6,
          error: "FETCH_OR_VALIDATION_FAILED",
        },
      ],
      partial: true,
    }),
  };
  const result = await new GuestDiscoveryService(
    agent as unknown as AgentSearchService,
  ).search(goal);
  expect(result.jobs).toEqual([]);
  expect(result.partial).toBe(true);
  expect(result.error).toBeUndefined();
});
