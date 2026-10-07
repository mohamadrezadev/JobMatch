import { JobDiscoveryService } from "./job-discovery.service";
import { DiscoveryRepository, JobDiscoveryProvider } from "./discovery.ports";
import { DiscoveredJob } from "../domain/discovery";

const job: DiscoveredJob = {
  title: "Backend Developer",
  company: "X",
  location: null,
  workType: "Remote",
  experienceLevel: null,
  salaryMin: null,
  salaryMax: null,
  currency: null,
  salaryPeriod: null,
  description: null,
  requiredSkills: [],
  preferredSkills: [],
  source: "jobinja.ir",
  sourceUrl: "https://jobinja.ir/jobs/1",
  publishedAt: null,
};
let repository: jest.Mocked<DiscoveryRepository>,
  provider: jest.Mocked<JobDiscoveryProvider>,
  service: JobDiscoveryService;
beforeEach(() => {
  repository = {
    context: jest.fn().mockResolvedValue({
      version: 2,
      intent: { targetRoles: ["Backend Developer"], workTypes: ["Remote"] },
    }),
    begin: jest.fn().mockResolvedValue({
      id: "run",
      status: "RUNNING",
      cached: false,
      jobs: [],
      sources: [],
    }),
    complete: jest.fn(),
    fail: jest.fn(),
    latest: jest.fn(),
    saveCandidate: jest
      .fn()
      .mockResolvedValue({ ...job, id: "job-id", warnings: [] }),
  };
  provider = { discover: jest.fn() };
  service = new JobDiscoveryService(repository, provider);
});
it("publishes a saved matching unique job before discovery finishes", async () => {
  const publish = jest.fn(async () => undefined);
  const report = {
    source: "jobinja.ir",
    query: "INTERNAL_QUERY",
    found: 1,
    accepted: 1,
    rejected: 0,
  };
  provider.discover.mockImplementation(async (_intent, _signal, progress) => {
    await progress!.sourceStarted("jobinja.ir");
    expect(await progress!.jobCandidate({ ...job, workType: "OnSite" })).toBe(
      false,
    );
    expect(
      await Promise.all([
        progress!.jobCandidate(job),
        progress!.jobCandidate({
          ...job,
          sourceUrl: "https://jobvision.ir/jobs/2",
        }),
      ]),
    ).toEqual([true, false]);
    expect(repository.complete).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalledWith("job.accepted", {
      job: expect.objectContaining({ id: "job-id" }),
    });
    return { jobs: [job], sources: [report] };
  });
  repository.complete.mockResolvedValue({
    runId: "run",
    jobs: [{ ...job, id: "job-id", warnings: [] }],
    sources: [report],
    partial: false,
  });
  await service.search("owner", "conversation", { publish, contextVersion: 2 });
  expect(repository.saveCandidate).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(publish.mock.calls)).not.toContain("INTERNAL_QUERY");
});
it("rejects a changed context before beginning a search", async () => {
  await expect(
    service.search("owner", "conversation", {
      publish: jest.fn(),
      contextVersion: 1,
    }),
  ).rejects.toMatchObject({ code: "CONTEXT_CHANGED" });
  expect(repository.begin).not.toHaveBeenCalled();
});
it("reports a cache hit without fabricated source activity or raw diagnostics", async () => {
  repository.begin.mockResolvedValue({
    id: "run",
    status: "PARTIAL",
    cached: true,
    jobs: [],
    sources: [
      {
        source: "jobinja.ir",
        query: "INTERNAL_QUERY",
        found: 0,
        accepted: 0,
        rejected: 0,
        error: "RAW_ERROR",
      },
    ],
  });
  const publish = jest.fn(async () => undefined);
  await service.search("owner", "conversation", { publish, contextVersion: 2 });
  expect(publish).toHaveBeenCalledTimes(1);
  expect(publish).toHaveBeenCalledWith("search.cached", {
    jobs: [],
    partial: true,
    sources: [
      {
        source: "jobinja.ir",
        found: 0,
        accepted: 0,
        rejected: 0,
        failed: true,
        issue: expect.objectContaining({ category: "unknown" }),
      },
    ],
  });
  expect(provider.discover).not.toHaveBeenCalled();
});
