import { test, expect } from "@playwright/test";

// The light landing hero: two clear actions and the career-moments slider.
// Clips play only after the page has loaded and never with reduced motion;
// the page never scrolls sideways on a phone.
test("the landing hero offers Start Practice and Explore Exams, and its slider plays, moves and pauses", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /Walk in prepared/ })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: "Start Practice" }).first()).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("link", { name: "Explore Exams" }).first()).toHaveAttribute("href", "/explore");

  const slider = page.getByRole("region", { name: "Career moments" });
  await expect(slider.getByRole("button", { name: /^Show slide/ })).toHaveCount(5);
  // Only the first poster and the next one are fetched up front.
  await expect(slider.locator("img")).toHaveCount(2);
  // The first clip loads after the page and plays, silently.
  await expect
    .poll(() => slider.locator("video").first().evaluate((v: HTMLVideoElement) => v.readyState >= 2 && !v.paused && v.muted), { timeout: 30_000 })
    .toBe(true);

  await slider.getByRole("button", { name: "Next slide" }).click();
  await expect(slider.getByRole("button", { name: "Show slide 2: Clear the aptitude round" })).toHaveAttribute("aria-current", "true");
  await expect(slider.getByText("Clear the aptitude round", { exact: true }).last()).toBeVisible();
  await slider.getByRole("button", { name: "Pause slideshow" }).click();
  await expect(slider.getByRole("button", { name: "Play slideshow" })).toBeVisible();
  await expect.poll(() => slider.locator("video").evaluateAll((vs: HTMLVideoElement[]) => vs.every((v) => v.paused))).toBe(true);
  await slider.getByRole("button", { name: "Show slide 5: Celebrate the offer" }).click();
  await expect(slider.getByRole("button", { name: "Show slide 5: Celebrate the offer" })).toHaveAttribute("aria-current", "true");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(slider).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test("with reduced motion the hero stays on still pictures and does not rotate", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const slider = page.getByRole("region", { name: "Career moments" });
  await expect(slider).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("load");
  await page.waitForTimeout(1500);
  await expect(slider.locator("video")).toHaveCount(0);
  await expect(slider.getByRole("button", { name: "Pause slideshow" })).toHaveCount(0);
  await expect(slider.getByRole("button", { name: /^Show slide 1:/ })).toHaveAttribute("aria-current", "true");
  await context.close();
});
