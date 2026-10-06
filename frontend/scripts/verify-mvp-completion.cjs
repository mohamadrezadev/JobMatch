// Browser integration with controlled API fixtures; never asserts live provider availability.
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.JOBMATCH_PREVIEW_URL || "http://localhost:3012";
class MvpJourney {
  constructor(page) {
    this.page = page;
  }
  async open(path) {
    await this.page.goto(base + path, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  }
  async onboarding() {
    await this.open("/onboarding");
    await expect(this.page.getByLabel("نام", { exact: true })).toHaveValue("نام");
    await this.page
      .getByLabel("نقش شغلی", { exact: true })
      .fill("Backend Developer");
    await this.page.getByRole("button", { name: "ادامه", exact: true }).click();
    await this.page.getByLabel("سال‌های سابقه").fill("0");
    await this.page.getByRole("button", { name: "ادامه", exact: true }).click();
    await this.page.getByPlaceholder("e.g., C#").fill("Node.js");
    await this.page
      .getByRole("button", { name: "افزودن", exact: true })
      .click();
    await this.page.getByRole("button", { name: "ادامه", exact: true }).click();
    await this.page.getByLabel("مکان ترجیحی").fill("تهران");
    await this.page
      .getByRole("button", { name: "ذخیره و کشف فرصت‌ها" })
      .click();
    await expect(this.page).toHaveURL(/\/chat$/);
  }
  async reject() {
    await this.page.getByLabel("دلیل عدم علاقه").selectOption("Salary");
    await this.page
      .getByRole("button", { name: "علاقه ندارم", exact: true })
      .click();
    await expect(this.page.getByText("بازخورد شما ذخیره شد.")).toBeVisible();
  }
  async saveResume() {
    await this.page
      .getByLabel("خلاصه حرفه‌ای", { exact: true })
      .fill("ویرایش واقعی کاربر");
    await this.page
      .getByRole("button", { name: "ذخیره ویرایش", exact: true })
      .click();
    await expect(this.page.getByText("ویرایش رزومه ذخیره شد.")).toBeVisible();
  }
}
(async () => {
  console.log("Starting MVP browser verification");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [],
      searches = [],
      events = [];
    let complete = false,
      failJobs = false,
      onboarding,
      feedback,
      edit;
    const user = {
      id: "00000000-0000-4000-8000-000000000001",
      email: "fixture@example.test",
      firstName: "نام",
      lastName: "واقعی",
    };
    const jobId = "00000000-0000-4000-8000-000000000002",
      resumeId = "00000000-0000-4000-8000-000000000003";
    const match = {
      matchScore: 80,
      breakdown: { skills: { matched: ["Node.js"], missing: ["Docker"] } },
      explanation: "تطابق بر اساس اطلاعات ثبت‌شده شماست.",
    };
    const job = {
      id: jobId,
      title: "Backend Developer",
      company: "Fixture Company",
      location: "Tehran",
      workType: "Remote",
      requiredSkills: [{ name: "Node.js" }],
      description: "API development",
      source: "jobinja.ir",
      sourceUrl: "https://jobinja.ir/jobs/fixture",
      match,
    };
    let resume = {
      id: resumeId,
      jobId,
      version: 1,
      job,
      content: {
        name: "نام واقعی",
        email: user.email,
        title: "Backend",
        summary: "خلاصه ذخیره‌شده",
        highlights: ["پروژه واقعی"],
        skills_to_emphasize: ["Node.js"],
      },
    };
    await context.addInitScript((user) => {
      localStorage.setItem("accessToken", "fixture-token");
      localStorage.setItem(
        "auth-storage",
        JSON.stringify({
          state: {
            user,
            accessToken: "fixture-token",
            isAuthenticated: true,
            isProfileComplete: false,
            onboardingStep: 0,
          },
          version: 0,
        }),
      );
    }, user);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/**", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      const send = (data, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify({ success: status < 400, data }),
        });
      if (url.pathname === "/api/users/profile")
        return complete
          ? send({
              isProfileComplete: true,
              title: "Backend",
              bio: "Profile bio",
              resumeFacts: ["پروژه واقعی"],
              workType: "Remote",
              experienceYears: 0,
            })
          : send({}, 404);
      if (url.pathname === "/api/onboarding/complete") {
        onboarding = request.postDataJSON();
        complete = true;
        return send({ user, profile: { isProfileComplete: true } });
      }
      if (url.pathname === "/api/jobs/search") {
        searches.push(url.search);
        return failJobs
          ? send({}, 503)
          : send({ items: [job], total: 24, pages: 2 });
      }
      if (url.pathname === "/api/feedback") {
        feedback = request.postDataJSON();
        return send({});
      }
      if (url.pathname === "/api/dashboard")
        return send({
          profileCompletion: 100,
          resumeCount: 1,
          interestedCount: 0,
          recommendations: [job],
          interestedJobs: [],
          recentDiscoveries: [],
          recentConversations: [],
          recentActivity: [],
        });
      if (url.pathname === "/api/users/preferences")
        return send({
          location: "تهران",
          workType: "Remote",
          desiredSalary: 30000000,
        });
      if (url.pathname === "/api/users/skills")
        return send([{ skill: { name: "Node.js" } }]);
      if (url.pathname === "/api/resumes") return send([resume]);
      if (url.pathname === `/api/resumes/${resumeId}`) {
        edit = request.postDataJSON();
        resume = { ...resume, content: { ...resume.content, ...edit } };
        return send(resume);
      }
      if (url.pathname === `/api/resumes/${resumeId}/pdf`)
        return route.fulfill({
          contentType: "application/pdf",
          headers: {
            "content-disposition": 'attachment; filename="resume.pdf"',
          },
          body: "%PDF-1.4\nfixture download\n%%EOF",
        });
      if (url.pathname === "/api/analytics/events") {
        events.push(request.postDataJSON());
        return send({});
      }
      return send([]);
    });
    const journey = new MvpJourney(page);
    console.log("Checking onboarding");
    await journey.onboarding();
    assert.equal(onboarding.experienceYears, 0);
    assert.equal(onboarding.skills[0].name, "Node.js");
    assert.equal(onboarding.firstName, "نام");
    console.log("Checking jobs");
    await journey.open("/jobs");
    await expect(page.getByText(match.explanation)).toBeVisible();
    await page.getByRole("button", { name: "صفحه بعد" }).click();
    await expect
      .poll(() => searches.some((q) => q.includes("page=2")))
      .toBe(true);
    await page.getByLabel("شهر و نوع حضور").selectOption("remote");
    await expect
      .poll(() => searches.some((q) => q.includes("workType=Remote")))
      .toBe(true);
    await journey.reject();
    assert.equal(feedback.reason, "Salary");
    console.log("Checking dashboard");
    await journey.open("/dashboard");
    await expect(
      page.getByRole("heading", { name: "پیشنهادهای مناسب شما" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /آکادمی/ })).toHaveCount(0);
    console.log("Checking resumes");
    await journey.open(`/resume?job=${jobId}`);
    await expect(page.getByLabel("خلاصه حرفه‌ای", { exact: true })).toHaveValue(
      "خلاصه ذخیره‌شده",
    );
    await journey.saveResume();
    assert.equal(edit.summary, "ویرایش واقعی کاربر");
    await page.reload();
    await expect(page.getByLabel("خلاصه حرفه‌ای", { exact: true })).toHaveValue(
      "ویرایش واقعی کاربر",
    );
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "دانلود PDF", exact: true }).click();
    assert.equal((await download).suggestedFilename(), "resume.pdf");
    await expect
      .poll(() => events.some((event) => event.name === "Resume Downloaded"))
      .toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.getByRole("navigation", { name: "ناوبری موبایل" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "آکادمی", exact: true }),
    ).toHaveCount(0);
    failJobs = true;
    await journey.open("/jobs");
    await expect(page.getByRole("alert").filter({ hasText: "دریافت فرصت‌ها ممکن نشد" })).toContainText(
      "دریافت فرصت‌ها ممکن نشد",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: atomic onboarding payload, zero experience, server filters/pagination, rejection reason, real dashboard, saved resume refresh/edit/download, mobile navigation, visible API failure. API fixtures only.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
