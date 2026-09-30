import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";

// Admin builds part of the catalogue and its questions through the real UI,
// then a candidate practises them (docs/CATALOGUE.md). Everything created
// here is removed afterwards.
const password = "correct-horse-battery-staple";
const SHOTS = process.env.CATALOGUE_SHOTS;
const run = Date.now();
const categoryName = `E2E Category ${run}`;
const examName = `E2E Exam ${run}`;
const subjectSlug = "general-awareness";

test.afterAll(async () => {
  const subject = await db.catalogSubject.findUnique({ where: { slug: subjectSlug } });
  await db.practiceQuestion.deleteMany({ where: { subjectId: subject?.id, prompt: { contains: `(e2e ${run})` } } });
  await db.catalogSkill.deleteMany({ where: { subjectId: subject?.id, name: `E2E Skill ${run}` } });
  const category = await db.catalogCategory.findFirst({ where: { name: categoryName } });
  if (category) {
    await db.catalogExam.deleteMany({ where: { categoryId: category.id } });
    await db.catalogCategory.delete({ where: { id: category.id } });
  }
});

test("an admin creates a category, exam, skill and questions, and a candidate practises them", async ({ page, browser }) => {
  test.setTimeout(300_000);
  const admin = await createTestUser(`e2e-cat-admin-${run}@example.test`, password, "Catalogue Admin");
  await db.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  const candidate = await createTestUser(`e2e-cat-cand-${run}@example.test`, password, "Catalogue Candidate");
  await setPlan(candidate.id, "STARTER", { periodDays: 30 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  try {
    await page.goto("/");
    await loginAs(page, admin.email, password);
    await page.goto("/admin/catalogue");
    await expect(page.getByRole("heading", { name: "Exam catalogue" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Banking Exams/ })).toBeVisible();

    // Category, then an exam in it with General Awareness (15 mock questions).
    await page.getByRole("button", { name: "Add" }).first().click();
    await page.getByLabel("Name", { exact: true }).fill(categoryName);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Category saved.", { timeout: 30_000 });
    await page.getByRole("button", { name: "Add exam" }).click();
    await page.getByLabel("Name", { exact: true }).fill(examName);
    await page.getByRole("checkbox", { name: "General Awareness" }).check();
    await page.getByLabel("General Awareness questions in the full mock").fill("15");
    await page.getByRole("button", { name: "Save exam" }).click();
    await expect(page.getByRole("status")).toHaveText("Exam saved.", { timeout: 30_000 });
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-catalogue-exam.png`, fullPage: true });

    // A new skill on the shared General Awareness subject.
    await page.getByRole("tab", { name: "Subjects & skills" }).click();
    await page.getByRole("button", { name: /^General Awareness/ }).click();
    await page.getByLabel("New skill name").fill(`E2E Skill ${run}`);
    await page.getByRole("button", { name: "Add skill" }).click();
    await expect(page.getByText(`E2E Skill ${run}`)).toBeVisible({ timeout: 30_000 });

    // One question by hand, limited to the new exam.
    await page.goto("/admin/catalogue/questions");
    await page.getByRole("button", { name: "New question" }).click();
    const form = page.getByRole("form", { name: "New question" });
    await form.getByLabel("Subject").selectOption({ label: "General Awareness" });
    await form.getByLabel("Skill").selectOption({ label: `E2E Skill ${run}` });
    await form.getByLabel("Question", { exact: true }).fill(`Which river is the longest in India? (e2e ${run})`);
    for (const [i, option] of ["Ganga", "Godavari", "Yamuna", "Narmada"].entries()) await form.getByLabel(`Option ${i + 1}`).fill(option);
    await form.getByRole("button", { name: "Correct" }).first().click();
    await form.getByLabel("Explanation").fill("The Ganga is about 2,525 km long.");
    await form.getByRole("checkbox", { name: new RegExp(examName) }).check();
    await form.getByRole("button", { name: "Add question" }).click();
    await expect(page.getByRole("status")).toHaveText("Question added.", { timeout: 30_000 });

    // A wrong answer is refused with a plain reason.
    await form.getByLabel("Question", { exact: true }).fill(`Capital of Bihar? (e2e ${run})`);
    for (const [i, option] of ["Patna", "Gaya"].entries()) await form.getByLabel(`Option ${i + 1}`).fill(option);
    await form.getByLabel("Correct answer").fill("Ranchi");
    await form.getByRole("button", { name: "Add question" }).click();
    await expect(page.getByText(/must match one of the options/)).toBeVisible({ timeout: 30_000 });

    // Bulk import: two good rows.
    const csv = [
      "subject,skill,exams,difficulty,type,question,options,correctAnswer,explanation,tags",
      `${subjectSlug},,,BEGINNER,MULTIPLE_CHOICE,Who wrote the national anthem? (e2e ${run}),Rabindranath Tagore | Bankim Chandra Chatterjee,Rabindranath Tagore,Jana Gana Mana was written by Tagore.,history`,
      `${subjectSlug},,,BEGINNER,TRUE_FALSE_NOT_GIVEN,The Indian national flag has three colours. (e2e ${run}),,TRUE,Saffron white and green.,flag`,
    ].join("\n");
    await page.locator('input[type="file"]').setInputFiles({ name: "questions.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(page.getByText("2 of 2 rows are ready.")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Import 2 questions" }).click();
    await expect(page.getByText("Imported 2 questions.")).toBeVisible({ timeout: 30_000 });

    // Find it, open it, switch it off, and back on.
    await page.getByLabel("Search question text, tag or ID").fill("longest in India");
    await page.getByLabel("Search question text, tag or ID").press("Enter");
    await page.getByRole("button", { name: /Which river is the longest/ }).click();
    const edit = page.getByRole("form", { name: "Edit question" });
    await expect(edit.getByText("Served")).toBeVisible({ timeout: 30_000 });
    await edit.getByLabel("Status").selectOption("INACTIVE");
    await edit.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Question saved.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("row", { name: /Which river/ })).toContainText("Inactive", { timeout: 30_000 });
    await edit.getByLabel("Status").selectOption("ACTIVE");
    await edit.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("row", { name: /Which river/ })).toContainText("Active", { timeout: 30_000 });
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-catalogue-questions.png`, fullPage: true });

    // The candidate finds the new exam and practises its General Awareness questions.
    const context = await browser.newContext();
    const cand = await context.newPage();
    await cand.goto("/");
    await loginAs(cand, candidate.email, password);
    const category = await db.catalogCategory.findFirstOrThrow({ where: { name: categoryName } });
    const exam = await db.catalogExam.findFirstOrThrow({ where: { name: examName } });
    await cand.goto(`/explore/${category.slug}/${exam.slug}`);
    await cand.getByRole("radiogroup", { name: "Subject" }).getByRole("radio", { name: /General Awareness/ }).click();
    await cand.getByRole("radiogroup", { name: "Level" }).getByRole("radio", { name: /Beginner/ }).click();
    await expect(cand.getByRole("radiogroup", { name: "Level" }).getByRole("radio", { name: /Beginner/ })).toContainText("3 questions");
    await cand.getByRole("button", { name: "Start" }).click();
    await expect(cand.getByText(`(e2e ${run})`, { exact: false }).first()).toBeVisible({ timeout: 30_000 });
    await context.close();

    expect(errors).toEqual([]);
  } finally {
    await db.user.deleteMany({ where: { id: { in: [admin.id, candidate.id] } } });
  }
});
