require("@nestjs/config").ConfigModule.forRoot();
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { NineRouterClient } = require("../dist/modules/job-discovery/infrastructure/nine-router.client");
const { NineRouterJobDiscoveryProvider } = require("../dist/modules/job-discovery/infrastructure/nine-router-job-discovery.provider");
const { SourceValidator } = require("../dist/modules/job-discovery/infrastructure/source-validator");
const { normalizeJob, explicitlyClosed } = require("../dist/modules/job-discovery/domain/job-normalizer");
const { filterAndRank } = require("../dist/modules/job-discovery/domain/discovery");
const sources = ["jobinja.ir", "jobvision.ir", "irantalent.com", "e-estekhdam.com"];
const goal = { targetRoles: ["حسابداری"], locations: ["Tehran"] };
const client = new NineRouterClient({ baseUrl: process.env.NINEROUTER_BASE_URL, apiKey: process.env.NINEROUTER_API_KEY,
  searchModel: process.env.NINEROUTER_SEARCH_MODEL || "search-combo", fetchModel: process.env.NINEROUTER_FETCH_MODEL,
  fetchPolicyVerified: process.env.NINEROUTER_FETCH_POLICY_VERIFIED === "true", searchTimeout: 15000, fetchTimeout: 15000 });
const dir = path.resolve(__dirname, "../../artifacts/discovery-diagnostics");
fs.mkdirSync(dir, { recursive: true });
const started = Date.now();
const log = (data) => console.log(JSON.stringify({ elapsedMs: Date.now() - started, ...data }));
const fetchPage = client.fetch.bind(client);
client.fetch = async (url, signal) => {
  const start = Date.now();
  try {
    const page = await fetchPage(url, signal);
    const file = createHash("sha256").update(page.url).digest("hex").slice(0, 12) + ".json";
    fs.writeFileSync(path.join(dir, file), JSON.stringify(page, null, 2));
    const job = normalizeJob(page.content, page.url);
    log({ stage: "fetch", url: page.url, durationMs: Date.now() - start, contentLength: page.content.length, links: page.links.length,
      closed: explicitlyClosed(page.content), parsed: Boolean(job), title: job?.title, location: job?.location,
      accepted: job ? filterAndRank([job], goal).length > 0 : false, artifact: file });
    return page;
  } catch (error) { log({ stage: "fetch-failed", url, durationMs: Date.now() - start, code: error.code, status: error.response?.status }); throw error; }
};
const search = client.search.bind(client);
client.search = async (query, source, signal) => {
  const urls = await search(query, source, signal);
  log({ stage: "search", source, urls });
  return urls;
};
const provider = new NineRouterJobDiscoveryProvider(client, new SourceValidator(sources), sources);
(async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const result = await provider.discover(goal, controller.signal, {
      sourceStarted: async (source) => log({ stage: "source-started", source }),
      sourceCompleted: async (report) => log({ stage: "source-completed", ...report }),
      jobCandidate: async (job) => { const accepted = Boolean(filterAndRank([job], goal).length); log({ stage: "candidate", title: job.title, location: job.location, source: job.source, accepted }); return accepted; },
    });
    log({ stage: "completed", parsedJobs: result.jobs.length, acceptedJobs: filterAndRank(result.jobs, goal).length, sources: result.sources });
  } finally { clearTimeout(timer); }
})().catch((error) => { console.error(JSON.stringify({ code: error.code, errorType: error.name })); process.exitCode = 1; });
