import { test, expect } from "@playwright/test";

// A fresh email per run against the shared test branch, so re-running this
// spec never collides with a previous run's account.
const runId = Date.now();
const email = `e2e-auth-${runId}@example.test`;
const password = "correct-horse-battery-staple";

test("signup creates an account, logs in automatically, and lands on the dashboard", async ({ page }) => {
  await page.goto("/signup");
  await page.locator("#name").fill("E2E Test Candidate");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
});

test("logging out then back in with the same credentials returns to the dashboard", async ({ page }) => {
  // Re-uses the account created by the signup test above (specs in this
  // file run in order within one worker - fullyParallel is off).
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
});

test("logging in with the wrong password is rejected with an error, not a redirect", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("definitely-the-wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText("Incorrect email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
