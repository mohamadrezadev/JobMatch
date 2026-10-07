import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import { V1mJobPageDecisionProvider, V1mConfig } from "./v1m-job-page-decision.provider";

const PRIMARY = "openrouter/typesafe/jev-1.13";
const FALLBACK = "oc/jev-1.13-free";

function answer(isJobPosting: number, isClosed = 0, isSpam = 0) {
  return {
    model: "jev-1.13",
    answers: {
      is_job_posting: { type: "noul", noul: isJobPosting },
      is_closed: { type: "noul", noul: isClosed },
      is_spam: { type: "noul", noul: isSpam },
    },
  };
}

describe("V1M job page decision gate", () => {
  let server: Server;
  let baseUrl: string;
  let requests: Array<{ model: string }>;
  // Keyed by model: "ok" with an explicit answer, "fail" for a 500, or
  // "malformed" for a schema that fails validation.
  let behavior: Record<string, { status: number; body: unknown }>;

  beforeAll(async () => {
    server = createServer(async (req, res) => {
      let raw = "";
      for await (const part of req) raw += part;
      const body = JSON.parse(raw);
      requests.push({ model: body.model });
      const outcome = behavior[body.model] ?? {
        status: 200,
        body: answer(0.96),
      };
      res.statusCode = outcome.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(outcome.body));
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => server.close());

  beforeEach(() => {
    requests = [];
    behavior = {};
  });

  const config: V1mConfig = {
    baseUrl: "",
    models: [PRIMARY, FALLBACK],
    timeoutMs: 1000,
    jobThreshold: 0.7,
    closedThreshold: 0.7,
    spamThreshold: 0.7,
    maxContentChars: 30000,
  };
  const provider = () =>
    new V1mJobPageDecisionProvider({ ...config, baseUrl });
  const signal = new AbortController().signal;
  const evaluate = () =>
    provider().evaluate("Backend Developer at Example Co", "https://x/1", signal);

  it("uses the primary model's answer without calling the fallback", async () => {
    behavior[PRIMARY] = { status: 200, body: answer(0.95, 0.02, 0.01) };
    const decision = await evaluate();
    expect(decision).toMatchObject({
      shouldExtract: true,
      model: PRIMARY,
      mode: "v1m-primary",
    });
    expect(requests).toHaveLength(1);
  });

  it("falls back to the second model when the primary errors", async () => {
    behavior[PRIMARY] = { status: 500, body: { error: "upstream" } };
    behavior[FALLBACK] = { status: 200, body: answer(0.9) };
    const decision = await evaluate();
    expect(decision).toMatchObject({ model: FALLBACK, mode: "v1m-fallback" });
    expect(requests.map((r) => r.model)).toEqual([PRIMARY, FALLBACK]);
  });

  it("fails open and keeps the extraction path when every model fails", async () => {
    behavior[PRIMARY] = { status: 500, body: {} };
    behavior[FALLBACK] = { status: 500, body: {} };
    const decision = await evaluate();
    expect(decision).toEqual({
      isJobPosting: 1,
      isClosed: 0,
      isSpam: 0,
      shouldExtract: true,
      mode: "fail-open",
    });
  });

  it("falls back when the primary response fails schema validation", async () => {
    behavior[PRIMARY] = { status: 200, body: { answers: { oops: true } } };
    behavior[FALLBACK] = { status: 200, body: answer(0.88) };
    const decision = await evaluate();
    expect(decision.mode).toBe("v1m-fallback");
  });

  it("rejects a page that is not a genuine job posting", async () => {
    behavior[PRIMARY] = { status: 200, body: answer(0.1) };
    const decision = await evaluate();
    expect(decision.shouldExtract).toBe(false);
  });

  it("rejects a closed vacancy", async () => {
    behavior[PRIMARY] = { status: 200, body: answer(0.9, 0.95) };
    const decision = await evaluate();
    expect(decision.shouldExtract).toBe(false);
  });

  it("rejects spam", async () => {
    behavior[PRIMARY] = { status: 200, body: answer(0.9, 0.1, 0.92) };
    const decision = await evaluate();
    expect(decision.shouldExtract).toBe(false);
  });
});
