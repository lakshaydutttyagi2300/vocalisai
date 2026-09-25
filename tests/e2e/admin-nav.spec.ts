import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";

// The admin bar groups its pages under dropdowns so it stays on one line
// (it wrapped onto two once Exams and Item Groups were added). Checks the
// layout at a common laptop width, that every admin page is reachable,
// and that the phone menu exists. Screenshots go to test-results/ for a
// visual check.
const password = "correct-horse-battery-staple";

test("admin navigation fits on one line, groups pages into menus, and works on a phone", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `e2e-admin-nav-${Date.now()}@example.test`;
  const user = await createTestUser(email, password);
  await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  await page.goto("/");
  await loginAs(page, email, password);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/admin");
  const nav = page.getByRole("navigation", { name: "Admin" });
  await expect(nav).toBeVisible();

  // One line: every top-level item has the height of a single text line.
  for (const name of ["Overview", "Candidates", "Activity Log"]) {
    const box = (await nav.getByRole("link", { name, exact: true }).boundingBox())!;
    expect(box.height, name).toBeLessThan(32);
  }
  for (const name of ["Content", "Settings"]) {
    expect((await nav.getByRole("button", { name }).boundingBox())!.height, name).toBeLessThan(32);
  }
  const header = (await page.locator("header").boundingBox())!;
  expect(header.height).toBeLessThan(80);
  await page.screenshot({ path: "test-results/admin-nav/bar.png", clip: { x: 0, y: 0, width: 1280, height: 90 } });

  // Content menu: the four content pages, and it navigates.
  await nav.getByRole("button", { name: "Content" }).click();
  for (const name of ["Questions", "Item groups", "Exams", "Templates"]) {
    await expect(nav.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
  }
  await page.screenshot({ path: "test-results/admin-nav/content-open.png", clip: { x: 0, y: 0, width: 1280, height: 400 } });
  await nav.getByRole("link", { name: /^Exams/ }).click();
  await expect(page).toHaveURL(/\/admin\/exams$/);
  // The group is marked active while one of its pages is open; the menu closed.
  await expect(nav.getByRole("button", { name: "Content" })).toHaveClass(/text-amber-500/);
  await expect(nav.getByRole("link", { name: /^Questions/ })).toHaveCount(0);

  // Settings menu, closes on Escape.
  await nav.getByRole("button", { name: "Settings" }).click();
  await expect(nav.getByRole("link", { name: /^Features/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(nav.getByRole("link", { name: /^Features/ })).toHaveCount(0);

  // Phone: the bar collapses to a menu button listing every page.
  await page.setViewportSize({ width: 390, height: 800 });
  await page.getByRole("button", { name: "Toggle menu" }).click();
  const mobile = page.getByRole("navigation", { name: "Admin" });
  for (const name of ["Overview", "Candidates", "Questions", "Item groups", "Exams", "Templates", "Features", "Scoring", "Activity Log", "Candidate view"]) {
    await expect(mobile.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await page.screenshot({ path: "test-results/admin-nav/phone.png" });
});
