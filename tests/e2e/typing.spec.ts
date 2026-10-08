import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";

// The typing test through the real server: type part of a passage, finish,
// and the server-scored result is shown, saved, listed and counted in the
// readiness score. Pasting is blocked; the page fits a phone.
const password = "correct-horse-battery-staple";
const stamp = Date.now();

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: `e2e-typing-${stamp}` } } });
});

test("type, finish, and see a saved result that counts towards readiness", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const email = `e2e-typing-${stamp}@example.test`;
  const u = await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/practice/typing");
  await expect(page.getByRole("heading", { name: "Typing test" })).toBeVisible();

  const box = page.getByLabel(/Type the text above here/);
  await box.focus();
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData("text/plain", "pasted text");
    document.querySelector("#typing-box")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(box).toHaveValue(""); // pasting does nothing

  const text = (await page.getByLabel("Text to type").textContent())!.trim();
  const first = text.split(/\s+/).slice(0, 12).join(" ");
  await box.pressSequentially(first + " ", { delay: 10 });
  await page.screenshot({ path: testInfo.outputPath("typing-phone-running.png") });
  await expect(page.getByText("left", { exact: false }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "phone: no sideways scrolling").toBe(true);
  await page.getByRole("button", { name: "Finish now" }).click();

  await expect(page.getByRole("heading", { name: "Your result" })).toBeVisible();
  await expect(page.getByText("Finished")).toBeVisible();
  await expect(page.getByText("100%").first()).toBeVisible(); // every typed word right
  await expect(page.getByRole("heading", { name: "Your recent tests" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("typing-phone.png"), fullPage: true });
  const saved = await db.typingResult.findMany({ where: { userId: u.id } });
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ typedWords: 12, correctWords: 12, accuracy: 100 });
  await expect(page.getByText(`Speed ${saved[0].netWpm} words/min`)).toBeVisible(); // the saved figure, not a frozen live one

  await page.goto("/readiness");
  await expect(page.getByText("From your last typing test")).toBeVisible();
});
