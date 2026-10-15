import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";

// Handling one ticket from the support desk through the real server: the submit button waits
// for every part; a used-up allowance shows a plain sentence and never
// reaches the AI; a marked result is laid out well on a phone (that one
// result is supplied by the test, so no AI is called).
const password = "correct-horse-battery-staple";
const stamp = Date.now();
const reply =
  "Dear customer, thank you for contacting us and I am sorry for the trouble. I have checked your account and I have taken the next step for you. You will hear from us again within one working day. Kind regards, Support Team";
const note = "Checked the account, explained the next step to the customer and set a follow-up for tomorrow.";

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: `e2e-ticket-${stamp}` } } });
});

// The tickets page is the support desk: start a shift and open the first ticket.
async function openTicket(page: import("@playwright/test").Page) {
  await page.goto("/practice/tickets");
  await page.getByRole("button", { name: "Start my shift" }).click();
  await page.getByRole("button", { name: "Open" }).first().click({ timeout: 30_000 });
}

async function fill(page: import("@playwright/test").Page) {
  await page.getByLabel("Category").selectOption("Complaint");
  await page.getByLabel("Priority").selectOption("High");
  await page.getByLabel("Reply to the customer").fill(reply);
}

test("waits for every part, and a used-up allowance is explained without calling the AI", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `e2e-ticket-${stamp}-limit@example.test`;
  const u = await createTestUser(email, password);
  for (let i = 0; i < PLAN_LIMITS.FREE.TICKET_REVIEW; i++) await db.usageEvent.create({ data: { userId: u.id, feature: "TICKET_REVIEW" } });
  await page.goto("/");
  await loginAs(page, email, password);
  await openTicket(page);
  const submit = page.getByRole("button", { name: "Submit ticket for marking" });
  await fill(page);
  await expect(submit).toBeDisabled(); // no internal note yet
  await page.getByLabel("Internal note for your colleagues").fill(note);
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText(/You've used all 2 AI ticket reviews included in your free sample/)).toBeVisible();
  expect(await db.ticketReview.count({ where: { userId: u.id } })).toBe(0);
});

test("a marked ticket is laid out well on a phone", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const browserErrors: string[] = [];
  page.on("pageerror", (e) => browserErrors.push(e.message));
  page.on("console", (m) => m.type() === "error" && browserErrors.push(m.text().slice(0, 300)));
  const email = `e2e-ticket-${stamp}-result@example.test`;
  await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);
  await page.route("**/api/ticket-reviews", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const sent = route.request().postDataJSON() as { ticketKey: string; category: string; priority: string };
    await route.fulfill({
      json: {
        review: {
          id: "t1",
          ticketKey: sent.ticketKey,
          category: sent.category,
          priority: sent.priority,
          score: 65,
          verdict: "Good, with a few fixes: work on the points below.",
          ratings: { category: 3, priority: 3, reply: 4, note: 4, accuracy: 4 },
          bestCategory: "Technical issue",
          bestPriority: "Urgent",
          priorityReason: "She has a client call today and cannot work.",
          strengths: ["A polite, clear reply."],
          fixes: ["Offer the 4G dongle and give the expected fix time."],
          modelNote: "Area fault, fix expected 1 pm. Offered 4G dongle by courier within 3 hours.",
          createdAt: new Date().toISOString(),
        },
        remaining: 1,
      },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openTicket(page);
  await fill(page);
  await page.getByLabel("Internal note for your colleagues").fill(note);
  await page.getByRole("button", { name: "Submit ticket for marking" }).click();
  await expect(page.getByRole("heading", { name: "Your ticket: 65 / 100" })).toBeVisible();
  await expect(page.getByText(/You chose High; should be Urgent/)).toBeVisible();
  await expect(page.getByText("1 AI ticket review left on your plan.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "phone: no sideways scrolling").toBe(true);
  await page.waitForFunction(() => [...document.querySelectorAll(".cine-copy > *")].every((el) => getComputedStyle(el).opacity === "1"));
  await page.screenshot({ path: testInfo.outputPath("ticket-phone.png"), fullPage: true });
  expect(browserErrors, "no errors in the browser").toEqual([]);
});
