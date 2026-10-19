import { test, expect, type Page } from "@playwright/test";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";

// The picture writing test through the real server: the 2-minute clock, the
// word counter and Submit, the automatic send at 0:00, nothing sent when the
// text is too short, and the result laid out on a laptop and a phone. The
// marking itself is supplied by the test, so no AI is called.
const password = "correct-horse-battery-staple";
const stamp = Date.now();
const text =
  "Two colleagues are standing at a counter. One of them is a customer who is paying with a card, and the staff member is smiling and helping her. It looks like a busy morning and next she will probably get her order and leave happily.";

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: `e2e-picture-${stamp}` } } });
});

async function signIn(page: Page, name: string) {
  const email = `e2e-picture-${stamp}-${name}@example.test`;
  await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);
}

/** Answers POST /api/picture-reviews with a fixed marking and records what was sent. */
async function fakeMarking(page: Page) {
  const sent: { promptKey: string; attemptKey: string; response: string; timedOut: boolean }[] = [];
  await page.route("**/api/picture-reviews", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = route.request().postDataJSON();
    sent.push(body);
    await route.fulfill({
      json: {
        review: {
          id: `r${sent.length}`,
          promptKey: body.promptKey,
          response: body.response,
          wordCount: body.response.trim().split(/\s+/).length,
          timedOut: body.timedOut,
          score: 70,
          verdict: "Good, with a few fixes: work on the points below.",
          ratings: { clarity: 4, grammar: 4, interpretation: 4, detail: 3, professionalism: 4 },
          strengths: ["A clear, logical description."],
          fixes: ["Mention more of what you can see, such as the setting."],
          missedDetails: ["the setting", "their expressions"],
          modelAnswer: "In a bright workplace, two people are dealing with a task together. One explains while the other listens, and next they will agree what to do.",
          createdAt: new Date().toISOString(),
        },
        remaining: 1,
      },
    });
  });
  return sent;
}

test("describe a photo, submit, and see the feedback on a laptop and a phone", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const browserErrors: string[] = [];
  page.on("pageerror", (e) => browserErrors.push(e.message));
  page.on("console", (m) => m.type() === "error" && browserErrors.push(m.text().slice(0, 300)));
  await signIn(page, "result");
  const sent = await fakeMarking(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/practice/picture-writing");

  await page.getByRole("button", { name: "Start test" }).click();
  const photo = page.locator("img[src*='/media/picture-test/']");
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText("Study the image carefully and describe what is happening.")).toBeVisible();
  await expect(page.getByRole("group", { name: "Time left" })).toContainText(/[12]:\d\d/);

  const submit = page.getByRole("button", { name: "Submit for marking" });
  const box = page.getByLabel("Your description");
  await box.fill("Two people talking.");
  await expect(page.getByText("3 words (at least 20)")).toBeVisible();
  await expect(submit).toBeDisabled();
  await box.fill(text);
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page.getByRole("heading", { name: "Your description: 70 / 100" })).toBeVisible();
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ response: text, timedOut: false });
  await expect(page.getByText("Attention to visual details")).toBeVisible();
  await expect(page.getByText("Details you could have mentioned")).toBeVisible();
  await expect(page.getByText(text)).toBeVisible();

  for (const [name, size] of [["laptop", { width: 1280, height: 900 }], ["phone", { width: 390, height: 844 }]] as const) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${name}: no sideways scrolling`).toBe(true);
    await page.waitForFunction(() => [...document.querySelectorAll(".cine-copy > *")].every((el) => getComputedStyle(el).opacity === "1"));
    await page.screenshot({ path: testInfo.outputPath(`picture-result-${name}.png`), fullPage: true });
  }

  // The writing screen on a phone.
  await page.getByRole("button", { name: "Try another photo" }).click();
  await expect(page.getByLabel("Your description")).toBeVisible();
  await expect(page.getByRole("group", { name: "Time left" }), "a new photo starts in view, not under the page header").toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "phone writing screen: no sideways scrolling").toBe(true);
  await page.screenshot({ path: testInfo.outputPath("picture-writing-phone.png"), fullPage: true });
  expect(browserErrors, "no errors in the browser").toEqual([]);
});

test("at 0:00 the text is sent automatically; a too-short text is not sent", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, "timer");
  const sent = await fakeMarking(page);
  await page.clock.install();
  await page.goto("/practice/picture-writing");

  // Too short when time runs out: locked, nothing sent, no review used.
  await page.getByRole("button", { name: "Start test" }).click();
  await page.getByLabel("Your description").fill("Two people at work.");
  await page.clock.fastForward("02:01");
  await expect(page.getByText(/Time's up\. You wrote 4 words/)).toBeVisible();
  await expect(page.getByLabel("Your description")).toHaveAttribute("readonly", "");
  expect(sent).toHaveLength(0);

  // Long enough: sent by itself at 0:00, marked as timed out.
  await page.getByRole("button", { name: "Try another photo" }).click();
  await page.getByLabel("Your description").fill(text);
  await page.clock.fastForward("02:01");
  await expect(page.getByRole("heading", { name: "Your description: 70 / 100" })).toBeVisible();
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ response: text, timedOut: true });
  await expect(page.getByText("sent when time ran out")).toBeVisible();
});
