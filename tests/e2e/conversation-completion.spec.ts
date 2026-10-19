import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";

// The conversation completion test through the real server, on a phone: the
// rules and levels, a timed test of short conversations with A-D replies,
// no answer shown before submitting, then the score with explanations.
// Uses the "conversation-completion" questions loaded on the test branch.
const password = "correct-horse-battery-staple";
const stamp = Date.now();

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: `e2e-convo-${stamp}` } } });
});

test("take a conversation completion test and see the score at the end", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const browserErrors: string[] = [];
  page.on("pageerror", (e) => browserErrors.push(e.message));
  page.on("console", (m) => m.type() === "error" && browserErrors.push(m.text().slice(0, 300)));
  const email = `e2e-convo-${stamp}@example.test`;
  await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/practice/conversation-completion");
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await page.getByRole("radio", { name: "Beginner" }).check();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "intro: no sideways scrolling").toBe(true);
  await page.screenshot({ path: testInfo.outputPath("convo-intro-phone.png"), fullPage: true });
  await page.getByRole("button", { name: "Start test" }).click();
  await expect(page).toHaveURL(/\/practice-tests\//, { timeout: 30_000 });

  // A conversation, the reply question, four lettered replies; nothing revealed on saving.
  await expect(page.getByText(/^Situation: /)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /What is the most appropriate reply from/ })).toBeVisible();
  const choices = page.getByRole("radiogroup").getByRole("radio");
  await expect(choices).toHaveCount(4);
  for (const [i, letter] of ["A.", "B.", "C.", "D."].entries()) await expect(choices.nth(i)).toContainText(letter);
  await page.screenshot({ path: testInfo.outputPath("convo-question-phone.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "question: no sideways scrolling").toBe(true);

  const total = await page.getByRole("navigation", { name: "Questions" }).getByRole("button").count();
  expect(total).toBe(10);
  for (let i = 0; i < total; i++) {
    await choices.first().click();
    await page.getByRole("button", { name: /Save answer/ }).click();
    await expect(page.getByRole("button", { name: `Question ${i + 1}, answered` })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/^(Correct\.|Not quite\.)/)).toHaveCount(0);
    // A timed test moves to the next question by itself after saving.
    if (i < total - 1) await expect(page.getByText(`Question ${i + 2} of ${total}`)).toBeVisible();
  }

  await page.getByRole("button", { name: "Submit test" }).click();
  await page.getByRole("alertdialog", { name: "Submit test" }).getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Score")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Conversation Completion");
  const test10 = await db.practiceTest.findFirstOrThrow({ where: { user: { email } }, orderBy: { startedAt: "desc" } });
  expect(test10).toMatchObject({ status: "SUBMITTED", totalCount: 10, answeredCount: 10, timed: true });
  await page.screenshot({ path: testInfo.outputPath("convo-results-phone.png"), fullPage: true });
  expect(browserErrors, "no errors in the browser").toEqual([]);
});
