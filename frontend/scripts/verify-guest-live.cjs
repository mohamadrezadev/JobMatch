// Real browser and cookie-bound API; uses no fixture responses or signed-in account.
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const path = require("node:path");
require("../../backend/node_modules/@nestjs/config").ConfigModule.forRoot({ envFilePath: path.resolve(__dirname, "../../backend/.env") });
const { PrismaClient } = require("../../backend/node_modules/@prisma/client");
const db = new PrismaClient();
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  let tokenHash;
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(90000);
    await page.goto((process.env.JOBMATCH_PREVIEW_URL || "http://localhost:3001") + "/chat");
    const input = page.getByRole("textbox", { name: "پیام شما", exact: true });
    const send = page.getByRole("button", { name: "ارسال پیام", exact: true });
    await expect(send).toBeDisabled();
    await input.fill("فقط حضوری، حداقل حقوق ۳۰ میلیون");
    await expect(send).toBeEnabled();
    await send.click();
    await expect(page.getByText(/دنبال چه عنوان شغلی/)).toBeVisible();
    await input.fill("حسابدار");
    const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/chat/guest/message") && response.request().postDataJSON()?.message === "حسابدار");
    await send.click();
    await expect(page.getByText(/منابع شغلی همزمان جستجو می‌شوند/)).toBeVisible();
    const response = await responsePromise;
    assert.equal(response.status(), 200);
    const state = (await response.json()).data;
    assert.equal(state.context.searchContext.minimumSalary, 30000000);
    assert.deepEqual(state.context.searchContext.workTypes, ["OnSite"]);
    assert.ok(state.discovery, "The app must return a discovery result after the role message");
    await expect(page.getByRole("region", { name: "نتایج جستجوی مهمان" })).toBeVisible();
    assert.equal(await page.getByRole("link", { name: "مشاهده آگهی اصلی", exact: true }).count(), state.discovery.jobs.length);
    const cookie = (await context.cookies()).find((value) => value.name === "jobmatch_guest");
    assert.ok(cookie, "Browser must retain the guest session cookie");
    tokenHash = createHash("sha256").update(cookie.value).digest("hex");
    await page.reload();
    await expect(page.getByRole("region", { name: "نتایج جستجوی مهمان" })).toBeVisible();
    console.log(JSON.stringify({ status: "PASS", source: "real browser and API", jobs: state.discovery.jobs.length, partial: state.discovery.partial, error: state.discovery.error, cookieAndRefresh: "PASS" }));
  } finally {
    await context.close();
    await browser.close();
    if (tokenHash) await db.guestChatSession.deleteMany({ where: { tokenHash } });
    await db.$disconnect();
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
