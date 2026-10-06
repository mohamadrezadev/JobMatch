// Actual production service worker tests; native OS installation remains a device check.
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const upstream = process.env.JOBMATCH_PREVIEW_URL || "http://localhost:3013";

class PwaJourney {
  constructor(page, base) {
    this.page = page;
    this.base = base;
  }
  async open(route = "/") {
    await this.page.goto(this.base + route, { waitUntil: "domcontentloaded" });
  }
  async controlled() {
    await this.page.waitForFunction(() =>
      Boolean(navigator.serviceWorker.controller),
    );
  }
  async help() {
    await this.page
      .getByRole("button", { name: "نصب کارمچ", exact: true })
      .click();
  }
  async close() {
    await this.page.getByRole("button", { name: "بستن راهنمای نصب" }).click();
  }
  async draftEmail(value) {
    await this.page.getByLabel("ایمیل", { exact: true }).fill(value);
  }
}

(async () => {
  const frontend = path.join(__dirname, "..");
  const originalWorker = await fs.readFile(
    path.join(frontend, "public/sw.js"),
    "utf8",
  );
  const buildId = (
    await fs.readFile(path.join(frontend, ".next/BUILD_ID"), "utf8")
  ).trim();
  let workerSource = originalWorker;
  // A local proxy gives this browser an isolated origin and a real private API response.
  const proxy = http.createServer(async (req, res) => {
    try {
      if (req.url === "/sw.js") {
        res.writeHead(200, {
          "Content-Type": "application/javascript",
          "Cache-Control": "no-store",
        });
        res.end(workerSource);
        return;
      }
      if (req.url.startsWith("/api/pwa-private-test")) {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
        });
        res.end(JSON.stringify({ privateMarker: "never-cache-me" }));
        return;
      }
      const response = await fetch(upstream + req.url, { redirect: "manual" });
      const headers = Object.fromEntries(response.headers);
      delete headers["content-encoding"];
      delete headers["content-length"];
      delete headers["transfer-encoding"];
      res.writeHead(response.status, headers);
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(502);
      res.end("test upstream unavailable");
    }
  });
  await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + proxy.address().port;
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const journey = new PwaJourney(page, base),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await journey.open();
    await journey.controlled();
    const response = await context.request.get(upstream + "/sw.js");
    assert.equal(response.status(), 200);
    assert.match(response.headers()["cache-control"], /no-store/);
    assert.ok((await response.text()).includes(buildId));
    console.log(
      "PASS: real production worker registration/control and delivery headers",
    );
    await journey.help();
    await expect(page.getByRole("dialog")).toBeVisible();
    await journey.close();
    // Native-event paths are simulated, because headless cannot certify OS dialogs.
    await page.evaluate(() => {
      const e = new Event("beforeinstallprompt", { cancelable: true });
      Object.assign(e, {
        prompt: async () => {
          window.pwaPromptCalls = (window.pwaPromptCalls || 0) + 1;
        },
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      });
      window.dispatchEvent(e);
    });
    await journey.help();
    await page
      .getByRole("button", { name: "نصب روی دستگاه", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("نصب انجام نشد");
    assert.equal(await page.evaluate(() => window.pwaPromptCalls), 1);
    await journey.close();
    await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
    await expect(
      page.getByRole("button", { name: "نصب کارمچ", exact: true }),
    ).toHaveCount(0);
    const privacy = await page.evaluate(async () =>
      (await fetch("/api/pwa-private-test")).json(),
    );
    assert.equal(privacy.privateMarker, "never-cache-me");
    const cacheUrls = await page.evaluate(async () =>
      (
        await Promise.all(
          (await caches.keys()).map(async (key) =>
            (await (await caches.open(key)).keys()).map((r) => r.url),
          ),
        )
      ).flat(),
    );
    assert.ok(
      cacheUrls.every(
        (url) =>
          !url.includes("/api/") &&
          !new URL(url).pathname.match(/^\/(profile|resume|chat|login)$/),
      ),
    );
    await page.evaluate(async () => {
      await (
        await caches.open("unrelated-app-cache")
      ).put("/unrelated", new Response("keep"));
    });
    const otherTab = await context.newPage();
    const otherJourney = new PwaJourney(otherTab, base);
    await otherJourney.open("/login");
    await otherJourney.controlled();
    await otherJourney.draftEmail("unsaved@example.test");
    workerSource = originalWorker.replace(
      '"' + buildId + '"',
      '"' + buildId + '-smoke"',
    );
    assert.notEqual(workerSource, originalWorker);
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration()).update();
    });
    await expect(
      page.getByRole("button", { name: "به‌روزرسانی برنامه" }),
    ).toBeVisible();
    const before = await page.evaluate(
      () => navigator.serviceWorker.controller.state,
    );
    assert.equal(before, "activated");
    assert.ok(
      await page.evaluate(async () =>
        Boolean((await navigator.serviceWorker.getRegistration()).waiting),
      ),
    );
    await Promise.all([
      page.waitForEvent("domcontentloaded"),
      page.getByRole("button", { name: "به‌روزرسانی برنامه" }).click(),
    ]);
    await journey.controlled();
    await expect(
      page.getByRole("button", { name: "به‌روزرسانی برنامه" }),
    ).toHaveCount(0);
    const cacheNames = await page.evaluate(() => caches.keys());
    assert.ok(cacheNames.includes("karmatch-pwa-" + buildId + "-smoke"));
    assert.ok(!cacheNames.includes("karmatch-pwa-" + buildId));
    assert.ok(cacheNames.includes("unrelated-app-cache"));
    await expect(otherTab.getByLabel("ایمیل", { exact: true })).toHaveValue(
      "unsaved@example.test",
    );
    console.log(
      "PASS: private API non-caching, waiting-worker consent, activation/reload and scoped cache cleanup",
    );
    await context.setOffline(true);
    await expect(page.getByRole("status")).toContainText(
      "اتصال اینترنت قطع است",
    );
    await journey.open("/profile");
    await expect(
      page.getByRole("heading", { name: "اتصال اینترنت قطع است" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "تلاش دوباره" }),
    ).toBeVisible();
    const output = path.join(frontend, "test-results/pwa");
    await fs.mkdir(output, { recursive: true });
    await page.screenshot({ path: path.join(output, "offline-mobile.png") });
    await context.setOffline(false);
    await Promise.all([
      page.waitForEvent("domcontentloaded"),
      page.getByRole("button", { name: "تلاش دوباره" }).click(),
    ]);
    await expect(
      page.getByRole("heading", { name: "اتصال اینترنت قطع است" }),
    ).toHaveCount(0);
    console.log(
      "PASS: disconnected open-page notice, full-navigation offline fallback and retry after reconnect",
    );
    const ios = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    });
    const iosPage = await ios.newPage(),
      iosJourney = new PwaJourney(iosPage, base);
    await iosJourney.open("/login");
    await iosJourney.help();
    await expect(iosPage.getByText(/این سایت را در Safari/)).toBeVisible();
    await expect(iosPage.getByText(/Add to Home Screen/)).toBeVisible();
    await iosPage.screenshot({
      path: path.join(output, "ios-install-help.png"),
    });
    assert.equal(
      await iosPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: mobile iOS installation guidance, native-event dismissal and installed-state UI (emulated)",
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => proxy.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
