const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const base = process.env.JOBMATCH_PREVIEW_URL || "http://localhost:3013";

class BrandPage {
  constructor(page) {
    this.page = page;
  }
  async open(route) {
    await this.page.goto(base + route, { waitUntil: "domcontentloaded" });
  }
  async theme() {
    await this.page.getByRole("button", { name: "تغییر تم سایت" }).click();
  }
  async checkImages() {
    await expect(
      this.page.getByRole("img", { name: /KarMatch/ }).first(),
    ).toBeVisible();
    await this.page.waitForFunction(() =>
      Array.from(document.images)
        .filter(
          (image) =>
            image.src.includes("/brand/") && image.getClientRects().length > 0,
        )
        .every((image) => image.complete && image.naturalWidth > 0),
    );
    assert.equal(
      await this.page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
      "No horizontal overflow",
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
    const page = await context.newPage();
    const journey = new BrandPage(page);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const output = path.join(__dirname, "../test-results/brand");
    await fs.mkdir(output, { recursive: true });
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      for (const theme of ["dark", "light"]) {
        await journey.open("/");
        const dark = await page.locator("html").getAttribute("class");
        if (dark.includes("dark") !== (theme === "dark")) await journey.theme();
        await journey.checkImages();
        await expect(page).toHaveTitle(/KarMatch/);
        await expect(
          page.getByRole("img", { name: /مهارت‌های تو، فرصت مناسب تو/ }),
        ).toBeVisible();
        await expect(
          page.locator('header img[src$="karmatch-wordmark.png"]'),
        ).toBeVisible({ visible: viewport.width >= 640 });
        await page.screenshot({
          path: path.join(output, `landing-${viewport.width}-${theme}.png`),
        });
        await journey.open("/login");
        await journey.checkImages();
        await expect(
          page.getByRole("img", { name: /مهارت‌های تو، فرصت مناسب تو/ }),
        ).toBeVisible();
        await page.screenshot({
          path: path.join(output, `login-${viewport.width}-${theme}.png`),
        });
        await journey.open("/jobs");
        await journey.checkImages();
        await expect(
          page.locator('aside img[src$="karmatch-wordmark.png"]'),
        ).toBeVisible({ visible: viewport.width >= 768 });
        await page.screenshot({
          path: path.join(output, `navigation-${viewport.width}-${theme}.png`),
        });
      }
    }
    const manifestResponse = await context.request.get(
      base + "/manifest.webmanifest",
    );
    assert.equal(manifestResponse.status(), 200);
    const manifest = await manifestResponse.json();
    assert.equal(manifest.short_name, "KarMatch");
    assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
    for (const src of [
      ...manifest.icons.map((icon) => icon.src),
      "/brand/karmatch-icon-32.png",
      "/brand/karmatch-icon-48.png",
      "/brand/karmatch-icon-180.png",
    ]) {
      const response = await context.request.get(base + src);
      assert.equal(response.status(), 200);
      assert.equal(
        (await response.body()).subarray(0, 8).toString("hex"),
        "89504e470d0a1a0a",
      );
    }
    // Failed image still exposes the full accessible brand/tagline.
    await page.route("**/brand/karmatch-vertical.png", (route) =>
      route.abort(),
    );
    await journey.open("/register");
    await expect(
      page.getByRole("img", { name: /KarMatch — مهارت‌های تو، فرصت مناسب تو/ }),
    ).toBeVisible();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: desktop/mobile light/dark branding, login, full tagline, no overflow, image-failure accessibility, favicon and manifest assets",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
