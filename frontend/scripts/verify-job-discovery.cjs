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
  if (process.env.JOBMATCH_LEGACY_DISCOVERY !== "true") {
    return require("./verify-live-chat.cjs");
  }
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
    if (process.env.JOBMATCH_DOTNET_TRIGGER === "true") {
      // Regression for the user's exact wording; verifies a real automatic POST.
      await page.getByRole("button", { name: "گفتگوی جدید", exact: true }).click();
      const turnPromise = page.waitForResponse(response => response.url().endsWith("/api/chat/message") && response.request().method() === "POST");
      const searchPromise = page.waitForRequest(request => request.url().endsWith("/api/job-discovery/search") && request.method() === "POST", { timeout: 15000 });
      await chat.send("یه کار بکند دات نت با حقوق 60 تومن حضوری تهران");
      const turn = (await (await turnPromise).json()).data;
      assert.equal(turn.readyForSearch, true);
      assert.equal(turn.intent, "JOB_SEARCH");
      assert.ok(turn.searchContext.targetRoles.includes(".NET Developer"));
      assert.equal(turn.searchContext.minimumSalary, 60000000);
      assert.deepEqual(turn.searchContext.workTypes, ["OnSite"]);
      assert.deepEqual(turn.searchContext.locations, ["Tehran"]);
      assert.equal((await searchPromise).postDataJSON().conversationId, turn.conversationId);
      console.log("PASS: exact Persian backend/dotnet request starts real automatic discovery with salary/work/city constraints. This trigger check does not assert that matching vacancies exist.");
      return;
    }
    if (process.env.JOBMATCH_LIVE_DISCOVERY === "true") {
      // Opt-in acceptance: no discovery response fixtures in this branch.
      await page.getByRole("button", { name: "گفتگوی جدید", exact: true }).click();
      const responsePromise = page.waitForResponse(response => response.url().endsWith("/api/job-discovery/search") && response.request().method() === "POST", { timeout: 75000 });
      await chat.send("کار بک‌اند Node دورکار می‌خوام");
      const response = await responsePromise;
      assert.equal(response.status(), 200, "Real discovery must succeed");
      const data = (await response.json()).data;
      assert.ok(data.jobs.length > 0, "Acceptance requires at least one real matching posting");
      assert.equal(data.sources.length, 4);
      for (const job of data.jobs) {
        assert.equal(job.workType, "Remote");
        assert.ok(["jobvision.ir", "jobinja.ir", "irantalent.com", "e-estekhdam.com"].some(domain => new URL(job.sourceUrl).hostname === domain || new URL(job.sourceUrl).hostname.endsWith("." + domain)));
      }
      await expect(chat.results().getByRole("heading", { name: data.jobs[0].title, exact: true })).toBeVisible();
      await expect(chat.results().getByRole("link", { name: "آگهی اصلی" }).first()).toHaveAttribute("href", data.jobs[0].sourceUrl);
      const bearer = await page.evaluate(() => localStorage.getItem("accessToken"));
      const conversations = (await (await page.request.get(api + "/api/chat/conversations", { headers: { Authorization: "Bearer " + bearer } })).json()).data;
      const conversation = conversations[0];
      await page.getByRole("button", { name: "گفتگوی جدید", exact: true }).click();
      let repeatedSearches = 0;
      page.on("request", request => { if (request.method() === "POST" && request.url().endsWith("/api/job-discovery/search")) repeatedSearches++; });
      await page.getByRole("button", { name: "تاریخچه گفتگو", exact: true }).click();
      await page.getByLabel("گفتگوهای قبلی", { exact: true }).selectOption(conversation.id);
      await expect(chat.results().getByRole("heading", { name: data.jobs[0].title, exact: true })).toBeVisible();
      assert.equal(repeatedSearches, 0, "Restoration must use persisted results without new search");
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByRole("textbox", { name: "پیام شما", exact: true })).toBeVisible();
      const composer = await page.getByRole("textbox", { name: "پیام شما", exact: true }).boundingBox();
      const navigation = await page.getByRole("navigation", { name: "ناوبری موبایل" }).boundingBox();
      assert.ok(composer.y + composer.height <= navigation.y);
      fs.mkdirSync(path.resolve(__dirname, "../.visual-check"), { recursive: true });
      await page.screenshot({ path: path.resolve(__dirname, "../.visual-check/live-job-discovery-mobile.png"), fullPage: true });
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ result: "PASS", mode: "live", jobs: data.jobs.length, partial: data.partial, checks: "guest gate, real chat/discovery/persisted cards, source links, remote filter, history restoration without search, mobile composer" }));
      return;
    }
    // Deterministic unavailable-provider UI fixture; invalid payload below uses the real API.
    await page.route("**/api/job-discovery/search", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "JOB_FETCH_SECURITY_UNVERIFIED" } }) }));
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
    let savedFixture;
    await page.route("**/api/job-discovery/search", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(savedFixture = {
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
    // Simulate losing only the POST response after the server saved this run.
    const loseResponse = route => route.abort("failed");
    const restoreSaved = route => route.fulfill({ contentType: "application/json", body: JSON.stringify(savedFixture) });
    await page.route("**/api/job-discovery/search", loseResponse);
    await page.route("**/api/job-discovery/conversations/*/latest", restoreSaved);
    await chat.results().getByRole("button", { name: "بررسی دوباره", exact: true }).click();
    await expect(chat.results().getByRole("heading", { name: "Backend Node.js Developer" })).toBeVisible();
    await expect(chat.results().getByRole("alert")).toHaveCount(0);
    await page.unroute("**/api/job-discovery/search", loseResponse);
    await page.unroute("**/api/job-discovery/conversations/*/latest", restoreSaved);
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
    await page.route("**/api/jobs", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) }));
    await page.goto(base + "/jobs");
    await expect(
      page.getByText("هیچ شغلی با این مشخصات یافت نشد."),
    ).toBeVisible();
    await expect(
      page.getByText("شرکت پیشگامان فناوری", { exact: false }),
    ).toHaveCount(0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: guest gate; fixture unavailable provider; chat retention; real invalid payload; fixture partial cards; lost POST response recovery; unknown salary; source link; mobile; fixture empty jobs without samples.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
