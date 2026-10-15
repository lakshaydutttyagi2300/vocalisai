import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";
import type { DeskTicket } from "@/lib/ticket-handling/desk";

// The support desk through the real server: start a shift, see the queue and
// tiles, put a ticket on hold and back, open a ticket and return, and see a
// resolved ticket and customer happiness - on a laptop and a phone. No AI is
// called: the resolved ticket is written straight to the database.
const password = "correct-horse-battery-staple";
const stamp = Date.now();

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: `e2e-desk-${stamp}` } } });
});

test("work a shift on the support desk, on a laptop and a phone", async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const browserErrors: string[] = [];
  page.on("pageerror", (e) => browserErrors.push(e.message));
  page.on("console", (m) => m.type() === "error" && browserErrors.push(m.text().slice(0, 300)));
  const email = `e2e-desk-${stamp}@example.test`;
  const u = await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/practice/tickets");

  await page.getByRole("button", { name: "Start my shift" }).click();
  const tiles = page.getByRole("list", { name: "Your queue at a glance" });
  // Server steps (several round trips to the remote test database) get their own wait.
  await expect(tiles.getByText("Waiting")).toBeVisible({ timeout: 30_000 });
  await expect(tiles).toContainText("5Waiting");
  await expect(page.getByRole("button", { name: "Open" })).toHaveCount(5);

  // Hold and resume the first ticket.
  await page.getByRole("button", { name: "Hold" }).first().click();
  await expect(tiles).toContainText("1On hold", { timeout: 30_000 });
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(tiles).toContainText("0On hold", { timeout: 30_000 });

  // Open a ticket, then go back without submitting.
  await page.getByRole("button", { name: "Open" }).first().click();
  await expect(page.getByLabel("Internal note for your colleagues")).toBeVisible();
  await page.getByRole("button", { name: "Back to the queue" }).click();
  await expect(page.getByRole("heading", { name: "Your queue" })).toBeVisible({ timeout: 30_000 });

  // Resolve one ticket as the marking would, then reload.
  const shift = await db.deskShift.findFirstOrThrow({ where: { userId: u.id, endedAt: null } });
  const tickets = JSON.parse(shift.ticketsJson) as DeskTicket[];
  const r = await db.ticketReview.create({
    data: { userId: u.id, ticketKey: tickets[0].key, category: "Delivery", priority: "High", reply: "x", note: "x", score: 85, feedbackJson: "{}" },
  });
  Object.assign(tickets[0], { status: "resolved", reviewId: r.id, score: 85, resolvedAt: new Date().toISOString() });
  await db.deskShift.update({ where: { id: shift.id }, data: { ticketsJson: JSON.stringify(tickets) } });

  for (const [name, size] of [["laptop", { width: 1280, height: 900 }], ["phone", { width: 390, height: 844 }]] as const) {
    await page.setViewportSize(size);
    await page.goto("/practice/tickets");
    await expect(tiles).toContainText("1Resolved", { timeout: 30_000 });
    await expect(page.getByText("Resolved on time · 85/100")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Customer happiness" })).toBeVisible();
    await expect(page.getByRole("img", { name: "100% happy, 0% neutral, 0% unhappy" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${name}: no sideways scrolling`).toBe(true);
    await page.waitForFunction(() => [...document.querySelectorAll(".cine-copy > *")].every((el) => getComputedStyle(el).opacity === "1"));
    await page.screenshot({ path: testInfo.outputPath(`desk-${name}.png`), fullPage: true });
  }
  expect(browserErrors, "no errors in the browser").toEqual([]);
});
