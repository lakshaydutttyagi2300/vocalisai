import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { checkAndRecordUsage, setPlan } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";

// Admin tools: reset a user's usage limits, and change the admin's own
// sign-in email (username).
const password = "correct-horse-battery-staple";
const stamp = Date.now();

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { contains: `e2e-admintools-${stamp}` } } });
});

test("an admin resets a candidate's used-up limits and changes their own sign-in email", async ({ page }) => {
  test.setTimeout(180_000);
  const adminEmail = `e2e-admintools-${stamp}-admin@example.test`;
  const admin = await createTestUser(adminEmail, password);
  await db.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  const candidate = await createTestUser(`e2e-admintools-${stamp}-cand@example.test`, password);
  await setPlan(candidate.id, "STARTER", { periodDays: 30 });
  await checkAndRecordUsage(candidate.id, "MOCK_ASSESSMENT");
  await checkAndRecordUsage(candidate.id, "MOCK_ASSESSMENT");
  expect((await checkAndRecordUsage(candidate.id, "MOCK_ASSESSMENT")).allowed).toBe(false); // 2 of 2 used

  await page.goto("/");
  await loginAs(page, adminEmail, password);

  // Reset limits.
  await page.goto(`/admin/candidates/${candidate.id}`);
  await page.getByRole("button", { name: "Reset usage limits" }).click();
  await page.getByRole("button", { name: "Yes, reset limits" }).click();
  await expect(page.getByText("Limits reset")).toBeVisible({ timeout: 30_000 });
  expect((await checkAndRecordUsage(candidate.id, "MOCK_ASSESSMENT")).allowed).toBe(true);

  // Change the sign-in email, then sign in with it.
  const newEmail = `e2e-admintools-${stamp}-renamed@example.test`;
  await page.goto("/admin/password");
  await page.getByLabel("New sign-in email").fill(newEmail);
  await page.locator("form").first().getByLabel("Current password").fill(password);
  await page.getByRole("button", { name: "Change sign-in email" }).click();
  await expect(page.getByText(`Sign-in email changed to ${newEmail}`)).toBeVisible({ timeout: 30_000 });
  expect((await db.user.findUnique({ where: { id: admin.id } }))?.email).toBe(newEmail);

  await page.context().clearCookies();
  await page.goto("/");
  await loginAs(page, newEmail, password);
});
