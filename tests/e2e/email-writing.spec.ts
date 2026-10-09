import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";

// The email writing page through the real server: the button waits for a
// real-length reply; a used-up allowance shows a plain sentence and never
// reaches the AI; a marked result is laid out well on a phone (that one
// result is supplied by the test, so no AI is called).
const password = "correct-horse-battery-staple";
const stamp = Date.now();
const reply =
  "Dear customer, I am very sorry for the trouble this has caused you. I have checked your account and I can confirm what will happen next and when. I have also added a note so this does not happen again. If you need anything else, please reply to this email. Kind regards, Ravi, Customer Care";

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: `e2e-email-${stamp}` } } });
});

test("waits for a real reply, and a used-up allowance is explained without calling the AI", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `e2e-email-${stamp}-limit@example.test`;
  const u = await createTestUser(email, password);
  for (let i = 0; i < PLAN_LIMITS.FREE.EMAIL_REVIEW; i++) await db.usageEvent.create({ data: { userId: u.id, feature: "EMAIL_REVIEW" } });
  await page.goto("/");
  await loginAs(page, email, password);
  await page.goto("/practice/email");
  await expect(page.getByRole("heading", { name: "Email writing" })).toBeVisible();

  const box = page.getByLabel("Your reply");
  const mark = page.getByRole("button", { name: "Mark my email" });
  await box.fill("Dear customer, sorry for the delay.");
  await expect(mark).toBeDisabled();
  await box.fill(reply);
  await expect(mark).toBeEnabled();
  await mark.click();
  await expect(page.getByText(/You've used all 2 AI email reviews included in your free sample/)).toBeVisible();
  expect(await db.emailReview.count({ where: { userId: u.id } })).toBe(0);
});

test("a marked email is laid out well on a phone", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const email = `e2e-email-${stamp}-result@example.test`;
  await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);
  await page.route("**/api/email-reviews", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const taskKey = (route.request().postDataJSON() as { taskKey: string }).taskKey;
    await route.fulfill({
      json: {
        review: {
          id: "r1",
          taskKey,
          wordCount: 52,
          score: 70,
          verdict: "Good, with a few fixes: work on the points below.",
          ratings: { tone: 4, structure: 4, grammar: 4, clarity: 3, resolution: 3 },
          strengths: ["A warm, polite apology."],
          fixes: ["Give the exact day and time instead of 'what will happen next'."],
          modelReply: "Dear Sunita,\n\nI am sorry your table is late.\n\nKind regards,\nRavi",
          createdAt: new Date().toISOString(),
        },
        remaining: 1,
      },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/practice/email");
  await page.getByLabel("Your reply").fill(reply);
  await page.getByRole("button", { name: "Mark my email" }).click();
  await expect(page.getByRole("heading", { name: "Your email: 70 / 100" })).toBeVisible();
  await expect(page.getByText("1 AI email review left on your plan.")).toBeVisible();
  await page.getByText("See a model reply").click();
  await expect(page.getByText("I am sorry your table is late.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "phone: no sideways scrolling").toBe(true);
  await page.waitForFunction(() => [...document.querySelectorAll(".cine-copy > *")].every((el) => getComputedStyle(el).opacity === "1"));
  await page.screenshot({ path: testInfo.outputPath("email-phone.png"), fullPage: true });
});
