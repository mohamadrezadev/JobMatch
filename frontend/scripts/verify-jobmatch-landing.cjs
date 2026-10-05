const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const base = process.env.JOBMATCH_PREVIEW_URL || "http://localhost:3001";
const api = process.env.JOBMATCH_API_URL || "http://localhost:3100";
const output = path.resolve(__dirname, "../.visual-check");
fs.mkdirSync(output, { recursive: true });
let browser;

async function run() {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await expect(
    page.getByRole("heading", { name: /قدم بعدی شغلت/ }),
  ).toBeVisible();
  await expect(page.getByText("پیشخوان نمونه")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: path.join(output, "jobmatch-landing-dark.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "تغییر تم سایت" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.screenshot({
    path: path.join(output, "jobmatch-landing-light.png"),
    fullPage: true,
    animations: "disabled",
  });
  for (const message of [
    "کار بک‌اند Node دورکار می‌خوام",
    "حداقل ۲۰ میلیون",
    "Python بلد نیستم",
    "React بلدم",
    "فقط دورکار",
  ]) {
    await page
      .getByRole("textbox", { name: "پیام شما", exact: true })
      .fill(message);
    const send = page.getByRole("button", { name: "ارسال پیام", exact: true });
    await expect(send).toBeEnabled();
    await send.click();
    await expect(
      page.getByRole("textbox", { name: "پیام شما", exact: true }),
    ).toHaveValue("");
  }
  await expect(
    page.getByRole("link", { name: "ثبت‌نام و ادامه گفتگو", exact: true }),
  ).toBeVisible();
  const blocked = await page.request.post(api + "/api/chat/guest/message", {
    data: { message: "sixth" },
  });
  assert.equal(blocked.status(), 403);
  assert.equal((await blocked.json()).error.code, "GUEST_LIMIT_REACHED");
  await page.reload();
  await expect(
    page.getByRole("article", { name: "پیام شما", exact: true }),
  ).toHaveCount(5);
  await expect(
    page.getByRole("article", { name: "پاسخ دستیار", exact: true }),
  ).toHaveCount(5);
  await expect(page.getByRole("button", { name: "ارسال پیام" })).toBeDisabled();
  await page
    .getByRole("textbox", { name: "پیام شما", exact: true })
    .fill("حداقل ۲۵ میلیون");
  await page.getByRole("link", { name: "ورود به حساب", exact: true }).click();
  await page
    .getByLabel("ایمیل", { exact: true })
    .fill(process.env.JOBMATCH_TEST_EMAIL || "test@pathly.local");
  await page
    .getByLabel("رمز عبور", { exact: true })
    .fill(process.env.JOBMATCH_TEST_PASSWORD || "PathlyTest2026!");
  await page.getByRole("button", { name: "ورود به حساب", exact: true }).click();
  await expect(page).toHaveURL(/\/chat$/);
  await expect(
    page.getByRole("article", { name: "پیام شما", exact: true }),
  ).toHaveCount(5);
  await expect(
    page.getByRole("textbox", { name: "پیام شما", exact: true }),
  ).toHaveValue("حداقل ۲۵ میلیون");
  await expect(page.getByRole("button", { name: "ارسال پیام" })).toBeEnabled();
  await page.getByRole("button", { name: "ارسال پیام" }).click();
  await expect(
    page.getByRole("article", { name: "پیام شما", exact: true }),
  ).toHaveCount(6);
  await expect(page.getByText("۲۵٬۰۰۰٬۰۰۰ تومان")).toBeAttached();
  await page.screenshot({
    path: path.join(output, "jobmatch-chat-continued.png"),
    animations: "disabled",
  });
  await page.goto(base + "/dashboard");
  await expect(page).toHaveURL(base + "/");

  const signupContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const signup = await signupContext.newPage();
  signup.on("pageerror", (error) => errors.push(error.message));
  await signup.goto(base);
  assert.ok(
    await signup.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile overflow",
  );
  await signup.evaluate(() => document.fonts.ready);
  await signup.screenshot({
    path: path.join(output, "jobmatch-landing-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await signup
    .getByRole("textbox", { name: "پیام شما", exact: true })
    .fill("کار فرانت‌اند می‌خوام");
  await expect(
    signup.getByRole("button", { name: "ارسال پیام" }),
  ).toBeEnabled();
  await signup.getByRole("button", { name: "ارسال پیام" }).click();
  await expect(
    signup.getByRole("textbox", { name: "پیام شما", exact: true }),
  ).toHaveValue("");
  await signup
    .getByRole("textbox", { name: "پیام شما", exact: true })
    .fill("فقط دورکار");
  await signup.getByRole("link", { name: "ثبت‌نام", exact: true }).click();
  await signup.getByLabel("نام", { exact: true }).fill("تست");
  await signup.getByLabel("نام خانوادگی", { exact: true }).fill("لندینگ");
  await signup
    .getByLabel("ایمیل", { exact: true })
    .fill(`landing-${randomUUID()}@jobmatch.local`);
  await signup
    .getByLabel("رمز عبور", { exact: true })
    .fill("LocalTest-" + randomUUID());
  await signup
    .getByRole("button", { name: "ساخت حساب کاربری", exact: true })
    .click();
  await expect(signup).toHaveURL(/\/chat$/);
  await expect(
    signup.getByRole("article", { name: "پیام شما", exact: true }),
  ).toHaveCount(1);
  await expect(
    signup.getByRole("textbox", { name: "پیام شما", exact: true }),
  ).toHaveValue("فقط دورکار");
  await expect(
    signup.getByRole("button", { name: "ارسال پیام" }),
  ).toBeEnabled();
  const raceContext = await browser.newContext();
  for (let i = 0; i < 4; i++) {
    const turn = await raceContext.request.post(api + '/api/chat/guest/message', { data: { message: 'Backend' } });
    assert.equal(turn.status(), 200);
  }
  const race = await Promise.all([
    raceContext.request.post(api + '/api/chat/guest/message', { data: { message: 'React' } }),
    raceContext.request.post(api + '/api/chat/guest/message', { data: { message: 'Python' } }),
  ]);
  assert.equal(race.filter(response => response.status() === 200).length, 1);
  assert.ok(race.some(response => [403, 409].includes(response.status())));
  const finalState = await raceContext.request.get(api + '/api/chat/guest');
  assert.equal((await finalState.json()).data.messages.length, 10);
  await raceContext.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS landing, themes, mobile, five-message quota + server rejection + reload + concurrent boundary, login continuation + real sixth message, registration continuation, dashboard redirect.",
  );
  console.log("Screenshots: " + output);
}
run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
  });
