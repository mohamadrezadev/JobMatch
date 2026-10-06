// Real cookie-bound guest flow. No registered account or fixture search results.
require("@nestjs/config").ConfigModule.forRoot();
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const base = process.env.JOBMATCH_API_URL || "http://127.0.0.1:3100";
const db = new PrismaClient();
let cookie;
async function request(path, message) {
  const response = await fetch(base + path, {
    method: message ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(message ? { body: JSON.stringify({ message }) } : {}),
    signal: AbortSignal.timeout(90000),
  });
  const setCookie = response.headers
    .getSetCookie()
    .find((value) => value.startsWith("jobmatch_guest="));
  if (setCookie) cookie = setCookie.split(";")[0];
  const payload = await response.json();
  assert.equal(response.ok, true, payload.error?.code);
  return payload.data;
}
(async () => {
  try {
    const first = await request(
      "/api/chat/guest/message",
      "فقط حضوری، حداقل حقوق ۳۰ میلیون",
    );
    assert.equal(first.context.searchContext.targetRoles.length, 0);
    assert.deepEqual(first.context.searchContext.workTypes, ["OnSite"]);
    assert.equal(first.context.searchContext.minimumSalary, 30000000);
    const second = await request("/api/chat/guest/message", "حسابدار");
    assert.ok(second.context.searchContext.targetRoles.includes("حسابدار"));
    assert.deepEqual(second.context.searchContext.workTypes, ["OnSite"]);
    assert.equal(second.context.searchContext.minimumSalary, 30000000);
    assert.ok(
      second.discovery,
      "Supplying the role must actually invoke guest discovery",
    );
    assert.ok(
      !second.messages
        .at(-1)
        .content.includes("درخواست شما برای جستجو آماده است"),
    );
    const restored = await request("/api/chat/guest");
    assert.deepEqual(restored.discovery, second.discovery);
    assert.equal(restored.remaining, 3);
    console.log(
      JSON.stringify({
        status: "PASS",
        role: second.context.searchContext.targetRoles,
        workTypes: second.context.searchContext.workTypes,
        minimumSalary: second.context.searchContext.minimumSalary,
        jobs: second.discovery.jobs.length,
        partial: second.discovery.partial,
        error: second.discovery.error,
        sources: second.discovery.sources,
        summary: second.messages.at(-1).content,
      }),
    );
  } finally {
    if (cookie) {
      const tokenHash = createHash("sha256")
        .update(cookie.split("=")[1])
        .digest("hex");
      await db.guestChatSession.deleteMany({ where: { tokenHash } });
    }
    await db.$disconnect();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
