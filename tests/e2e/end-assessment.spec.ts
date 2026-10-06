import { test, expect, type Page } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";

// "End assessment" always does something: it leaves a test that was refused
// (plan allowance used up) and it ends and saves a running test, then shows
// its results.
test.use({
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
});

const password = "correct-horse-battery-staple";
const stamp = Date.now();

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: `e2e-end-${stamp}` } } });
});

async function enterExam(page: Page, tag: string, plan?: "STARTER") {
  const email = `e2e-end-${stamp}-${tag}@example.test`;
  const user = await createTestUser(email, password);
  if (plan) await setPlan(user.id, plan, { periodDays: 30 });
  await page.goto("/");
  await loginAs(page, email, password);
  await page.goto("/mock-tests");
  await page.getByRole("button", { name: "Begin system check" }).first().click();
  await page.getByRole("button", { name: "Enable camera" }).click();
  await page.getByRole("button", { name: "Enable microphone" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const toRules = page.getByRole("button", { name: "Continue to rules" });
  await expect(toRules).toBeEnabled({ timeout: 20_000 });
  await toRules.click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start test" }).click();
  return user;
}

test("a refused start (no allowance left) can be left with End assessment", async ({ page }) => {
  test.setTimeout(120_000);
  await enterExam(page, "refused"); // Free plan: 0 mock exams
  await expect(page.getByRole("alert").filter({ hasText: /aren't included|used all/ })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "End assessment" }).click();
  await expect(page).toHaveURL(/\/mock-tests$/, { timeout: 30_000 });
});

test("ending a running test saves it and shows its results", async ({ page }) => {
  test.setTimeout(120_000);
  const user = await enterExam(page, "running", "STARTER");
  await expect(page.getByRole("button", { name: "Start section" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "End assessment" }).click();
  await expect(page).toHaveURL(/\/(mock-tests|exam)\/results\//, { timeout: 30_000 });
  const session = await db.mockTestSession.findFirst({ where: { userId: user.id }, orderBy: { startedAt: "desc" } });
  expect(session?.endedAt).not.toBeNull();
});
