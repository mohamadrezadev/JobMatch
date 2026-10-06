import { SourceValidator, publicAddress } from "./source-validator";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { EventEmitter } from "node:events";
jest.mock("node:dns/promises", () => ({ lookup: jest.fn() }));
jest.mock("node:https", () => ({ request: jest.fn() }));
describe("Strict job sources", () => {
  const validator = new SourceValidator(["jobvision.ir", "jobinja.ir"]);
  beforeEach(() => jest.resetAllMocks());
  it.each([
    ["https://jobinja.ir/jobs/1", "SOURCE_UNAVAILABLE"],
    [
      "https://vertexaisearch.cloud.google.com/grounding-api-redirect/token",
      "SEARCH_LINK_UNRESOLVED",
    ],
  ])(
    "classifies transport failures after public DNS validation for remote fallback: %s",
    async (url, code) => {
      (lookup as jest.Mock).mockResolvedValue([
        { address: "8.8.8.8", family: 4 },
      ]);
      (request as jest.Mock).mockImplementation(() => {
        const req = Object.assign(new EventEmitter(), {
          end: () => req.emit("error", new Error("ECONNRESET")),
          destroy: jest.fn(),
        });
        return req;
      });
      await expect(
        validator.resolveSearch(url, new AbortController().signal),
      ).rejects.toMatchObject({ code });
      expect(request).toHaveBeenCalledTimes(1);
      expect((request as jest.Mock).mock.calls[0][1].timeout).toBe(2000);
    },
  );
  it("accepts only the exact HTTPS Google grounding route as a transit candidate", () => {
    expect(
      validator.grounding(
        "https://vertexaisearch.cloud.google.com/grounding-api-redirect/Abc_123=",
      ),
    ).toBe(true);
    expect(
      validator.allowed(
        "https://vertexaisearch.cloud.google.com/grounding-api-redirect/Abc_123=",
      ),
    ).toBe(false);
    for (const url of [
      "https://vertexaisearch.cloud.google.com.evil.com/grounding-api-redirect/x",
      "https://vertexaisearch.cloud.google.com/other/x",
      "http://vertexaisearch.cloud.google.com/grounding-api-redirect/x",
      "https://user:pass@vertexaisearch.cloud.google.com/grounding-api-redirect/x",
      "https://vertexaisearch.cloud.google.com/grounding-api-redirect/x?url=http://127.0.0.1",
    ])
      expect(validator.searchCandidate(url)).toBe(false);
  });
  it("resolves a Google GET redirect to an allowlisted source before fetching the destination", async () => {
    (lookup as jest.Mock).mockResolvedValue([
      { address: "8.8.8.8", family: 4 },
    ]);
    (request as jest.Mock)
      .mockImplementationOnce((_url, _options, callback) =>
        Object.assign(new EventEmitter(), {
          end: () =>
            callback({
              statusCode: 302,
              headers: { location: "https://jobinja.ir/jobs/1" },
              destroy: jest.fn(),
            }),
          destroy: jest.fn(),
        }),
      )
      .mockImplementationOnce((_url, _options, callback) =>
        Object.assign(new EventEmitter(), {
          end: () =>
            callback({ statusCode: 200, headers: {}, resume: jest.fn() }),
          destroy: jest.fn(),
        }),
      );
    expect(
      await validator.resolveSearch(
        "https://vertexaisearch.cloud.google.com/grounding-api-redirect/token",
        new AbortController().signal,
      ),
    ).toBe("https://jobinja.ir/jobs/1");
    expect((request as jest.Mock).mock.calls[0][1].method).toBe("GET");
    expect((request as jest.Mock).mock.calls[1][1].method).toBe("HEAD");
  });
  it("rejects a Google redirect to a foreign host without requesting it", async () => {
    (lookup as jest.Mock).mockResolvedValue([
      { address: "8.8.8.8", family: 4 },
    ]);
    (request as jest.Mock).mockImplementation((_url, _options, callback) =>
      Object.assign(new EventEmitter(), {
        end: () =>
          callback({
            statusCode: 302,
            headers: { location: "https://linkedin.com/jobs/1" },
            destroy: jest.fn(),
          }),
        destroy: jest.fn(),
      }),
    );
    await expect(
      validator.resolveSearch(
        "https://vertexaisearch.cloud.google.com/grounding-api-redirect/token",
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "SOURCE_REJECTED" });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it.each(["https://jobvision.ir/jobs/1", "https://www.jobinja.ir/jobs/1"])(
    "accepts %s",
    (url) => expect(validator.allowed(url)).toBe(true),
  );
  it.each([
    "https://jobvision.ir.evil.com/1",
    "https://eviljobvision.ir/1",
    "https://linkedin.com/jobs/1",
    "https://indeed.com/1",
    "file:///etc/passwd",
    "http://127.0.0.1/",
    "https://user:password@jobvision.ir/",
    "https://jobvision.ir:8443/",
    "http://[::1]/",
    "not-url",
  ])("rejects %s", (url) => expect(validator.allowed(url)).toBe(false));
  it.each([
    "0.0.0.0",
    "10.1.2.3",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.0.1",
    "100.64.0.1",
    "198.18.0.1",
    "224.0.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:0db8::1",
  ])("rejects nonpublic address %s", (address) =>
    expect(publicAddress(address)).toBe(false),
  );
  it("requires all DNS answers to be public, including an allowed subdomain", async () => {
    (lookup as jest.Mock).mockResolvedValue([
      { address: "8.8.8.8", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);
    await expect(
      validator.validate("https://www.jobvision.ir/jobs/1"),
    ).rejects.toMatchObject({ code: "SOURCE_REJECTED" });
    expect(publicAddress("8.8.8.8")).toBe(true);
    expect(publicAddress("2001:4860:4860::8888")).toBe(true);
  });
  it("pins DNS for both Node lookup modes and rejects a foreign redirect before another request", async () => {
    const addresses = [{ address: "8.8.8.8", family: 4 }];
    (lookup as jest.Mock).mockResolvedValue(addresses);
    (request as jest.Mock).mockImplementation((_url, options, callback) => {
      const all = jest.fn(),
        single = jest.fn();
      options.lookup("jobvision.ir", { all: true }, all);
      options.lookup("jobvision.ir", { all: false }, single);
      expect(all).toHaveBeenCalledWith(null, addresses);
      expect(single).toHaveBeenCalledWith(null, "8.8.8.8", 4);
      const req = Object.assign(new EventEmitter(), {
        end: () =>
          callback({
            statusCode: 302,
            headers: { location: "https://linkedin.com/jobs/1" },
            resume: jest.fn(),
          }),
        destroy: jest.fn(),
      });
      return req;
    });
    await expect(
      validator.resolve(
        "https://jobvision.ir/jobs/1",
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "SOURCE_REJECTED" });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("rejects an allowed redirect hostname resolving privately before following it", async () => {
    (lookup as jest.Mock)
      .mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }])
      .mockResolvedValueOnce([{ address: "127.0.0.1", family: 4 }]);
    (request as jest.Mock).mockImplementation((_url, _options, callback) =>
      Object.assign(new EventEmitter(), {
        end: () =>
          callback({
            statusCode: 302,
            headers: { location: "https://www.jobvision.ir/jobs/1" },
            resume: jest.fn(),
          }),
        destroy: jest.fn(),
      }),
    );
    await expect(
      validator.resolve(
        "https://jobvision.ir/jobs/1",
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "SOURCE_REJECTED" });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
