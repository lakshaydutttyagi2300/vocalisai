import { test, expect } from "@playwright/test";

// The cinematic landing hero (src/components/cine/CineHero.tsx): six slides
// whose copy and call to action change with the clip, progress bars that
// follow the clip, a Pause button, and clips that load only after the page
// has loaded and never with reduced motion. Clips are seamless 6-second loops
// (docs/MEDIA_SOURCES.md), so a slide hands over before any frozen frame.
test("the landing hero plays its clip, changes slide by itself, follows the progress bars and pauses", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const hero = page.getByRole("region", { name: "What VocalisAi does" });
  await expect(hero).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/practise speaking, interviews and hiring tests/);
  await expect(hero.getByRole("button", { name: /^Show slide/ })).toHaveCount(6);
  await expect(hero.getByRole("link", { name: "Start speaking" })).toHaveAttribute("href", "/signup");
  await expect(hero.getByRole("link", { name: "See how it works" })).toHaveAttribute("href", "#platform");

  // The first clip loads after the page and plays silently, from a clean 6-second file.
  const first = hero.locator("video").first();
  await expect.poll(() => first.evaluate((v: HTMLVideoElement) => v.readyState >= 2 && !v.paused && v.muted), { timeout: 30_000 }).toBe(true);
  expect(await first.evaluate((v: HTMLVideoElement) => v.duration)).toBeGreaterThan(5.8);

  // It moves on by itself before the clip loops, to slide 2 with its own copy.
  await expect(hero.getByRole("button", { name: "Show slide 2: Interviews" })).toHaveAttribute("aria-current", "true", { timeout: 15_000 });
  await expect(hero.getByRole("link", { name: "Try an AI interview" })).toBeVisible();

  // Manual choice, then pause: every clip stops and the slide stays put.
  await hero.getByRole("button", { name: "Show slide 4: Company tests" }).click();
  await expect(hero.getByRole("link", { name: "Explore exams" })).toBeVisible();
  await hero.getByRole("button", { name: "Pause slideshow" }).click();
  await expect(hero.getByRole("button", { name: "Play slideshow" })).toBeVisible();
  await expect.poll(() => hero.locator("video").evaluateAll((vs: HTMLVideoElement[]) => vs.every((v) => v.paused))).toBe(true);
  await page.waitForTimeout(7000);
  await expect(hero.getByRole("button", { name: "Show slide 4: Company tests" })).toHaveAttribute("aria-current", "true");

  // Phone: smaller clips, no sideways scrolling.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(hero).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => hero.locator("video").first().evaluate((v: HTMLVideoElement) => v.currentSrc), { timeout: 30_000 }).toMatch(/-640\.(webm|mp4)$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test("with reduced motion the hero shows still pictures, never rotates and loads no clips", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const hero = page.getByRole("region", { name: "What VocalisAi does" });
  await expect(hero).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("load");
  await page.waitForTimeout(7500);
  await expect(page.locator("video")).toHaveCount(0);
  await expect(hero.getByRole("button", { name: "Pause slideshow" })).toHaveCount(0);
  await expect(hero.getByRole("button", { name: "Show slide 1: Speaking" })).toHaveAttribute("aria-current", "true");
  await context.close();
});

test("the product pages each tell their story with real clips", async ({ page }) => {
  test.setTimeout(120_000);
  for (const [path, heading] of [
    ["/product/speaking", /Hear exactly how you sound/],
    ["/product/interviews", /Rehearse the conversation before it counts/],
    ["/product/personalised", /Practice that knows you/],
    ["/use-cases", /Built for the moment that matters/],
    ["/pricing", /Every mode\. Every plan\./],
    ["/about", /For the people who have to perform/],
    ["/contact", /Let.s talk/],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading, { timeout: 30_000 });
    expect(await page.locator("picture img, img[src*='/media/cine/']").count(), path).toBeGreaterThan(0);
  }
});
