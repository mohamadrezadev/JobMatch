// Real local API/PostgreSQL; removes only its own disposable account.
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs/promises");
require("../../backend/node_modules/@nestjs/config").ConfigModule.forRoot({
  envFilePath: path.resolve(__dirname, "../../backend/.env"),
});
const { PrismaClient } = require("../../backend/node_modules/@prisma/client");
const db = new PrismaClient();
const base = process.env.JOBMATCH_PREVIEW_URL || "http://localhost:3001";
const api = process.env.JOBMATCH_API_URL || "http://localhost:3100";
const email = `ui-flow-${randomUUID()}@example.test`,
  password = randomUUID() + "!aA1";
let browser;
(async () => {
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const output = path.resolve(__dirname, "../test-results/ui-flow");
    await fs.mkdir(output, { recursive: true });
    await page.goto(base);
    await expect(
      page.getByRole("heading", { name: /قدم بعدی شغلت/ }),
    ).toBeVisible();
    const input = () =>
      page.getByRole("textbox", { name: "پیام شما", exact: true });
    const send = () =>
      page.getByRole("button", { name: "ارسال پیام", exact: true });
    // Greetings avoid external job discovery and isolate guest quota.
    for (let turn = 1; turn <= 5; turn++) {
      await input().fill("سلام");
      await expect(send()).toBeEnabled();
      await send().click();
      await expect(
        page.getByRole("article", { name: "پیام شما", exact: true }),
      ).toHaveCount(turn, { timeout: 60000 });
      await expect(input()).toHaveValue("");
      if (turn < 5)
        await expect(
          page.getByRole("link", {
            name: "ثبت‌نام و ادامه گفتگو",
            exact: true,
          }),
        ).toHaveCount(0);
    }
    const blocked = await context.request.post(
      api + "/api/chat/guest/message",
      { data: { message: "سلام" } },
    );
    assert.equal(blocked.status(), 403);
    assert.equal((await blocked.json()).error.code, "GUEST_LIMIT_REACHED");
    await page.reload();
    await expect(
      page.getByRole("article", { name: "پیام شما", exact: true }),
    ).toHaveCount(5);
    await input().fill("دنبال شغل حسابداری در تهران هستم");
    await page
      .getByRole("link", { name: "ثبت‌نام و ادامه گفتگو", exact: true })
      .click();
    await page.getByLabel("نام", { exact: true }).fill("تست");
    await page.getByLabel("نام خانوادگی", { exact: true }).fill("مسیر گفتگو");
    await page.getByLabel("ایمیل", { exact: true }).fill(email);
    await page.getByLabel("رمز عبور", { exact: true }).fill(password);
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/auth/register") &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "ساخت حساب کاربری", exact: true })
      .click();
    const auth = (await (await response).json()).data;
    await expect(page).toHaveURL(/\/chat(?:\?|$)/);
    await expect(
      page.getByRole("article", { name: "پیام شما", exact: true }),
    ).toHaveCount(5);
    await expect(input()).toHaveValue("دنبال شغل حسابداری در تهران هستم");
    await expect(send()).toBeEnabled();
    await expect(
      page.getByRole("link", { name: "شروع گفتگو", exact: true }),
    ).toHaveCount(0);
    const headers = { Authorization: "Bearer " + auth.accessToken };
    const profile = await context.request.get(api + "/api/users/profile", {
      headers,
    });
    if (profile.ok())
      assert.equal((await profile.json()).data.isProfileComplete, false);
    else assert.equal(profile.status(), 404);
    const jobsResponse = await context.request.get(
      api + "/api/jobs/search?page=1&limit=12",
      { headers },
    );
    assert.equal(jobsResponse.status(), 200);
    const envelope = await jobsResponse.json(),
      payload = envelope.data ?? envelope,
      jobs = payload.jobs || payload.items;
    assert.ok(
      Array.isArray(jobs) && jobs.length > 0,
      "Stored real jobs required",
    );
    for (const job of jobs) {
      assert.equal(job.match.matchScore, null);
      assert.equal(job.match.reason, "RESUME_REQUIRED");
    }
    await page.goto(base);
    await expect(page).toHaveURL(/\/chat(?:\?|$)/);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width >= 768 ? 1000 : 844 });
      for (const route of [
        "chat",
        "jobs",
        "dashboard",
        "profile",
        "resume",
        "settings",
      ]) {
        await page.goto(base + "/" + route);
        await expect(page.locator("main h1").first()).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: path.join(output, `${route}-${width}.png`),
          fullPage: true,
          animations: "disabled",
        });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          "Overflow: " + route + " " + width,
        );
        if (route === "jobs") {
          await expect(
            page.getByText(/هنوز رزومه‌ای ذخیره نکرده‌اید/).first(),
          ).toBeVisible();
          await expect(
            page.getByText("شکاف مهارت (Skill Gap)", { exact: true }),
          ).toHaveCount(0);
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .getByRole("complementary")
      .getByRole("button", { name: "خروج از حساب", exact: true })
      .click();
    await expect(page).toHaveURL(base + "/");
    await expect(
      page.getByRole("link", { name: "ثبت‌نام و ادامه گفتگو", exact: true }),
    ).toHaveCount(0);
    await input().fill("سلام");
    await expect(send()).toBeEnabled();
    await page.goto(base + "/login");
    await page.getByLabel("ایمیل", { exact: true }).fill(email);
    await page.getByLabel("رمز عبور", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "ورود به حساب", exact: true })
      .click();
    await expect(page).toHaveURL(/\/chat(?:\?|$)/);
    await expect(
      page.getByRole("heading", {
        name: "دستیار هوشمند شغلی کارمچ",
        exact: true,
      }),
    ).toBeVisible();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: real five-message quota, signup/login without profile, guest continuation, root redirect, no resume => no percentage, six pages at 320/390/1440, fresh guest after logout.",
    );
    console.log("Screenshots: " + output);
  } finally {
    await browser?.close();
    const account = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (account) {
      await db.guestChatSession.deleteMany({
        where: { claimedBy: account.id },
      });
      await db.user.delete({ where: { id: account.id } });
    }
    await db.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
