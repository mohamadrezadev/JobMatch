// Real profile/preferences API; creates and cleans its own disposable account.
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises"),
  path = require("node:path");
require("../../backend/node_modules/@nestjs/config").ConfigModule.forRoot({
  envFilePath: path.resolve(__dirname, "../../backend/.env"),
});
const { PrismaClient } = require("../../backend/node_modules/@prisma/client");
const db = new PrismaClient();
const base = process.env.JOBMATCH_PREVIEW_URL || "http://localhost:3001";
const api = process.env.JOBMATCH_API_URL || "http://localhost:3100";
const email = `account-ui-${randomUUID()}@example.test`;
let browser;
(async () => {
  try {
    const registration = await fetch(api + "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: randomUUID() + "aA1!",
        firstName: "آزمایش",
        lastName: "رابط کاربری",
      }),
    });
    assert.equal(registration.status, 201);
    const auth = (await registration.json()).data;
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await context.addInitScript((auth) => {
      localStorage.setItem("accessToken", auth.accessToken);
      localStorage.setItem(
        "auth-storage",
        JSON.stringify({
          version: 0,
          state: {
            user: auth.user,
            accessToken: auth.accessToken,
            isAuthenticated: true,
            isProfileComplete: false,
          },
        }),
      );
    }, auth);
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/profile");
    await expect(page.getByLabel("نام", { exact: true })).toHaveValue("آزمایش");
    await expect(
      page.getByRole("button", { name: "ذخیره پروفایل", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("alert").filter({ hasText: "دریافت پروفایل" }),
    ).toHaveCount(0);
    await page.getByLabel("مهارت جدید", { exact: true }).fill("Excel");
    await page
      .getByRole("button", { name: "افزودن مهارت", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "حذف مهارت Excel", exact: true }),
    ).toBeVisible();
    await page.getByLabel("نقش شغلی / Title", { exact: true }).fill("حسابدار");
    await page.getByLabel("سال‌های سابقه", { exact: true }).fill("0");
    await page
      .getByLabel("اطلاعات واقعی رزومه", { exact: true })
      .fill("دوره آموزشی Excel — نمونه آزمایشی");
    await page
      .getByRole("button", { name: "ذخیره پروفایل", exact: true })
      .click();
    await expect(
      page.getByText("تغییرات پروفایل ذخیره شد.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByLabel("نقش شغلی / Title", { exact: true }),
    ).toHaveValue("حسابدار");
    await expect(page.getByLabel("سال‌های سابقه", { exact: true })).toHaveValue(
      "0",
    );
    await expect(
      page.getByRole("button", { name: "حذف مهارت Excel", exact: true }),
    ).toBeVisible();
    await page.getByLabel("سطح تجربه", { exact: true }).selectOption("Junior");
    await page.getByLabel("نوع همکاری", { exact: true }).selectOption("Remote");
    await page
      .getByLabel("حقوق ماهانه موردنظر", { exact: true })
      .fill("30000000");
    await page
      .getByRole("button", { name: "ذخیره پروفایل", exact: true })
      .click();
    await expect(
      page.getByText("تغییرات پروفایل ذخیره شد.", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("سال‌های سابقه", { exact: true }).fill("");
    await page.getByLabel("سطح تجربه", { exact: true }).selectOption("");
    await page.getByLabel("نوع همکاری", { exact: true }).selectOption("");
    await page.getByLabel("حقوق ماهانه موردنظر", { exact: true }).fill("");
    await page
      .getByRole("button", { name: "ذخیره پروفایل", exact: true })
      .click();
    await expect(
      page.getByText("تغییرات پروفایل ذخیره شد.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("سال‌های سابقه", { exact: true })).toHaveValue(
      "",
    );
    await expect(page.getByLabel("سطح تجربه", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("نوع همکاری", { exact: true })).toHaveValue(
      "",
    );
    await expect(
      page.getByLabel("حقوق ماهانه موردنظر", { exact: true }),
    ).toHaveValue("");
    await page.goto(base + "/settings");
    await expect(
      page.getByRole("button", { name: "ذخیره تنظیمات", exact: true }),
    ).toBeEnabled();
    await page.getByRole("radio", { name: /^دورکار/ }).check();
    await page.getByLabel("شهر", { exact: true }).fill("تهران");
    await page
      .getByLabel("حداقل حقوق ماهانه", { exact: true })
      .fill("60000000");
    await page
      .getByRole("button", { name: "ذخیره تنظیمات", exact: true })
      .click();
    await expect(
      page.getByText("تنظیمات ذخیره شد.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByRole("radio", { name: /^دورکار/ })).toBeChecked();
    await expect(
      page.getByLabel("حداقل حقوق ماهانه", { exact: true }),
    ).toHaveValue("60000000");
    await page
      .getByRole("button", { name: "ترجیح مشخصی ندارم", exact: true })
      .click();
    await page.getByLabel("حداقل حقوق ماهانه", { exact: true }).fill("");
    await page
      .getByRole("button", { name: "ذخیره تنظیمات", exact: true })
      .click();
    await expect(
      page.getByText("تنظیمات ذخیره شد.", { exact: true }),
    ).toBeVisible();
    const preferences = await context.request.get(
      api + "/api/users/preferences",
      { headers: { Authorization: "Bearer " + auth.accessToken } },
    );
    const preferencesEnvelope = await preferences.json();
    const pref = preferencesEnvelope.data ?? preferencesEnvelope;
    assert.equal(pref.workType, null);
    assert.equal(pref.desiredSalary, null);
    const jobsResponse = await context.request.get(
      api + "/api/jobs?page=1&limit=1",
    );
    const envelope = await jobsResponse.json(),
      jobs = (envelope.data ?? envelope).items;
    assert.ok(jobs.length);
    const job = jobs[0];
    const output = path.resolve(__dirname, "../test-results/account-workspace");
    await fs.mkdir(output, { recursive: true });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width > 768 ? 1000 : 844 });
      for (const theme of ["dark", "light"]) {
        for (const route of [
          "/profile",
          "/settings",
          "/resume",
          "/resume?job=" + job.id,
        ]) {
          await page.goto(base + route);
          await expect(page.locator("main h1").first()).toBeVisible();
          if (
            (await page.locator("html").getAttribute("class")).includes(
              "dark",
            ) !==
            (theme === "dark")
          )
            await page
              .getByRole("button", { name: "تغییر تم سایت", exact: true })
              .click();
          if (route.startsWith("/resume?"))
            await expect(
              page.getByRole("heading", { name: job.title, exact: true }),
            ).toBeVisible();
          if (route === "/resume")
            await expect(
              page.getByRole("button", {
                name: "سفارشی‌سازی برای شغل منتخب",
                exact: true,
              }),
            ).toBeDisabled();
          await page.evaluate(() => document.fonts.ready);
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            "Overflow " + route + " " + width,
          );
          await page.screenshot({
            path: path.join(
              output,
              `${route.startsWith("/resume?") ? "resume-target" : route.slice(1)}-${width}-${theme}.png`,
            ),
            fullPage: true,
            animations: "disabled",
          });
        }
      }
    }
    await page.goto(base + "/chat");
    await expect(
      page.getByRole("heading", {
        name: "دستیار هوشمند شغلی کارمچ",
        exact: true,
      }),
    ).toBeVisible();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: empty-profile 404 is normal; real skill/profile save + reload + zero experience; real preferences save and clear; selected job in resume; no-job generation disabled; 24 light/dark desktop/mobile screenshots; incomplete profile still chats.",
    );
    console.log("Screenshots: " + output);
  } finally {
    await browser?.close();
    const account = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (account) await db.user.delete({ where: { id: account.id } });
    await db.$disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
