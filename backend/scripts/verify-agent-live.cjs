// Opt-in live discovery smoke. Uses a disposable owner and real source-backed jobs.
// Run from backend: JOBMATCH_LIVE_AGENT=true node scripts/verify-agent-live.cjs
require("@nestjs/config").ConfigModule.forRoot();
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("node:crypto");
const assert = require("node:assert/strict");
const {
  AGENT_SOURCES,
} = require("../dist/modules/job-discovery/application/agent-planner.service");
const {
  filterAndRank,
  salaryConfirmed,
} = require("../dist/modules/job-discovery/domain/discovery");
const base = process.env.JOBMATCH_API_URL || "http://127.0.0.1:3100";
if (process.env.JOBMATCH_LIVE_AGENT !== "true") {
  console.log(
    "SKIP: set JOBMATCH_LIVE_AGENT=true to use the real router and a disposable test account.",
  );
  process.exit(0);
}
const db = new PrismaClient();
let owner, accessToken;
async function api(path, method = "GET", body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(90000),
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(
      `HTTP ${response.status}: ${payload.error?.code || "request failed"}`,
    );
  return Object.prototype.hasOwnProperty.call(payload, "data")
    ? payload.data
    : payload;
}
(async () => {
  try {
    const auth = await api("/api/auth/register", "POST", {
      email: `agent-smoke-${randomUUID()}@example.test`,
      password: `${randomUUID()}!aA1`,
      firstName: "Agent",
      lastName: "Smoke",
    });
    owner = auth.user.id;
    accessToken = auth.accessToken;
    const run = await api("/api/chat/runs", "POST", {
      requestId: randomUUID(),
      message:
        process.env.JOBMATCH_AGENT_PROMPT || "کار بک‌اند دات نت تهران می‌خوام",
    });
    const stream = await fetch(`${base}/api/chat/runs/${run.runId}/events`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(90000),
    });
    assert.equal(stream.status, 200);
    const body = await stream.text();
    const events = body
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data: "))
      .map((line) => JSON.parse(line.slice(6)));
    assert.deepEqual(
      events.map((event) => event.sequence),
      events.map((_event, index) => index + 1),
    );
    const decisions = events.filter(
      (event) =>
        event.type === "agent.decision" &&
        event.data.action === "SEARCH_SOURCES",
    );
    assert.ok(
      decisions.length >= 1 && decisions.length <= 4,
      "Actual agent source selection must be visible",
    );
    const selected = decisions.flatMap((event) => event.data.sources);
    const plannedSources = events.find(
      (event) => event.type === "agent.started",
    ).data.sources;
    assert.equal(
      decisions.length,
      1,
      "All active sources start in a single parallel search",
    );
    assert.deepEqual([...selected].sort(), [...plannedSources].sort());
    assert.equal(new Set(selected).size, selected.length);
    assert.ok(selected.every((source) => AGENT_SOURCES.includes(source)));
    const contextEvent = events.find(
      (event) => event.type === "context.updated",
    );
    const context = contextEvent.data.conversation;
    assert.ok(
      events.indexOf(contextEvent) <
        events.findIndex((event) => event.type === "agent.planning"),
      "The message goal must be resolved before planning",
    );
    assert.equal(
      events.find((event) => event.type === "agent.started").data
        .targetValidJobs,
      context.context.searchContext.requestedCount ?? 5,
    );
    const completed = events.find((event) => event.type === "agent.completed");
    assert.ok(completed, "Agent records its stop reason");
    const terminal = events.at(-1);
    assert.ok(["run.completed", "run.failed"].includes(terminal.type));
    const latest = await api(
      `/api/job-discovery/conversations/${context.id}/latest`,
    );
    const sourceReports =
      latest?.sources ??
      (
        await db.jobDiscoveryRun.findFirst({
          where: { userId: owner },
          orderBy: { startedAt: "desc" },
          select: { sourceReports: true },
        })
      )?.sourceReports ??
      [];
    if (terminal.type === "run.completed") {
      assert.ok(latest);
      assert.equal(
        filterAndRank(latest.jobs, context.context.searchContext).length,
        latest.jobs.length,
      );
      assert.equal(
        latest.jobs.filter((job) =>
          salaryConfirmed(job, context.context.searchContext),
        ).length,
        completed.data.validJobCount,
      );
      assert.equal(
        await db.jobDiscoveryRun.count({ where: { userId: owner } }),
        1,
      );
      const cached = await api("/api/job-discovery/search", "POST", {
        conversationId: context.id,
      });
      assert.equal(cached.cached, true);
    }
    console.log(
      JSON.stringify({
        status: terminal.type,
        ...(terminal.data.code ? { errorCode: terminal.data.code } : {}),
        understandingMode: contextEvent.data.understandingMode,
        targetRoles: context.context.searchContext.targetRoles,
        requestedCount: context.context.searchContext.requestedCount,
        stopReason: completed.data.reasonCode,
        searchSteps: decisions.length,
        modelDecisions: decisions.filter(
          (event) => event.data.plannerMode === "model",
        ).length,
        fallbackDecisions: decisions.filter(
          (event) => event.data.plannerMode === "fallback",
        ).length,
        jobs: latest?.jobs.length ?? 0,
        confirmedJobs: completed.data.validJobCount,
        sources:
          sourceReports.map(({ source, error }) => ({
            source,
            healthy: !error,
            ...(error ? { error } : {}),
          })) ?? [],
      }),
    );
    if (terminal.type === "run.failed")
      throw new Error(
        "Live providers did not produce a successful discovery run",
      );
    if (!latest.jobs.length)
      console.log(
        "LIMIT: lifecycle and cache passed, but this live prompt produced no matching vacancies.",
      );
    if (!decisions.some((event) => event.data.plannerMode === "model"))
      console.log(
        "LIMIT: planner used deterministic fallback; verify model latency/output before the demo.",
      );
  } finally {
    if (owner) await db.user.delete({ where: { id: owner } });
    await db.$disconnect();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
