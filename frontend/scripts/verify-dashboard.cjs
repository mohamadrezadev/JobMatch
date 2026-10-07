// Dashboard integration with controlled API fixtures, following the existing MVP verifier.
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.JOBMATCH_PREVIEW_URL || "http://localhost:3001";
const empty = {
  profileCompletion: 0,
  resumeCount: 0,
  interestedCount: 0,
  recommendations: [],
  interestedJobs: [],
  recentDiscoveries: [],
  recentConversations: [],
  recentActivity: [],
};
class DashboardJourney {
  constructor(page) {
    this.page = page;
  }
  async open() {
    await this.page.goto(`${base}/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  }
  async expectAction(label, href) {
    await expect(
      this.page.getByRole("link", { name: label, exact: true }),
    ).toHaveAttribute("href", href);
  }
  async openHistory() {
    await this.page
      .getByText("تاریخچه جستجو و فعالیت", { exact: false })
      .click();
    await expect(
      this.page.getByRole("heading", { name: "جستجوهای اخیر" }),
    ).toBeVisible();
  }
  async retry() {
    await this.page.getByRole("button", { name: "تلاش دوباره" }).click();
  }
  async openSavedJob() {
    await this.page.getByRole("link", { name: /Saved frontend role/ }).click();
    await expect(this.page).toHaveURL(/\/jobs\/saved-1$/, { timeout: 30000 });
  }
  async expectFits() {
    assert.equal(
      await this.page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
      "Dashboard must not overflow horizontally",
    );
  }
}
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await context.addInitScript(() => {
      localStorage.setItem("accessToken", "fixture-token");
      localStorage.setItem(
        "auth-storage",
        JSON.stringify({
          state: {
            user: { id: "fixture-user", firstName: "سارا", lastName: "نمونه" },
            accessToken: "fixture-token",
            isAuthenticated: true,
            isProfileComplete: true,
            onboardingStep: 0,
          },
          version: 0,
        }),
      );
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
      console.error("Browser error:", error.message);
    });
    let dashboard = empty,
      failed = false;
    await page.route("**/api/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (route.request().method() === "OPTIONS")
        return route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "*",
            "access-control-allow-methods": "GET,POST,OPTIONS",
          },
        });
      const status = pathname === "/api/dashboard" && failed ? 503 : 200;
      return route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          success: status < 400,
          data:
            pathname === "/api/dashboard"
              ? dashboard
              : { isProfileComplete: true },
        }),
      });
    });
    const journey = new DashboardJourney(page);
    await journey.open();
    await journey.expectAction("تکمیل پروفایل", "/profile");
    await expect(page.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    await expect(
      page.getByRole("heading", { name: "جستجوهای اخیر" }),
    ).not.toBeVisible();
    await journey.openHistory();
    await journey.expectFits();
    dashboard = { ...empty, profileCompletion: 100 };
    await journey.open();
    await journey.expectAction("ساخت رزومه", "/resume");
    const job = {
      id: "saved-1",
      title: "Saved frontend role",
      company: "Example company",
      location: "تهران",
    };
    dashboard = {
      ...empty,
      profileCompletion: 100,
      resumeCount: 1,
      interestedCount: 1,
      recommendations: [
        {
          ...job,
          id: "recommend-1",
          title: "Backend developer",
          match: { matchScore: 80 },
        },
      ],
      interestedJobs: [job],
      recentConversations: [
        { id: "chat-1", messages: [{ content: "دنبال فرصت دورکاری هستم" }] },
      ],
      recentDiscoveries: [{ id: "run-1", resultCount: 4, status: "PARTIAL" }],
    };
    await journey.open();
    await journey.expectAction("جستجو با دستیار", "/chat");
    await expect(
      page.getByRole("link", { name: /دنبال فرصت دورکاری هستم/ }),
    ).toHaveAttribute("href", "/chat?conversation=chat-1");
    await journey.expectFits();
    await page.screenshot({
      path: "../artifacts/dashboard-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await journey.expectFits();
    await page.screenshot({
      path: "../artifacts/dashboard-mobile.png",
      fullPage: true,
    });
    await journey.openHistory();
    await expect(page.getByText("۴ فرصت · بررسی بخشی از منابع")).toBeVisible();
    await journey.openSavedJob();
    failed = true;
    await journey.open();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "دریافت داشبورد انجام نشد.",
    );
    failed = false;
    await journey.retry();
    await journey.expectAction("جستجو با دستیار", "/chat");
    assert.deepEqual(errors, []);
    console.log(
      "PASS: contextual next steps, empty account, saved job navigation, recent chat link, collapsed history, desktop/mobile layout, API failure and retry. Controlled fixtures only.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
