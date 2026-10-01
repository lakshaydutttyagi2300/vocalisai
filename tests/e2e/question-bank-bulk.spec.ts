import { test, expect } from "@playwright/test";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";

// Admin -> Question Bank: download everything for review (one Excel file,
// a sheet per category plus possible duplicates), find duplicates, select
// the extra copies and delete them; a used copy is archived, not deleted.
const password = "correct-horse-battery-staple";
const run = Date.now();
const tag = `bulk-e2e-${run}`;
const SHOTS = process.env.CATALOGUE_SHOTS;

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: `e2e-bulk-${run}@example.test` } }); // cascades its attempt
  await db.practiceQuestion.deleteMany({ where: { tags: { has: tag } } });
});

test("an admin downloads the bank for review, finds duplicates and bulk-deletes the extra copies", async ({ page }) => {
  test.setTimeout(300_000);
  const admin = await createTestUser(`e2e-bulk-${run}@example.test`, password, "Bulk Admin");
  await db.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  const ids: string[] = [];
  for (const [i, prompt] of [`Pick the synonym of HAPPY ${tag}`, `pick the  synonym of happy ${tag}`, `PICK THE SYNONYM OF HAPPY ${tag}`, `A unique question ${tag}`].entries()) {
    const q = await db.practiceQuestion.create({
      data: { category: "VOCABULARY", difficulty: "BEGINNER", type: "MULTIPLE_CHOICE", prompt, options: JSON.stringify(["Glad", "Sad"]), correctAnswer: "Glad", timeLimitSeconds: 45, tags: [tag], createdAt: new Date(Date.UTC(2026, 0, i + 1)) },
    });
    ids.push(q.id);
  }
  await db.practiceAttempt.create({ data: { userId: admin.id, questionId: ids[2], category: "VOCABULARY", difficulty: "BEGINNER", timeTakenSeconds: 5 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  try {
    await page.goto("/");
    await loginAs(page, admin.email, password);
    await page.goto("/admin/questions");
    await expect(page.getByRole("heading", { name: "Question Bank" })).toBeVisible({ timeout: 30_000 });

    // One Excel file: Summary, Possible duplicates, then a sheet per category.
    const link = page.getByRole("link", { name: "Download all for review (Excel)" });
    const res = await page.request.get((await link.getAttribute("href"))!);
    expect(res.headers()["content-type"]).toContain("spreadsheetml");
    const wb = XLSX.read(await res.body(), { type: "buffer" });
    expect(wb.SheetNames.slice(0, 2)).toEqual(["Summary", "Possible duplicates"]);
    expect(wb.SheetNames).toContain("Vocabulary");
    const dupes = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Possible duplicates"]).filter((r) => String(r.Question).includes(tag));
    expect(dupes.map((r) => r.ID)).toEqual(ids.slice(0, 3));

    // Duplicates only -> select the extra copies -> delete.
    await page.getByLabel("Search prompt").fill(tag);
    await page.getByRole("checkbox", { name: "Duplicates only" }).check();
    await expect(page.getByText("3 questions share their text with another. 2 of them are extra copies.")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Select the extra copies (keeps the oldest of each)" }).click();
    const bar = page.getByRole("region", { name: "Selected questions" });
    await expect(bar.getByText("2 selected")).toBeVisible();
    if (SHOTS) {
      for (const [label, width] of [["desktop", 1280], ["phone", 390]] as const) {
        await page.setViewportSize({ width, height: 900 });
        await page.screenshot({ path: `${SHOTS}/question-bank-bulk-${label}.png`, fullPage: true });
      }
      await page.setViewportSize({ width: 1280, height: 900 });
    }
    await bar.getByRole("button", { name: "Delete selected" }).click();
    await page.getByRole("alertdialog", { name: "Confirm delete" }).getByRole("button", { name: "Yes, delete 2" }).click();
    await expect(page.getByText("Deleted 1 question. 1 had already been used by candidates, so they were switched off and archived instead (their results are kept).")).toBeVisible({ timeout: 30_000 });
    expect(await db.practiceQuestion.findUnique({ where: { id: ids[1] } })).toBeNull();
    expect(await db.practiceQuestion.findUniqueOrThrow({ where: { id: ids[2] } })).toMatchObject({ isActive: false });
    expect(await db.practiceQuestion.findUnique({ where: { id: ids[0] } })).not.toBeNull(); // the oldest copy stays

    // Select all on the page -> delete with the box ticks; the archived one is gone from the list.
    await page.getByRole("checkbox", { name: "Duplicates only" }).uncheck();
    await expect(page.getByRole("checkbox", { name: /^Select: / })).toHaveCount(2, { timeout: 30_000 });
    await page.getByRole("checkbox", { name: "Select all on this page" }).check();
    await page.getByRole("region", { name: "Selected questions" }).getByRole("button", { name: "Delete selected" }).click();
    await page.getByRole("alertdialog", { name: "Confirm delete" }).getByRole("button", { name: "Yes, delete 2" }).click();
    await expect(page.getByText("Deleted 2 questions.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("No questions match these filters.")).toBeVisible({ timeout: 30_000 });
    expect(errors).toEqual([]);
  } finally {
    await db.user.delete({ where: { id: admin.id } });
  }
});
