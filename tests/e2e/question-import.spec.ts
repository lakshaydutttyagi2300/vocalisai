import { test, expect, type Page } from "@playwright/test";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";

// Admin -> Question Bank -> import from a file, end to end: the button opens
// the file picker; CSV (written the way people write it), XLSX and JSON all
// land in the bank; bad files get a plain explanation. Imported questions
// are removed afterwards.
const password = "correct-horse-battery-staple";
const run = Date.now();
const tag = `(import e2e ${run})`;

async function upload(page: Page, name: string, mimeType: string, buffer: Buffer) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose a file to import" }).click();
  await (await chooser).setFiles({ name, mimeType, buffer });
}

async function validateAndImport(page: Page, expected: number) {
  await page.getByRole("button", { name: /Step 2: Validate/ }).click();
  const step4 = page.getByRole("button", { name: new RegExp(`Step 4: Import ${expected} question`) });
  await expect(step4).toBeVisible({ timeout: 60_000 });
  await step4.click();
  await expect(page.getByText(new RegExp(`Done. Imported ${expected} question`))).toBeVisible({ timeout: 60_000 });
}

test.afterAll(async () => {
  await db.practiceQuestion.deleteMany({ where: { prompt: { contains: tag } } });
});

test("an admin imports CSV, XLSX and JSON question files into the question bank", async ({ page }) => {
  test.setTimeout(300_000);
  const admin = await createTestUser(`e2e-import-${run}@example.test`, password, "Import Admin");
  await db.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto("/");
    await loginAs(page, admin.email, password);
    await page.goto("/admin/questions");
    await expect(page.getByRole("heading", { name: "Question Bank" })).toBeVisible({ timeout: 30_000 });

    // 1. CSV written the way people write it: friendly category and level,
    //    Option A-D columns, a lettered answer, no type or time columns.
    const csv = [
      "Question,Category,Level,Option A,Option B,Option C,Option D,Answer,Explanation",
      `"What is 10% of 250? ${tag}",Quantitative Aptitude,Easy,20,25,30,35,B,"10% of 250 is 25."`,
      `"Find the odd one out: 2, 4, 6, 9 ${tag}",Logical Reasoning,Medium,2,4,6,9,D,"9 is the only odd number."`,
    ].join("\n");
    await upload(page, "questions.csv", "text/csv", Buffer.from(csv));
    await expect(page.getByText("Step 1: Field mapping - 2 rows detected")).toBeVisible();
    await page.getByRole("checkbox", { name: "Make imported questions live straight away" }).check();
    await validateAndImport(page, 2);
    await expect(page.getByText(/\(live for candidates\)/)).toBeVisible();
    const pct = await db.practiceQuestion.findFirstOrThrow({ where: { prompt: { contains: `What is 10% of 250? ${tag}` } } });
    expect(pct).toMatchObject({ category: "NUMERICAL_APTITUDE", difficulty: "BEGINNER", type: "MULTIPLE_CHOICE", correctAnswer: "25", timeLimitSeconds: 60, isActive: true });
    expect(JSON.parse(pct.options!)).toEqual(["20", "25", "30", "35"]);

    // 2. XLSX in the template layout, switched off for review (no Active column, box unticked).
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Question", "Category", "Difficulty", "Question Type", "Options", "Correct Answer", "Time Limit Seconds"],
      [`Choose the synonym of "happy". ${tag}`, "VOCABULARY", "BEGINNER", "MULTIPLE_CHOICE", "sad | joyful | angry", "joyful", 30],
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Questions");
    await upload(page, "questions.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Buffer.from(XLSX.write(book, { type: "buffer", bookType: "xlsx" })));
    await validateAndImport(page, 1);
    await expect(page.getByText(/switched off until you review them/)).toBeVisible();
    expect(await db.practiceQuestion.findFirstOrThrow({ where: { prompt: { contains: `synonym of "happy". ${tag}` } } })).toMatchObject({ category: "VOCABULARY", isActive: false, timeLimitSeconds: 30 });

    // 3. JSON in the question-bank shape.
    const json = JSON.stringify([{ category: "GRAMMAR", difficulty: "INTERMEDIATE", type: "MULTIPLE_CHOICE", prompt: `She ___ here since 2020. ${tag}`, options: ["lives", "has lived", "is living"], correctAnswer: "has lived", timeLimitSeconds: 45, isActive: true }]);
    await upload(page, "questions.json", "application/json", Buffer.from(json));
    await validateAndImport(page, 1);
    expect(await db.practiceQuestion.findFirstOrThrow({ where: { prompt: { contains: `since 2020. ${tag}` } } })).toMatchObject({ category: "GRAMMAR", correctAnswer: "has lived", isActive: true });

    // The imported questions are in the bank list.
    await page.getByLabel("Search prompt").fill(tag);
    await expect(page.getByText(`What is 10% of 250? ${tag}`)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(`She ___ here since 2020. ${tag}`)).toBeVisible();

    // 4. Bad files are explained, and nothing is saved.
    await upload(page, "broken.json", "application/json", Buffer.from('[{"prompt": "x",}'));
    await expect(page.getByText(/isn't valid JSON/)).toBeVisible();
    await upload(page, "empty.csv", "text/csv", Buffer.from("Question,Category,Difficulty\n"));
    await expect(page.getByText("That file has column names but no questions under them.")).toBeVisible();
    // An exam-catalogue file (skill + exams columns) points to the catalogue import, and >5 rows can all be shown.
    const catalogueRows = Array.from({ length: 7 }, (_, i) => `vocabulary,spelling,amcat,BEGINNER,MULTIPLE_CHOICE,Spell ${i} ${tag},a | b,a`);
    await upload(page, "catalogue.csv", "text/csv", Buffer.from(["subject,skill,exams,difficulty,type,question,options,correctAnswer", ...catalogueRows].join("\n")));
    await expect(page.getByRole("link", { name: "Exam catalogue → Manage questions" })).toBeVisible();
    await page.getByRole("button", { name: "Show all 7 rows" }).click();
    await expect(page.getByRole("cell", { name: `Spell 6 ${tag}` })).toBeVisible();
    await upload(page, "notes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", Buffer.from("x"));
    await expect(page.getByText(/Word documents aren't supported/)).toBeVisible();
    await upload(page, "wrong.csv", "text/csv", Buffer.from(`Question,Category,Difficulty,Options,Answer\nAn unknown area ${tag},Astrology,Easy,a | b,a`));
    await page.getByRole("button", { name: /Step 2: Validate/ }).click();
    await expect(page.getByText(/Invalid category "ASTROLOGY"/)).toBeVisible({ timeout: 60_000 });
    expect(await db.practiceQuestion.count({ where: { prompt: { contains: `An unknown area ${tag}` } } })).toBe(0);

    expect(errors).toEqual([]);
  } finally {
    await db.user.delete({ where: { id: admin.id } });
  }
});
