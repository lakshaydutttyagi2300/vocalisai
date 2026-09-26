import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";

// Phase 4 through the real UI: the dashboard invites a goal, the candidate
// picks BPO / Customer Support, gets their plan, and the BPO exam opens
// from inside the track with that exam pre-selected.
const password = "correct-horse-battery-staple";
const SHOTS = process.env.E2E_SCREENSHOT_DIR;

test("choose a goal from the dashboard, see the plan, and start the goal's own exam", async ({ page }) => {
  test.setTimeout(150_000);
  const email = `e2e-goal-${Date.now()}@example.test`;
  const user = await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));

  try {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "What are you preparing for?" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("link", { name: /Choose my goal/ }).click();
    await expect(page).toHaveURL(/\/goal\/choose$/);

    const goals = page.getByRole("radiogroup", { name: "Choose your goal" });
    for (const name of ["General English", "BPO / Customer Support", "Interview Preparation"]) {
      await expect(goals.getByRole("radio", { name: new RegExp(name.replace("/", "\\/")) })).toBeVisible();
    }
    await expect(goals.getByRole("radio", { name: /Campus|Study Abroad/ })).toHaveCount(0); // hidden tracks
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/goal-choose.png`, fullPage: true });
    await goals.getByRole("radio", { name: /BPO \/ Customer Support/ }).click();
    await page.getByRole("button", { name: /Start my plan/ }).click();

    await expect(page).toHaveURL(/\/goal$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "BPO / Customer Support", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your next steps" })).toBeVisible();
    await expect(page.getByText("Not rated yet")).toBeVisible();
    const exam = page.getByRole("link", { name: /Workplace Communication Assessment/ });
    await expect(exam).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/goal-plan.png`, fullPage: true });

    // The dashboard now shows the goal.
    await page.goto("/dashboard");
    await expect(page.getByText("BPO / Customer Support").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: /Open my plan/ })).toBeVisible();

    // The BPO exam, from inside the track, opens with that test pre-selected.
    await page.goto("/goal");
    await page.getByRole("link", { name: /Workplace Communication Assessment/ }).click();
    await expect(page).toHaveURL(/\/mock-tests\?template=/);
    const chooser = page.getByRole("radiogroup", { name: "Choose a mock test" });
    await expect(chooser.getByRole("radio", { name: /Workplace Communication Assessment/ })).toHaveAttribute("aria-checked", "true", { timeout: 20_000 });
    await expect(chooser.getByRole("radio", { name: /General English Communication Assessment/ })).toContainText("For General English");

    // The old "Find my focus" page now leads to the plan.
    await page.goto("/practice/goals");
    await expect(page).toHaveURL(/\/goal$/);
    expect(errors).toEqual([]);
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});
