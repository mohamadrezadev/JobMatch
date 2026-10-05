// Standalone browser verification using the existing Chrome/Playwright tooling.
// Successful search responses below are test fixtures, never runtime demo data.
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.JOBMATCH_PREVIEW_URL || "http://localhost:3001";
const api = process.env.JOBMATCH_API_URL || "http://localhost:3100";
class Chat {
  constructor(page) {
    this.page = page;
  }
  async send(text) {
    const input = this.page.getByRole("textbox", {
      name: "پیام شما",
      exact: true,
    });
    await input.fill(text);
    await this.page
      .getByRole("button", { name: "ارسال پیام", exact: true })
      .click();
    await expect(input).toHaveValue("");
  }
  results() {
    return this.page.getByRole("region", { name: "نتایج جستجوی آگهی" });
  }
}
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base + "/chat");
    const chat = new Chat(page);
    await chat.send("کار بک‌اند Node دورکار می‌خوام");
    await expect(
      page.getByText("شرایط جستجویت آماده است.", { exact: false }),
    ).toBeVisible();
    await expect(chat.results()).toHaveCount(0);
    await page.goto(base + "/login");
    await page.getByLabel("ایمیل", { exact: true }).fill("test@pathly.local");
    await page.getByLabel("رمز عبور", { exact: true }).fill("PathlyTest2026!");
    await page.getByRole("button", { name: "ورود به حساب" }).click();
    await expect(page).toHaveURL(base + "/chat");
    await expect(chat.results()).toBeVisible();
    // Local setup lacks a complete search/fetch configuration. Exercise the real API.
    let searches = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/job-discovery/search")) searches++;
    });
    await chat.send("حداقل ۲۰ میلیون");
    await expect(chat.results().getByRole("alert")).toContainText(/هنوز فعال نشده|هنوز آماده نیست|هنوز برای جستجوی امن آماده نیست/);
    assert.equal(
      searches,
      1,
      "History hydration must not issue a duplicate search",
    );
    await expect(
      page.getByRole("article", { name: "پیام شما", exact: true }),
    ).toHaveCount(2);
    const bearer = await page.evaluate(() =>
      localStorage.getItem("accessToken"),
    );
    const forbidden = await page.request.post(
      api + "/api/job-discovery/search",
      {
        headers: { Authorization: "Bearer " + bearer },
        data: { conversationId: "not-a-uuid", sourceUrl: "http://127.0.0.1" },
      },
    );
    assert.equal(forbidden.status(), 400);
    // Fixture-only UI checks: partial success, unknown salary and external source link.
    let mode = "partial";
    await page.route("**/api/job-discovery/search", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            runId: "browser-fixture",
            jobs:
              mode === "empty"
                ? []
                : [
                    {
                      id: "fixture-only",
                      title: "Backend Node.js Developer",
                      company: "شرکت تست مرورگر",
                      location: null,
                      workType: "Remote",
                      experienceLevel: null,
                      salaryMin: null,
                      salaryMax: null,
                      currency: null,
                      salaryPeriod: null,
                      description: null,
                      requiredSkills: ["Node.js"],
                      preferredSkills: [],
                      source: "jobvision.ir",
                      sourceUrl: "https://jobvision.ir/jobs/browser-fixture",
                      publishedAt: null,
                      warnings: ["شهر اعلام نشده"],
                    },
                  ],
            sources: [],
            partial: mode === "partial",
            ...(mode === "empty" ? { code: "NO_JOBS_FOUND" } : {}),
          },
        }),
      }),
    );
    await chat
      .results()
      .getByRole("button", { name: "جستجوی فرصت‌ها", exact: true })
      .click();
    await expect(
      chat
        .results()
        .getByRole("heading", { name: "Backend Node.js Developer" }),
    ).toBeVisible();
    await expect(
      chat.results().getByText("حقوق در آگهی اعلام نشده"),
    ).toBeVisible();
    await expect(chat.results().getByRole("status")).toContainText(
      "بعضی منابع",
    );
    await expect(
      chat.results().getByRole("link", { name: /آگهی اصلی/ }),
    ).toHaveAttribute("href", "https://jobvision.ir/jobs/browser-fixture");
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Mobile page must not overflow",
    );
    await expect(
      page.getByRole("textbox", { name: "پیام شما", exact: true }),
    ).toBeVisible();
    const composer = await page.getByRole('textbox', { name: 'پیام شما', exact: true }).boundingBox();
    const navigation = await page.getByRole('navigation', { name: 'ناوبری موبایل' }).boundingBox();
    assert.ok(composer.y + composer.height <= navigation.y, 'Mobile navigation must not cover the chat composer');
    fs.mkdirSync(path.resolve(__dirname, "../.visual-check"), {
      recursive: true,
    });
    await page.screenshot({
      path: path.resolve(
        __dirname,
        "../.visual-check/job-discovery-mobile.png",
      ),
      fullPage: true,
    });
    mode = "empty";
    await chat
      .results()
      .getByRole("button", { name: "بررسی دوباره", exact: true })
      .click();
    await expect(chat.results().getByRole("status")).toContainText(
      "آگهی معتبری",
    );
    await page.goto(base + "/jobs");
    await expect(
      page.getByText("هیچ شغلی با این مشخصات یافت نشد."),
    ).toBeVisible();
    await expect(
      page.getByText("شرکت پیشگامان فناوری", { exact: false }),
    ).toHaveCount(0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: guest gate; real unavailable provider; chat retention; invalid payload; fixture partial cards; unknown salary; source link; mobile; empty jobs without samples.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
