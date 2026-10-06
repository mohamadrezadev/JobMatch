import {
  NineRouterJobDiscoveryProvider,
  jobDetailUrl,
} from "./nine-router-job-discovery.provider";
import { NineRouterClient } from "./nine-router.client";
import { SourceValidator } from "./source-validator";
import { DiscoveryError } from "../domain/discovery";

const html =
  '<script type="application/ld+json">{"@type":"JobPosting","title":"Backend Developer","hiringOrganization":{"name":"X"}}</script>';
describe("Search/fetch boundary", () => {
  it("follows IranTalent listing links instead of treating their category pages as vacancies", () => {
    expect(
      jobDetailUrl(
        "https://www.irantalent.com/jobs/senior-accountant-jobs-in-tehran",
      ),
    ).toBe(false);
    expect(
      jobDetailUrl("https://www.irantalent.com/en/job/accountant/184216"),
    ).toBe(true);
    expect(
      jobDetailUrl(
        "https://www.irantalent.com/job/financial-accountant/184441",
      ),
    ).toBe(true);
  });
  let client: { ready: jest.Mock; search: jest.Mock; fetch: jest.Mock };
  let validator: SourceValidator;
  const signal = new AbortController().signal;
  beforeEach(() => {
    client = {
      ready: jest.fn(async () => {}),
      search: jest.fn(),
      fetch: jest.fn(async (url: string) => ({ url, content: html })),
    };
    validator = new SourceValidator(["jobvision.ir", "jobinja.ir"]);
    jest.spyOn(validator, "resolve").mockImplementation(async (url) => url);
    jest
      .spyOn(validator, "validate")
      .mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
  });
  it("searches only the requested batch and rejects unknown or repeated sources", async () => {
    client.search.mockResolvedValue([]);
    const provider = new NineRouterJobDiscoveryProvider(
      client as unknown as NineRouterClient,
      validator,
      ["jobvision.ir", "jobinja.ir"],
    );
    const result = await provider.discover(
      { targetRoles: ["Backend Developer"] },
      signal,
      undefined,
      { sources: ["jobinja.ir"] },
    );
    expect(result.sources.map((source) => source.source)).toEqual([
      "jobinja.ir",
    ]);
    expect(client.search).toHaveBeenCalledTimes(1);
    for (const sources of [["linkedin.com"], ["jobinja.ir", "jobinja.ir"], []])
      await expect(
        provider.discover(
          { targetRoles: ["Backend Developer"] },
          signal,
          undefined,
          { sources },
        ),
      ).rejects.toMatchObject({ code: "SOURCE_REJECTED" });
  });
  it("never fetches LinkedIn/Indeed even when search returns them", async () => {
    client.search.mockResolvedValue([
      "https://jobvision.ir/job/1",
      "https://linkedin.com/jobs/123",
      "https://indeed.com/job/456",
      "https://jobinja.ir/job/2",
    ]);
    const result = await new NineRouterJobDiscoveryProvider(
      client as unknown as NineRouterClient,
      validator,
      ["jobvision.ir"],
    ).discover({ targetRoles: ["Backend Developer"] }, signal);
    expect(client.fetch.mock.calls.map((call) => call[0])).toEqual([
      "https://jobvision.ir/job/1",
      "https://jobinja.ir/job/2",
    ]);
    expect(result.jobs).toHaveLength(2);
    expect(result.sources[0].rejected).toBe(2);
  });
  it("reports real source progress and counts acceptance after the application filter", async () => {
    client.search.mockResolvedValue(["https://jobvision.ir/jobs/1"]);
    const progress = {
      sourceStarted: jest.fn(async () => undefined),
      sourceCompleted: jest.fn(async () => undefined),
      jobCandidate: jest.fn(async () => false),
    };
    const result = await new NineRouterJobDiscoveryProvider(
      client as unknown as NineRouterClient,
      validator,
      ["jobvision.ir"],
    ).discover({ targetRoles: ["Backend Developer"] }, signal, progress);
    expect(progress.sourceStarted).toHaveBeenCalledWith("jobvision.ir");
    expect(progress.jobCandidate).toHaveBeenCalledTimes(1);
    expect(progress.sourceCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ accepted: 0, rejected: 1 }),
    );
    expect(result.sources[0].accepted).toBe(0);
  });
  it("rejects a foreign redirect before the provider fetch", async () => {
    client.search.mockResolvedValue(["https://jobvision.ir/job/1"]);
    jest
      .spyOn(validator, "resolve")
      .mockRejectedValue(new DiscoveryError("SOURCE_REJECTED", 400));
    const result = await new NineRouterJobDiscoveryProvider(
      client as unknown as NineRouterClient,
      validator,
      ["jobvision.ir"],
    ).discover({ targetRoles: ["Backend Developer"] }, signal);
    expect(client.fetch).not.toHaveBeenCalled();
    expect(result.jobs).toEqual([]);
  });
  it("preserves results from a healthy source when another fails", async () => {
    client.search.mockImplementation(async (_query, source) => {
      if (source === "jobinja.ir") throw new Error("timeout");
      return ["https://jobvision.ir/job/1"];
    });
    const result = await new NineRouterJobDiscoveryProvider(
      client as unknown as NineRouterClient,
      validator,
      ["jobvision.ir", "jobinja.ir"],
    ).discover({ targetRoles: ["Backend Developer"] }, signal);
    expect(result.jobs).toHaveLength(1);
    expect(result.sources[1].error).toBe("SEARCH_FAILED");
  });
  it("starts every selected source before any search resolves and streams fast results", async () => {
    const sources = [
      "jobvision.ir",
      "jobinja.ir",
      "irantalent.com",
      "e-estekhdam.com",
    ];
    const releases = new Map<string, (urls: string[]) => void>();
    client.search.mockImplementation(
      (_query, source) =>
        new Promise<string[]>((resolve) => {
          releases.set(source, resolve);
        }),
    );
    const progress = {
      sourceStarted: jest.fn(async () => undefined),
      sourceCompleted: jest.fn(async () => undefined),
      jobCandidate: jest.fn(async () => true),
    };
    const validatorForAll = new SourceValidator(sources);
    const provider = new NineRouterJobDiscoveryProvider(
      client as unknown as NineRouterClient,
      validatorForAll,
      sources,
    );
    jest
      .spyOn(validatorForAll, "resolveSearch")
      .mockImplementation(async (url) => url);
    jest
      .spyOn(validatorForAll, "validate")
      .mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
    const pending = provider.discover(
      { targetRoles: ["Backend Developer"] },
      signal,
      progress,
    );
    // A sequential implementation would only enter the first blocked search.
    await new Promise((resolve) => setImmediate(resolve));
    expect([...releases.keys()]).toEqual(sources);
    expect(progress.sourceStarted).toHaveBeenCalledTimes(4);
    releases.get("jobvision.ir")!(["https://jobvision.ir/jobs/1"]);
    await new Promise((resolve) => setImmediate(resolve));
    expect(progress.jobCandidate).toHaveBeenCalledTimes(1);
    expect(progress.sourceCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ source: "jobvision.ir", accepted: 1 }),
    );
    sources.slice(1).forEach((source) => releases.get(source)!([]));
    const result = await pending;
    expect(result.jobs).toHaveLength(1);
    expect(result.sources).toHaveLength(4);
  });
  it("does not search or fetch without a provider", async () => {
    client.ready.mockRejectedValue(
      new DiscoveryError("JOB_SEARCH_PROVIDER_UNAVAILABLE", 503),
    );
    await expect(
      new NineRouterJobDiscoveryProvider(
        client as unknown as NineRouterClient,
        validator,
        ["jobvision.ir"],
      ).discover({ targetRoles: ["Backend Developer"] }, signal),
    ).rejects.toMatchObject({ code: "JOB_SEARCH_PROVIDER_UNAVAILABLE" });
    expect(client.search).not.toHaveBeenCalled();
    expect(client.fetch).not.toHaveBeenCalled();
  });
  it("does not let model fallback revive an explicitly closed posting", async () => {
    client.search.mockResolvedValue(["https://jobinja.ir/jobs/1"]);
    client.fetch.mockResolvedValue({
      url: "https://jobinja.ir/jobs/1",
      content: "این آگهی بسته شده است\n" + html,
    });
    const extractor = { extract: jest.fn() };
    const result = await new NineRouterJobDiscoveryProvider(
      client as unknown as NineRouterClient,
      validator,
      ["jobinja.ir"],
      extractor,
    ).discover({ targetRoles: ["Backend Developer"] }, signal);
    expect(result.jobs).toEqual([]);
    expect(extractor.extract).not.toHaveBeenCalled();
  });
  it("uses a verified final URL for Google bridges and follows only permitted detail links", async () => {
    const bridge =
      "https://vertexaisearch.cloud.google.com/grounding-api-redirect/token";
    client.search.mockResolvedValue([bridge]);
    jest.spyOn(validator, "resolveSearch").mockImplementation(async (url) => {
      if (url === bridge)
        throw new DiscoveryError("SEARCH_LINK_UNRESOLVED", 502);
      return url;
    });
    client.fetch.mockImplementation(async (url: string) =>
      url === bridge
        ? {
            url: "https://jobinja.ir/jobs",
            content: "Job list",
            finalUrlVerified: true,
            links: ["/jobs/1", "https://linkedin.com/jobs/1", "/jobs/1"],
          }
        : { url, content: html, finalUrlVerified: true, links: [] },
    );
    const result = await new NineRouterJobDiscoveryProvider(
      client as unknown as NineRouterClient,
      validator,
      ["jobinja.ir"],
    ).discover({ targetRoles: ["Backend Developer"] }, signal);
    expect(client.fetch.mock.calls.map((call) => call[0])).toEqual([
      bridge,
      "https://jobinja.ir/jobs/1",
    ]);
    expect(result.jobs[0].sourceUrl).toBe("https://jobinja.ir/jobs/1");
  });
  it("rejects a bridge response which only echoes the original URL", async () => {
    const bridge =
      "https://vertexaisearch.cloud.google.com/grounding-api-redirect/token";
    client.search.mockResolvedValue([bridge]);
    jest
      .spyOn(validator, "resolveSearch")
      .mockRejectedValue(new DiscoveryError("SEARCH_LINK_UNRESOLVED", 502));
    client.fetch.mockResolvedValue({
      url: bridge,
      content: html,
      links: [],
      finalUrlVerified: false,
    });
    const result = await new NineRouterJobDiscoveryProvider(
      client as unknown as NineRouterClient,
      validator,
      ["jobinja.ir"],
    ).discover({ targetRoles: ["Backend Developer"] }, signal);
    expect(result.jobs).toEqual([]);
    expect(result.sources[0].error).toBe("FETCH_PROVENANCE_MISSING");
  });
  it("does not send a DNS-rejected Google bridge to the remote provider", async () => {
    client.search.mockResolvedValue([
      "https://vertexaisearch.cloud.google.com/grounding-api-redirect/token",
    ]);
    jest
      .spyOn(validator, "resolveSearch")
      .mockRejectedValue(new DiscoveryError("SOURCE_REJECTED", 400));
    await new NineRouterJobDiscoveryProvider(
      client as unknown as NineRouterClient,
      validator,
      ["jobinja.ir"],
    ).discover({ targetRoles: ["Backend Developer"] }, signal);
    expect(client.fetch).not.toHaveBeenCalled();
  });
  it("bounds expanded listing links to ten total fetches per source", async () => {
    client.search.mockResolvedValue(["https://jobinja.ir/jobs"]);
    client.fetch.mockImplementation(async (url: string) => ({
      url,
      content: url.endsWith("/jobs") ? "Job list" : html,
      finalUrlVerified: true,
      links: Array.from({ length: 100 }, (_, i) => "/jobs/" + i),
    }));
    const result = await new NineRouterJobDiscoveryProvider(
      client as unknown as NineRouterClient,
      validator,
      ["jobinja.ir"],
    ).discover({ targetRoles: ["Backend Developer"] }, signal);
    expect(client.fetch).toHaveBeenCalledTimes(10);
    expect(result.jobs).toHaveLength(9);
  });
  it("visits role-related details even when search fills all ten slots with listings", async () => {
    client.search.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => `https://jobinja.ir/jobs?page=${i}`),
    );
    client.fetch.mockImplementation(async (url: string) => ({
      url,
      content: url.includes("/jobs/") ? html : "Job list",
      finalUrlVerified: true,
      links: [
        "/jobs/sales",
        "/jobs/node-developer",
        "/jobs/backend-developer",
        "/jobs/other",
      ],
    }));
    const result = await new NineRouterJobDiscoveryProvider(
      client as unknown as NineRouterClient,
      validator,
      ["jobinja.ir"],
    ).discover(
      { targetRoles: ["Node.js Developer", "Backend Developer"] },
      signal,
    );
    expect(client.fetch.mock.calls[1][0]).toBe(
      "https://jobinja.ir/jobs/node-developer",
    );
    expect(result.jobs.length).toBeGreaterThan(0);
    expect(client.fetch.mock.calls.length).toBeLessThanOrEqual(10);
  });
});
