import { test, expect, type Page } from "@playwright/test";
import { setPlan } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";
import { setUpExamV2Env, type ExamV2Env } from "./exam-v2-setup";

// Drives the REAL candidate flow in a browser - /mock-tests intro, system
// check, rules, the proctored shell - using Chromium's fake camera and
// microphone, and checks the new exam screen end to end: answering,
// autosave, resume after a full page reload, free navigation + review,
// section submit, forward-only section, results page.
test.use({
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
  permissions: ["camera", "microphone"],
});

const password = "correct-horse-battery-staple";
let env: ExamV2Env;

test.beforeAll(async () => {
  env = await setUpExamV2Env("ui");
  await env.setFlag(true);
});

test.afterAll(async () => {
  await env.restore();
});

async function throughSystemCheckAndRules(page: Page) {
  await page.goto("/mock-tests");
  await page.getByRole("button", { name: "Begin system check" }).click();
  await page.getByRole("button", { name: "Enable camera" }).click();
  await page.getByRole("button", { name: "Enable microphone" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const toRules = page.getByRole("button", { name: "Continue to rules" });
  await expect(toRules).toBeEnabled({ timeout: 20_000 });
  await toRules.click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start test" }).click();
}

// Answers whichever Reading-paper question is currently shown.
async function answerCurrentReadingQuestion(page: Page) {
  const card = page.locator("div.rounded-lg.bg-white").first();
  if (await card.getByRole("radio", { name: "True" }).isVisible()) {
    await card.getByRole("radio", { name: "True" }).click();
  } else if (await card.getByRole("radio", { name: "Coffee" }).isVisible()) {
    await card.getByRole("radio", { name: "Coffee" }).click();
  } else {
    await card.getByRole("textbox").first().fill("an");
  }
}

test("a candidate takes a v2 exam through the real proctored flow, including resume after reload", async ({ page }) => {
  test.setTimeout(300_000);

  const email = `e2e-v2-ui-${Date.now()}@example.test`;
  const user = await createTestUser(email, password);
  await setPlan(user.id, "STARTER", { periodDays: 30 });
  await page.goto("/");
  await loginAs(page, email, password);

  await throughSystemCheckAndRules(page);

  // New exam screen, not the old runner.
  await expect(page.getByRole("heading", { name: "Reading" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Section 1 of 2")).toBeVisible();
  await expect(page.getByText("0 of 3 answered")).toBeVisible();

  // Answer all three using the numbered navigation.
  for (let i = 1; i <= 3; i++) {
    await page.getByRole("button", { name: new RegExp(`^Question ${i}\\b`) }).click();
    await answerCurrentReadingQuestion(page);
  }
  await expect(page.getByText("3 of 3 answered")).toBeVisible();
  await expect(page.getByText("All changes saved")).toBeVisible({ timeout: 15_000 });

  // Full reload: back through the entry flow, and the SAME exam resumes
  // with every answer still there (no new session created).
  await page.reload();
  await throughSystemCheckAndRules(page);
  await expect(page.getByRole("heading", { name: "Reading" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("3 of 3 answered")).toBeVisible();

  // Review screen lists every question as answered.
  await page.getByRole("button", { name: "Review answers" }).click();
  await expect(page.getByRole("heading", { name: "Review your answers" })).toBeVisible();
  await expect(page.getByText("Answered", { exact: true })).toHaveCount(3);
  await page.getByRole("button", { name: "Back to questions" }).click();

  // Submit section 1 (with confirmation).
  await page.getByRole("button", { name: "Submit section" }).click();
  await page.getByRole("button", { name: "Yes, submit section" }).click();

  // Section 2 is forward-only.
  await expect(page.getByRole("heading", { name: "Speaking" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Question 1 of 2 - answers can't be changed/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous" })).toHaveCount(0);

  // Each forward step is several real round-trips to the remote test
  // database (save + advance + fresh state), so allow for that latency.
  const answerSpeakingQuestion = async () => {
    const card = page.locator("div.rounded-lg.bg-white").first();
    if (await card.getByRole("spinbutton").isVisible()) await card.getByRole("spinbutton").fill("7");
    else await card.getByRole("textbox").fill("A small coastal town.");
  };
  await answerSpeakingQuestion();
  await page.getByRole("button", { name: "Next question" }).click();
  await expect(page.getByText(/Question 2 of 2/)).toBeVisible({ timeout: 30_000 });
  await answerSpeakingQuestion();

  await page.getByRole("button", { name: "Submit section" }).click();
  await page.getByRole("button", { name: "Yes, submit section" }).click();

  // Finished -> the v2 results page.
  await expect(page).toHaveURL(/\/exam\/results\//, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible();
  await expect(page.getByText("Correct (auto-marked)").first()).toBeVisible();
});
