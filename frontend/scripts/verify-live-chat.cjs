// Browser fixtures only; the PostgreSQL integration suite verifies actual SSE.
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const base = process.env.JOBMATCH_PREVIEW_URL || "http://localhost:3001";
class Chat {
  constructor(page) {
    this.page = page;
  }
  input() {
    return this.page.getByRole("textbox", { name: "پیام شما", exact: true });
  }
  activity() {
    return this.page.getByRole("region", { name: "فعالیت اجرای درخواست" });
  }
  async send(text) {
    await this.input().fill(text);
    await this.page
      .getByRole("button", { name: "ارسال پیام", exact: true })
      .click();
    await expect(this.input()).toHaveValue("");
  }
  async newConversation() {
    await this.page
      .getByRole("button", { name: "گفتگوی جدید", exact: true })
      .click();
  }
  async history() {
    await this.page
      .getByRole("button", { name: "تاریخچه گفتگو", exact: true })
      .click();
  }
}
module.exports = (async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await context.addInitScript(() => {
      localStorage.setItem("accessToken", "browser-fixture");
      localStorage.setItem(
        "auth-storage",
        JSON.stringify({
          version: 0,
          state: {
            user: {
              id: "fixture-owner",
              email: "fixture@example.test",
              firstName: "کاربر",
              lastName: "آزمایشی",
            },
            accessToken: "browser-fixture",
            isAuthenticated: true,
            isProfileComplete: true,
          },
        }),
      );
    });
    const page = await context.newPage(),
      errors = [],
      chat = new Chat(page);
    page.on("pageerror", (error) => errors.push(error.message));
    if (process.env.JOBMATCH_BROWSER_DEBUG === "true") {
      page.on("console", (message) => {
        if (message.type() === "error")
          console.log("Browser error:", message.text());
      });
    }
    const conversationId = randomUUID(),
      messages = [],
      records = [];
    const preferences = {
      searchContext: {
        targetRoles: ["Backend Developer"],
        preferredSkills: ["Node.js"],
        workTypes: ["Remote"],
        minimumSalary: 20000000,
      },
      candidateFacts: { skills: [], deniedSkills: [], statements: [] },
    };
    const job = {
      id: randomUUID(),
      title: "Backend Developer — browser fixture",
      company: "Test company",
      location: "Tehran",
      workType: "Remote",
      salaryMin: 25000000,
      salaryMax: 35000000,
      currency: "TOMAN",
      salaryPeriod: "MONTHLY",
      source: "jobinja.ir",
      sourceUrl: "https://jobinja.ir/jobs/browser-fixture",
      requiredSkills: ["Node.js"],
      preferredSkills: [],
      warnings: [],
    };
    const snapshot = () => ({
      id: conversationId,
      updatedAt: new Date().toISOString(),
      context: preferences,
      messages: [...messages],
    });
    const event = (runId, sequence, type, data = {}) => ({
      id: `${runId}-${sequence}`,
      runId,
      sequence,
      type,
      timestamp: new Date().toISOString(),
      data,
    });
    const sse = (events) =>
      events
        .map(
          (e) =>
            `id: ${e.sequence}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`,
        )
        .join("");
    const json = (route, data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data }),
      });
    let createCount = 0,
      streamCount = 0,
      replayCursor = 0,
      releaseReplay;
    const gate = new Promise((resolve) => {
      releaseReplay = resolve;
    });
    await page.route("**/api/**", async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      if (process.env.JOBMATCH_BROWSER_DEBUG === "true")
        console.log("Fixture request:", path);
      if (path === "/api/chat/runs" && request.method() === "POST") {
        const body = request.postDataJSON(),
          id = randomUUID(),
          retry = records.find((r) => r.id === body.retryOf);
        createCount++;
        const userId = retry?.userMessageId ?? randomUUID(),
          assistantId = retry?.assistantMessageId ?? randomUUID();
        if (!retry)
          messages.push(
            {
              id: userId,
              role: "user",
              content: body.message,
              sequence: messages.length + 1,
              createdAt: "now",
            },
            {
              id: assistantId,
              role: "assistant",
              content: "ready",
              sequence: messages.length + 2,
              createdAt: "now",
            },
          );
        const events = [
          event(id, 1, "run.created"),
          event(id, 2, "run.started"),
          event(id, 3, "context.processing"),
          event(id, 4, "context.updated", {
            conversation: snapshot(),
            userMessageId: userId,
            assistantMessageId: assistantId,
          }),
        ];
        if (createCount === 2)
          events.push(
            event(id, 5, "run.failed", {
              message: "جستجو انجام نشد؛ گفتگو حفظ شده است.",
              retryable: true,
            }),
          );
        else
          events.push(
            event(id, 5, "source.started", { source: "jobinja.ir" }),
            event(id, 6, "job.accepted", { job }),
            event(id, 7, "source.completed", {
              source: "jobinja.ir",
              found: 1,
              accepted: 1,
              rejected: 0,
            }),
            event(id, 8, "search.completed", {
              jobs: [job],
              sources: [
                { source: "jobinja.ir", found: 1, accepted: 1, rejected: 0 },
                {
                  source: "jobvision.ir",
                  found: 0,
                  accepted: 0,
                  rejected: 0,
                  failed: true,
                },
              ],
            }),
            event(id, 9, "assistant.completed", {
              text: "۱ موقعیت مرتبط پیدا شد.",
              messageId: assistantId,
            }),
            event(id, 10, "run.completed", { partial: true }),
          );
        records.push({
          id,
          message: retry?.message ?? body.message,
          userMessageId: userId,
          assistantMessageId: assistantId,
          conversationId,
          events,
        });
        return json(route, { runId: id, conversationId }, 202);
      }
      if (/\/api\/chat\/runs\/[^/]+\/events$/.test(path)) {
        const record = records.find((r) => r.id === path.split("/").at(-2)),
          after = Number(request.headers()["last-event-id"] || 0);
        assert.equal(request.headers().authorization, "Bearer browser-fixture");
        streamCount++;
        if (record.id === records[0].id && streamCount === 1)
          return route.fulfill({
            contentType: "text/event-stream",
            body: sse(record.events.slice(0, 6)),
          });
        if (record.id === records[0].id && after === 6) {
          replayCursor = after;
          await gate;
          return route.fulfill({
            contentType: "text/event-stream",
            body: sse(record.events.slice(5)),
          });
        }
        return route.fulfill({
          contentType: "text/event-stream",
          body: sse(record.events.filter((e) => e.sequence > after)),
        });
      }
      if (path === "/api/chat/conversations")
        return json(
          route,
          messages.length
            ? [{ id: conversationId, updatedAt: new Date().toISOString() }]
            : [],
        );
      if (path === `/api/chat/conversations/${conversationId}/runs`)
        return json(
          route,
          records.map((r) => ({
            ...r,
            events: r.events.map((e) => ({ ...e, createdAt: e.timestamp })),
          })),
        );
      if (path === `/api/chat/conversations/${conversationId}`)
        return json(route, snapshot());
      if (path.endsWith("/latest")) return json(route, null);
      if (path === "/api/chat/message" || path === "/api/job-discovery/search")
        throw new Error("Duplicate legacy chat/search request");
      return json(route, {});
    });
    await page.goto(base + "/chat");
    await expect(
      page.getByRole("heading", {
        name: "دستیار هوشمند شغلی جاب مچ",
        exact: true,
      }),
    ).toBeVisible();
    await expect(chat.input()).toBeEnabled();
    await chat.send("کار بک‌اند Node دورکار بالای ۲۰ میلیون");
    await expect(page.getByRole("heading", { name: job.title })).toBeVisible();
    await expect(chat.input()).toBeDisabled();
    await expect(chat.activity()).toContainText("در حال جستجو");
    await expect.poll(() => replayCursor).toBe(6);
    assert.equal(createCount, 1);
    releaseReplay();
    await expect(chat.input()).toBeEnabled();
    await expect(page.getByRole("heading", { name: job.title })).toHaveCount(1);
    await chat
      .activity()
      .getByRole("button", { name: /مشاهده جزئیات/ })
      .click();
    await expect(chat.activity()).toContainText("بعضی منابع کامل بررسی نشدند");
    await chat.send("حداقل ۲۵ میلیون");
    await page
      .getByRole("button", { name: "تلاش دوباره", exact: true })
      .click();
    await expect(chat.input()).toBeEnabled();
    await expect(
      page.getByRole("article", { name: "پیام شما", exact: true }),
    ).toHaveCount(2);
    assert.equal(createCount, 3);
    await chat.newConversation();
    await chat.history();
    await page
      .getByLabel("گفتگوهای قبلی", { exact: true })
      .selectOption(conversationId);
    await expect(chat.activity()).toHaveCount(3);
    assert.equal(createCount, 3);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(chat.input()).toBeVisible();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: live result before completion, Bearer SSE, reconnect cursor, deduplication, partial failure, retry without duplicate messages, history restoration and mobile layout (browser fixtures).",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
