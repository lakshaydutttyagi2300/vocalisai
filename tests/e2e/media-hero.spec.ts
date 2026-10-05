import { test, expect } from "@playwright/test";

// The shared page hero (src/components/ui/MediaHero.tsx, media set in
// src/config/heroMedia.ts), checked on the public Explore page: it rotates
// clips and stills with progress bars, pauses, shows only still pictures with
// reduced motion or on a phone, and never makes the page scroll sideways.
const TITLE = "Prepare for company assessments, interviews and workplace skills";

test("a page hero plays its first clip, moves on by itself and pauses", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/explore");
  const hero = page.getByRole("region", { name: "Page introduction" });
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText(TITLE, { timeout: 30_000 });
  await expect(hero.getByRole("button", { name: /^Show picture/ })).toHaveCount(3);

  // The first poster is requested eagerly; its clip loads after the page and plays silently.
  await expect(hero.locator("img").first()).toHaveAttribute("fetchpriority", "high");
  const first = hero.locator("video").first();
  await expect.poll(() => first.evaluate((v: HTMLVideoElement) => v.readyState >= 2 && !v.paused && v.muted), { timeout: 30_000 }).toBe(true);
  expect(await first.evaluate((v: HTMLVideoElement) => v.currentSrc)).toMatch(/-1280\.(webm|mp4)$/);

  // It moves on by itself.
  await expect(hero.getByRole("button", { name: "Show picture 2 of 3" })).toHaveAttribute("aria-current", "true", { timeout: 15_000 });

  // A chosen picture stays put while paused.
  await hero.getByRole("button", { name: "Show picture 3 of 3" }).click();
  await hero.getByRole("button", { name: "Pause hero media" }).click();
  await expect(hero.getByRole("button", { name: "Play hero media" })).toBeVisible();
  await page.mouse.move(5, 890); // off the hero, so only the Pause button holds it
  await page.waitForTimeout(8000);
  await expect(hero.getByRole("button", { name: "Show picture 3 of 3" })).toHaveAttribute("aria-current", "true");
  await expect.poll(() => hero.locator("video").evaluateAll((vs: HTMLVideoElement[]) => vs.every((v) => v.paused))).toBe(true);
  expect(errors).toEqual([]);
});

test("with reduced motion a page hero shows still pictures with arrows and never rotates", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto("/explore");
  const hero = page.getByRole("region", { name: "Page introduction" });
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText(TITLE, { timeout: 30_000 });
  await page.waitForLoadState("load");
  await expect(hero.getByRole("button", { name: "Pause hero media" })).toHaveCount(0);
  await hero.getByRole("button", { name: "Next picture" }).click();
  await expect(hero.getByRole("button", { name: "Show picture 2 of 3" })).toHaveAttribute("aria-current", "true");
  await page.waitForTimeout(8000);
  await expect(hero.getByRole("button", { name: "Show picture 2 of 3" })).toHaveAttribute("aria-current", "true");
  await expect(page.locator("video")).toHaveCount(0);
  await context.close();
});

test("on a phone a page hero uses still pictures only and fits the screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/explore");
  const hero = page.getByRole("region", { name: "Page introduction" });
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText(TITLE, { timeout: 30_000 });
  await page.waitForLoadState("load");
  await page.waitForTimeout(1500);
  await expect(hero.locator("video")).toHaveCount(0);
  expect(await hero.locator("img").first().evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/-640\.webp$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
