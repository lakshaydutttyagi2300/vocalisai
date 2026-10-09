import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";

// The chat simulation page through the real server: a chat starts with the
// customer's opening and carries on after a refresh. The customer's replies
// and the marking are supplied by the test (no AI is called) to check the
// whole chat and the result on a phone.
const password = "correct-horse-battery-staple";
const stamp = Date.now();

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: `e2e-chat-${stamp}` } } });
});

test("start a chat, carry on after a refresh, chat and see the result on a phone", async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const browserErrors: string[] = [];
  page.on("pageerror", (e) => browserErrors.push(e.message));
  page.on("console", (m) => m.type() === "error" && browserErrors.push(m.text().slice(0, 300)));
  const email = `e2e-chat-${stamp}@example.test`;
  const u = await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/practice/chat");

  await page.getByRole("button", { name: "Start a chat" }).click();
  await expect(page.getByText(/replies left/)).toBeVisible();
  await expect(page.getByRole("button", { name: "End chat and get my score" })).toBeDisabled();
  const stored = await db.chatSimulation.findFirstOrThrow({ where: { userId: u.id } });
  const opening = (JSON.parse(stored.turnsJson) as { text: string }[])[0].text;
  await expect(page.getByText(opening)).toBeVisible();

  await page.reload();
  await expect(page.getByText(opening)).toBeVisible(); // the same chat, not a new one
  expect(await db.chatSimulation.count({ where: { userId: u.id } })).toBe(1);

  // From here the customer and the marking are played by the test.
  const now = () => new Date().toISOString();
  const turns = [{ from: "customer", text: opening, at: stored.createdAt.toISOString() }];
  const view = (extra: object) => ({ id: stored.id, scenarioKey: stored.scenarioKey, status: "ACTIVE", turns, canEnd: true, customerSatisfied: false, finished: false, agentMessagesLeft: 5, score: null, replySeconds: null, verdict: null, feedback: null, createdAt: now(), ...extra });
  await page.route(`**/api/chat-simulations/${stored.id}/messages`, async (route) => {
    turns.push({ from: "agent", text: (route.request().postDataJSON() as { text: string }).text, at: now() });
    turns.push({ from: "customer", text: "Okay, that makes sense. Thank you so much!", at: now() });
    await route.fulfill({ json: { chat: view({ customerSatisfied: true }) } });
  });
  await page.route(`**/api/chat-simulations/${stored.id}/end`, (route) =>
    route.fulfill({
      json: {
        chat: view({
          status: "DONE",
          finished: true,
          score: 75,
          replySeconds: 42,
          verdict: "Good, with a few fixes: work on the points below.",
          feedback: { ratings: { tone: 4, grammar: 4, accuracy: 5, problemSolving: 4, closing: 2 }, strengths: ["Clear and correct."], fixes: ["Ask if there is anything else before closing."], betterLine: "Is there anything else I can help you with today?" },
        }),
      },
    })
  );

  const box = page.getByLabel("Your message");
  await box.fill("Hello! I am sorry for the trouble. Let me help you with this right away.");
  await box.press("Enter");
  await expect(page.getByText("Okay, that makes sense. Thank you so much!")).toBeVisible();
  await expect(box).toHaveAttribute("placeholder", /closing message/);
  await page.getByRole("button", { name: "End chat and get my score" }).click();
  await expect(page.getByRole("heading", { name: "Your chat: 75 / 100" })).toBeVisible();
  await expect(page.getByText("Average reply time: 42 seconds.")).toBeVisible();
  await expect(page.getByText("Is there anything else I can help you with today?")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "phone: no sideways scrolling").toBe(true);
  await page.waitForFunction(() => [...document.querySelectorAll(".cine-copy > *")].every((el) => getComputedStyle(el).opacity === "1"));
  await page.screenshot({ path: testInfo.outputPath("chat-phone.png"), fullPage: true });
  expect(browserErrors, "no errors in the browser").toEqual([]);
});
