import { test, expect, type Page } from "@playwright/test";
import { createTestUser, loginAs } from "./helpers";

// Skills platform, Phase 2, through the real UI: the My Skills dashboard,
// a Quick Drill with instant feedback, the "I'm weak in..." diagnostic
// with recommended drills, and the new entry points (nav, library, quick).
const password = "correct-horse-battery-staple";
const SHOTS = process.env.E2E_SCREENSHOT_DIR;

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function answerAll(page: Page) {
  // Pick the first option each time; the button text changes on the last question.
  for (let i = 0; i < 12; i++) {
    const options = page.getByRole("radio");
    await expect(options.first()).toBeVisible({ timeout: 30_000 });
    await options.first().click();
    await page.getByRole("button", { name: /Check answer/ }).click();
    await expect(page.getByText(/^(Correct!|Not quite)/)).toBeVisible({ timeout: 30_000 });
    if (i === 0) await shot(page, "drill-feedback");
    const next = page.getByRole("button", { name: /Next question|See results/ });
    const done = (await next.textContent())?.includes("See results");
    await next.click();
    if (done) return;
  }
}

test.beforeEach(async ({ page }, testInfo) => {
  const email = `e2e-skills-${Date.now()}-${testInfo.testId}@example.test`;
  await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);
});

test("My Skills dashboard, a quick drill, and the updated score", async ({ page }) => {
  await page.goto("/skills");
  await expect(page.getByRole("heading", { name: "My Skills" })).toBeVisible();
  for (const name of ["Numerical Aptitude", "Logical Reasoning", "Verbal Reasoning"]) {
    await expect(page.getByRole("link", { name, exact: true }).first()).toBeVisible();
  }
  await shot(page, "skills-empty");

  await page.goto("/skills/drill/QNT.COM.PERCENT");
  await expect(page.getByRole("heading", { name: /Percentages - Quick Drill/ })).toBeVisible();
  await page.getByRole("button", { name: "Start drill" }).click();
  await expect(page.getByText(/Question 1 of \d+/)).toBeVisible({ timeout: 30_000 }); // first hit compiles the route in dev
  await shot(page, "drill-question");
  await answerAll(page);
  await expect(page.getByRole("heading", { name: "Drill complete" })).toBeVisible();
  await shot(page, "drill-summary");

  // The dashboard now has a score for the category the drill belonged to.
  await page.goto("/skills");
  const numerical = page.locator("section", { has: page.getByRole("heading", { name: "Numerical Aptitude", exact: true }) });
  await expect(numerical.getByText(/answers? counted/)).toBeVisible();
  await expect(numerical.getByText(/Weak|Developing|Proficient|Mastered/).first()).toBeVisible();
  await shot(page, "skills-after-drill");
});

test("'I'm weak in' diagnostic ends with results and recommended drills", async ({ page }) => {
  await page.goto("/skills");
  await page.getByRole("link", { name: "Logical Reasoning", exact: true }).first().click();
  await expect(page).toHaveURL(/\/skills\/diagnostic\/rea$/);
  await page.getByRole("button", { name: "Start check" }).click();
  await answerAll(page);
  await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recommended drills" })).toBeVisible();
  await shot(page, "diagnostic-results");
});

test("new entry points: Practice menu, Practice library and Quick practice", async ({ page }) => {
  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "Aptitude & Reasoning" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Numerical Aptitude/ })).toBeVisible();

  await page.goto("/practice/quick");
  await expect(page.getByRole("heading", { name: "Quick Skill Drills" })).toBeVisible();
  await page.getByRole("link", { name: /Numerical Aptitude Drill/ }).click();
  await expect(page).toHaveURL(/\/skills\/drill\/QNT$/);

  // Speaking-type categories send the candidate to recorded practice instead.
  await page.goto("/skills/diagnostic/spk");
  await page.getByRole("button", { name: "Start check" }).click();
  await expect(page.getByRole("link", { name: /Go to Speaking practice/ })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/skills");
  // Nothing may stick out past the right edge (a clipped overflow wouldn't show in scrollWidth).
  const overflow = await page.evaluate(() => Math.max(...[...document.querySelectorAll("main *")].map((e) => e.getBoundingClientRect().right)) - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await shot(page, "skills-mobile");
});
