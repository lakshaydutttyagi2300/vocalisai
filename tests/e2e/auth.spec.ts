import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { hashCode } from "@/lib/email-verification";

// A fresh email per run against the shared test branch, so re-running this
// spec never collides with a previous run's account. A real mail domain
// (gmail.com) because sign-up checks the domain can receive mail; nothing
// is ever sent - playwright.config.ts sets EMAIL_DELIVERY=log.
const runId = Date.now();
const email = `e2e-auth-${runId}@gmail.com`;
const password = "correct-horse-battery-staple";

// The emailed code never reaches the browser or the database in plain form,
// so the test gives the waiting sign-up a code it knows (same secret as the
// server, from .env.test).
async function setKnownCode(address: string, code: string) {
  await expect.poll(async () => db.emailVerification.count({ where: { email: address } }), { timeout: 15_000 }).toBe(1);
  await db.emailVerification.update({ where: { email: address }, data: { codeHash: hashCode(address, code) } });
}

test("signup emails a code, creates the account only after the right code, logs in and asks for a goal", async ({ page }) => {
  await page.goto("/signup");
  await page.locator("#name").fill("E2E Test Candidate");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2: the code screen. No account exists yet.
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByRole("button", { name: /Resend code in \d+s/ })).toBeDisabled();
  expect(await db.user.findUnique({ where: { email } })).toBeNull();
  await page.screenshot({ path: "test-results/signup/code-step.png", fullPage: true });

  await setKnownCode(email, "246810");
  await page.locator("#code").fill("135790");
  await page.getByRole("button", { name: "Verify and create account" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("That code isn't right. 4 tries left.");
  expect(await db.user.findUnique({ where: { email } })).toBeNull();

  await page.locator("#code").fill("246810");
  await page.getByRole("button", { name: "Verify and create account" }).click();

  // New accounts start by choosing what they are preparing for.
  await expect(page).toHaveURL(/\/goal\/choose\?welcome=1/, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: /Welcome, E2E! What are you preparing for\?/ })).toBeVisible();
  expect(await db.user.findUnique({ where: { email } })).not.toBeNull();
  await page.getByRole("link", { name: "Skip for now" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
});

test("an email that can't receive mail, or one already registered, never gets a code", async ({ page }) => {
  await page.goto("/signup");
  await page.locator("#name").fill("E2E Test Candidate");
  await page.locator("#email").fill(`someone-${runId}@no-such-domain-${runId}.invalid`);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("can't receive mail");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

  await page.locator("#email").fill(email); // registered by the test above
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("already exists");
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
