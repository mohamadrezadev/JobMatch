import { JobDiscoveryService } from "./job-discovery.service";
import { DiscoveryRepository, JobDiscoveryProvider } from "./discovery.ports";
import { DiscoveryError } from "../domain/discovery";
describe("Discovery use case", () => {
  let repository: jest.Mocked<DiscoveryRepository>,
    provider: jest.Mocked<JobDiscoveryProvider>,
    service: JobDiscoveryService;
  beforeEach(() => {
    repository = {
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
    );
  });
  it("distinguishes empty success from provider failure", async () => {
    provider.discover.mockResolvedValue({
      jobs: [],
      sources: [
        {
          source: "jobvision.ir",
          query: "q",
          found: 0,
          accepted: 0,
          rejected: 0,
        },
      ],
    });
    await service.search("owner", "conversation");
    expect(repository.complete).toHaveBeenCalledWith(
      "run",
      [],
      expect.any(Array),
      false,
    );
    provider.discover.mockResolvedValue({
      jobs: [],
      sources: [
        {
          source: "jobvision.ir",
          query: "q",
          found: 0,
          accepted: 0,
          rejected: 0,
          error: "SEARCH_FAILED",
        },
      ],
    });
    await expect(service.search("owner", "conversation")).rejects.toMatchObject(
      { code: "JOB_DISCOVERY_UNAVAILABLE" },
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
});
