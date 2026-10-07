// Deterministic UI fixtures; actual chunked HTTP streaming is tested in backend.
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.JOBMATCH_PREVIEW_URL || "http://localhost:3001";
class GuestChat {
  constructor(page) {
    this.page = page;
  }
  input() {
    return this.page.getByRole("textbox", { name: "پیام شما", exact: true });
  }
  send() {
    return this.page.getByRole("button", { name: "ارسال پیام", exact: true });
  }
  activity() {
    return this.page.getByRole("region", { name: "فعالیت اجرای درخواست" });
  }
  async submit(message) {
    await this.input().fill(message);
    await this.send().click();
  }
}
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage(),
      chat = new GuestChat(page),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const empty = {
      messages: [],
      context: {
        searchContext: { targetRoles: [] },
        candidateFacts: { skills: [], deniedSkills: [], statements: [] },
      },
      remaining: 5,
      limit: 5,
      authRequired: false,
    };
    const state = {
      ...empty,
      remaining: 4,
      availability: {
        active: false,
        activeRunId: null,
        nextAllowedAt: new Date(Date.now() + 4000).toISOString(),
        retryAfterSeconds: 4,
      },
      messages: [
        { id: "u", role: "user", content: "Backend تهران", sequence: 1 },
        {
          id: "a",
          role: "assistant",
          content: "۱ موقعیت مرتبط پیدا شد.",
          sequence: 2,
        },
      ],
      discovery: {
        partial: true,
        sources: [
          {
            source: "e-estekhdam.com",
            found: 1,
            accepted: 0,
            rejected: 1,
            failed: true,
            issue: {
              category: "site",
              stage: "fetch",
              message: "صفحهٔ سایت کاریابی پیام خطای اتصال نشان داد.",
              retryable: true,
            },
          },
          {
            source: "irantalent.com",
            found: 1,
            accepted: 0,
            rejected: 1,
            failed: true,
            issue: {
              category: "unknown",
              message: "علت سمت سایت یا سرویس هنوز مشخص نیست.",
              retryable: true,
            },
          },
        ],
        jobs: [
          {
            title: "Backend fixture",
            company: "Fixture Company",
            location: "تهران",
            workType: null,
            salaryMin: null,
            salaryMax: null,
            currency: null,
            salaryPeriod: null,
            source: "jobvision.ir",
            sourceUrl: "https://jobvision.ir/jobs/fixture",
            warnings: ["حقوق در آگهی اعلام نشده است."],
          },
        ],
      },
    };
    let posts = 0,
      gets = 0,
      release;
    const gate = new Promise((resolve) => {
      release = () => {
        state.availability.nextAllowedAt = new Date(Date.now() + 5000).toISOString();
        state.availability.retryAfterSeconds = 5;
        resolve();
      };
    });
    const frame = (type, data) =>
      `event: ${type}\ndata: ${JSON.stringify({ type, data })}\n\n`;
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      if (path === "/api/chat/guest" && req.method() === "GET") {
        gets++;
        if (gets > 1) await gate;
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: gets === 1 ? empty : state,
          }),
        });
      }
      if (path === "/api/chat/guest/message/stream") {
        posts++;
        return route.fulfill({
          contentType: "text/event-stream",
          body:
            posts === 1
              ? frame("context.processing", {}) +
                frame("source.progress", {
                  source: "jobvision.ir",
                  stage: "extract",
                })
              : frame("guest.failed", {
                  code: "GUEST_LIMIT_REACHED",
                  status: 403,
                }),
        });
      }
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      });
    });
    await page.goto(base + "/chat");
    await expect(chat.input()).toBeEnabled();
    await chat.submit("Backend تهران");
    await expect(chat.activity()).toContainText(
      "جاب‌ویژن: در حال استخراج اطلاعات آگهی‌ها",
    );
    await expect(chat.send()).toBeDisabled();
    release();
    await expect(
      page.getByRole("heading", { name: "Backend fixture" }),
    ).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "مشکلات بررسی منابع" }),
    ).toContainText("خطای صفحهٔ سایت");
    await expect(
      page.getByRole("complementary", { name: "مشکلات بررسی منابع" }),
    ).toContainText("علت نامشخص");
    assert.equal(posts, 1, "A disconnected stream must not resubmit the turn");
    await expect(chat.activity().getByLabel("مراحل درخواست")).toBeVisible();
    await expect(chat.activity()).toContainText(
      "تکمیل نشد در مرحله «دریافت صفحات»",
    );
    await chat.input().fill("متن محفوظ در زمان مکث");
    await expect(chat.send()).toBeDisabled();
    await expect(chat.input()).toHaveValue("متن محفوظ در زمان مکث");
    await expect(chat.send()).toBeEnabled({ timeout: 10000 });
    await chat.submit("ادامه بده");
    await expect(
      page.getByRole("link", { name: "ثبت‌نام و ادامه گفتگو" }),
    ).toBeVisible();
    await expect(chat.input()).toHaveValue("ادامه بده");
    assert.equal(posts, 2);
    assert.deepEqual(errors, []);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Mobile page must not overflow horizontally",
    );
    console.log(
      "PASS: guest source timeline, known/unknown failure stages, retained results, restored countdown and editable draft, lost-stream recovery without reposting, quota gate, mobile layout",
    );
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
