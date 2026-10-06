// Live smoke: ordinary test account, real PostgreSQL/provider/model; no synthetic jobs.
require("@nestjs/config").ConfigModule.forRoot();
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("node:crypto");
const assert = require("node:assert/strict");
const base = process.env.JOBMATCH_API_URL || "http://127.0.0.1:3014";
const db = new PrismaClient();
const email = `mvp-smoke-${randomUUID()}@example.test`,
  password = randomUUID() + "!aA1";
let owner, accessToken, resumeId;
async function api(path, method = "GET", body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(90000),
  });
  if (response.headers.get("content-type")?.includes("application/pdf")) {
    assert.equal(response.status, 200);
    return Buffer.from(await response.arrayBuffer());
  }
  const payload = await response.json();
  if (!response.ok)
    throw new Error(
      `${method} ${path}: HTTP ${response.status} (${payload.error?.code || "request failed"})`,
    );
  return payload.data ?? payload;
}
(async () => {
  try {
    const auth = await api("/api/auth/register", "POST", {
      email,
      password,
      firstName: "MVP",
      lastName: "Smoke",
    });
    owner = auth.user.id;
    accessToken = auth.accessToken;
    await api("/api/onboarding/complete", "POST", {
      firstName: "MVP",
      lastName: "Smoke",
      title: ".NET Backend Developer",
      experienceYears: 1,
      experienceLevel: "Junior",
      location: "Tehran",
      workType: "OnSite",
      skills: ["C#", ".NET", "SQL", "Git"].map((name) => ({
        name,
        level: "Intermediate",
      })),
    });
    assert.equal((await api("/api/users/profile")).isProfileComplete, true);
    console.log(
      "PASS: registration and atomic onboarding persisted in PostgreSQL",
    );
    const run = await api("/api/chat/runs", "POST", {
      requestId: randomUUID(),
      message: "کار بک‌اند دات نت تهران می‌خوام",
    });
    let terminal;
    const deadline = Date.now() + 100000;
    while (Date.now() < deadline) {
      terminal = await db.chatRun.findUnique({ where: { id: run.runId } });
      if (
        ["COMPLETED", "PARTIAL", "FAILED", "CANCELLED"].includes(
          terminal.status,
        )
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log(
      "Live discovery run status: " +
        terminal.status +
        (terminal.errorCode ? " / " + terminal.errorCode : ""),
    );
    const events = await db.chatRunEvent.findMany({
      where: { runId: run.runId },
      orderBy: { sequence: "asc" },
    });
    assert.ok(events.some((event) => event.type === "context.updated"));
    const result = await api(
      `/api/job-discovery/conversations/${terminal.conversationId}/latest`,
    );
    if (!result?.jobs?.length)
      throw new Error(
        "Live acceptance incomplete: provider returned no valid matching jobs",
      );
    console.log(
      "PASS: real discovery persisted " +
        result.jobs.length +
        " valid source-backed jobs; partial=" +
        result.partial,
    );
    const jobs = result.jobs;
    const skillNames = jobs
      .flatMap((job) => [
        ...(job.requiredSkills || []),
        ...(job.preferredSkills || []),
      ])
      .map((skill) => (typeof skill === "string" ? skill : skill.name))
      .filter(Boolean);
    assert.ok(
      skillNames.length,
      "Live job provides an explicit skill to verify filtering",
    );
    const search = await api(
      "/api/jobs/search?skills=" +
        encodeURIComponent(skillNames[0].toUpperCase()) +
        "&pageSize=100",
    );
    assert.ok(
      search.items.some((job) =>
        jobs.some((discovered) => discovered.id === job.id),
      ),
      "Case-insensitive PostgreSQL JSON skill filtering",
    );
    for (const job of jobs.slice(0, 3))
      await api("/api/feedback", "POST", {
        jobId: job.id,
        rating: "Interested",
      });
    assert.ok(Array.isArray(await api("/api/jobs/recommended")));
    const job = jobs[0];
    assert.ok(job.sourceUrl.startsWith("https://"));
    const match = await api(`/api/matching/${job.id}`, "POST");
    assert.ok(match.breakdown.workType);
    await api("/api/users/profile", "PUT", {
      bio: "I build small .NET APIs.",
      resumeFacts: ["Built a small personal .NET API using SQL."],
    });
    console.log("Checking live AI resume generation");
    const resume = await api("/api/resume/generate", "POST", { jobId: job.id });
    resumeId = resume.id;
    assert.equal(resume.content.name, "MVP Smoke");
    assert.ok(
      resume.content.skills_to_emphasize.every((skill) =>
        ["C#", ".NET", "SQL", "Git"].includes(skill),
      ),
    );
    assert.ok(
      [
        "I build small .NET APIs.",
        "Built a small personal .NET API using SQL.",
      ].includes(resume.content.summary),
    );
    await api(`/api/resumes/${resume.id}`, "PUT", {
      summary: "User-written summary for smoke test.",
      highlights: ["My personal API project."],
      skills_to_emphasize: [".NET", "SQL"],
    });
    const login = await api("/api/auth/login", "POST", { email, password });
    accessToken = login.accessToken;
    const restored = await api(`/api/resumes/${resume.id}`);
    assert.equal(
      restored.content.summary,
      "User-written summary for smoke test.",
    );
    const pdf = await api(`/api/resumes/${resume.id}/pdf`);
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    const dashboard = await api("/api/dashboard");
    assert.equal(dashboard.resumeCount, 1);
    const eventCount = await db.analyticsEvent.count({
      where: { userId: owner },
    });
    assert.ok(eventCount >= 5);
    console.log(
      "PASS: live matching, feedback, recommendations, AI integrity, resume edit/login restoration, actual PDF, dashboard and persisted funnel events",
    );
  } finally {
    // Only the exact account created by this smoke is removed; valid discovered jobs remain.
    if (owner) await db.user.deleteMany({ where: { id: owner, email } });
    await db.$disconnect();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
