import { JobDiscoveryService } from "./job-discovery.service";
import { DiscoveryRepository, JobDiscoveryProvider } from "./discovery.ports";
import { DiscoveryError } from "../domain/discovery";
describe("Discovery use case", () => {
  let repository: jest.Mocked<DiscoveryRepository>,
    provider: jest.Mocked<JobDiscoveryProvider>,
    service: JobDiscoveryService;
  beforeEach(() => {
    repository = {
      saveCandidate: jest.fn(),
      context: jest.fn(),
      begin: jest.fn(),
      complete: jest.fn(),
      fail: jest.fn(),
      latest: jest.fn(),
    };
    provider = { discover: jest.fn() };
    repository.context.mockResolvedValue({
      version: 2,
      intent: { targetRoles: ["Backend Developer"] },
    });
    repository.begin.mockResolvedValue({
      id: "run",
      status: "RUNNING",
      cached: false,
      jobs: [],
      sources: [],
    });
    service = new JobDiscoveryService(repository, provider);
  });
  it("checks ownership before starting or calling the provider", async () => {
    repository.context.mockRejectedValue(
      new DiscoveryError("CONVERSATION_NOT_FOUND", 404),
    );
    await expect(service.search("other", "conversation")).rejects.toMatchObject(
      { status: 404 },
    );
    expect(repository.begin).not.toHaveBeenCalled();
    expect(provider.discover).not.toHaveBeenCalled();
  });
  it("returns a cached result without another provider request", async () => {
    repository.begin.mockResolvedValue({
      id: "run",
      status: "COMPLETED",
      cached: true,
      jobs: [],
      sources: [],
    });
    expect(await service.search("owner", "conversation")).toMatchObject({
      cached: true,
      code: "NO_JOBS_FOUND",
    });
    expect(provider.discover).not.toHaveBeenCalled();
  });
  it("persists a provider failure with a safe error code", async () => {
    provider.discover.mockRejectedValue(
      new DiscoveryError("JOB_SEARCH_PROVIDER_UNAVAILABLE", 503),
    );
    await expect(service.search("owner", "conversation")).rejects.toMatchObject(
      { code: "JOB_SEARCH_PROVIDER_UNAVAILABLE" },
    );
    expect(repository.fail).toHaveBeenCalledWith(
      "run",
      "JOB_SEARCH_PROVIDER_UNAVAILABLE",
      expect.any(Array),
    );
  });
  it("distinguishes empty success from provider failure", async () => {
    provider.discover.mockImplementation(
      async (_intent, _signal, _progress, options) => ({
        jobs: [],
        sources: options!.sources.map((source) => ({
          source,
          query: "q",
          found: 0,
          accepted: 0,
          rejected: 0,
        })),
      }),
    );
    await service.search("owner", "conversation");
    expect(repository.complete).toHaveBeenCalledWith(
      "run",
      [],
      expect.any(Array),
      false,
    );
    provider.discover.mockImplementation(
      async (_intent, _signal, _progress, options) => ({
        jobs: [],
        sources: options!.sources.map((source) => ({
          source,
          query: "q",
          found: 0,
          accepted: 0,
          rejected: 0,
          error: "SEARCH_FAILED",
        })),
      }),
    );
    await expect(service.search("owner", "conversation")).rejects.toMatchObject(
      { code: "JOB_DISCOVERY_UNAVAILABLE" },
    );
    expect(repository.fail).toHaveBeenLastCalledWith(
      "run",
      "JOB_DISCOVERY_UNAVAILABLE",
      expect.arrayContaining([
        expect.objectContaining({ error: "SEARCH_FAILED" }),
      ]),
    );
  });
  it("cancels provider work at the total deadline and records a safe failure", async () => {
    provider.discover.mockImplementation(
      (_intent, signal) =>
        new Promise((resolve) =>
          signal.addEventListener(
            "abort",
            () =>
              resolve({
                jobs: [],
                sources: [
                  {
                    source: "jobvision.ir",
                    query: "q",
                    found: 0,
                    accepted: 0,
                    rejected: 0,
                    error: "TIMEOUT",
                  },
                ],
              }),
            { once: true },
          ),
        ),
    );
    await expect(
      new JobDiscoveryService(repository, provider, 10).search(
        "owner",
        "conversation",
      ),
    ).rejects.toMatchObject({ code: "JOB_DISCOVERY_UNAVAILABLE" });
    expect(repository.fail).toHaveBeenCalled();
  });
  it("distinguishes filtered vacancies from provider unavailability despite partial page failures", async () => {
    provider.discover.mockResolvedValue({
      jobs: [],
      sources: [
        {
          source: "jobinja.ir",
          query: "q",
          found: 31,
          accepted: 0,
          rejected: 10,
          evaluated: 6,
          error: "FETCH_OR_VALIDATION_FAILED",
        },
      ],
    });
    await service.search("owner", "conversation");
    expect(repository.complete).toHaveBeenCalledWith(
      "run",
      [],
      expect.any(Array),
      true,
    );
    expect(repository.fail).not.toHaveBeenCalled();
  });
  it("retains an empty completed source as partial success when other sources time out", async () => {
    provider.discover.mockImplementation(async (_intent, signal, progress) => {
      const report = {
        source: "jobinja.ir",
        query: "q",
        found: 31,
        accepted: 0,
        rejected: 10,
      };
      await progress!.sourceCompleted(report);
      await new Promise<void>((resolve) => {
        if (signal.aborted) resolve();
        else signal.addEventListener("abort", () => resolve(), { once: true });
      });
      return { jobs: [], sources: [report] };
    });
    repository.complete.mockResolvedValue({
      runId: "run",
      jobs: [],
      sources: [],
      partial: true,
      code: "NO_JOBS_FOUND",
    });
    await expect(
      new JobDiscoveryService(repository, provider, 20).search(
        "owner",
        "conversation",
      ),
    ).resolves.toMatchObject({ partial: true, code: "NO_JOBS_FOUND" });
    expect(repository.fail).not.toHaveBeenCalled();
    expect(repository.complete).toHaveBeenCalledWith(
      "run",
      [],
      expect.arrayContaining([
        expect.objectContaining({ source: "jobinja.ir", found: 31 }),
      ]),
      true,
    );
  });
});
