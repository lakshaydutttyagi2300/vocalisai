import { test, expect, type Page } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";

// The private-sector hiring catalogue through the real UI (docs/CATALOGUE.md):
// Explore -> company assessment -> section/subject/skill -> level -> mode ->
// test -> review -> history, performance and bookmarks; skill-first
// practice; old addresses. Uses throwaway questions tagged to the
// seeded Logical Reasoning / Syllogism skill (prisma/catalogue/apply.mjs on the
// test branch), deleted afterwards.
const password = "correct-horse-battery-staple";
const SHOTS = process.env.CATALOGUE_SHOTS; // e.g. ui-snaps - screenshots only when set
const run = Date.now();
let questionIds: string[] = [];

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  for (const [label, width] of [["desktop", 1280], ["phone", 390]] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: `${SHOTS}/catalogue-${name}-${label}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

test.beforeAll(async () => {
  const subject = await db.catalogSubject.findUniqueOrThrow({ where: { slug: "reasoning" } });
  const skill = await db.catalogSkill.findUniqueOrThrow({ where: { subjectId_slug: { subjectId: subject.id, slug: "syllogism" } } });
  for (let i = 0; i < 8; i++) {
    const q = await db.practiceQuestion.create({
      data: {
        category: "LOGICAL_REASONING",
        subjectId: subject.id,
        catalogSkillId: skill.id,
        difficulty: "BEGINNER",
        type: "MULTIPLE_CHOICE",
        prompt: `Statements: All pens are books. All books are bags. Conclusion ${i + 1} (e2e ${run}): All pens are bags?`,
        options: JSON.stringify(["Follows", "Does not follow"]),
        correctAnswer: "Follows",
        explanation: "Pens sit inside books, and books inside bags, so every pen is a bag.",
        timeLimitSeconds: 45,
        tags: ["e2e"],
      },
    });
    questionIds.push(q.id);
  }
});

test.afterAll(async () => {
  await db.practiceQuestion.deleteMany({ where: { id: { in: questionIds } } });
  questionIds = [];
});

test("a candidate finds TCS NQT, practises a skill, reviews it and sees history, performance and bookmarks", async ({ page }) => {
  test.setTimeout(300_000);
  const email = `e2e-catalogue-${run}@example.test`;
  const user = await createTestUser(email, password, "Ravi Candidate");
  await setPlan(user.id, "STARTER", { periodDays: 30 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));

  try {
    // Explore is public: hiring-focused, no government exams anywhere.
    await page.goto("/explore");
    await expect(page.getByRole("heading", { name: "Prepare for company assessments, interviews and workplace skills", level: 1 })).toBeVisible({ timeout: 30_000 });
    expect(await page.locator("body").innerText()).not.toMatch(/\b(SSC|IBPS|SBI PO|UPSC|RRB|CTET|NDA|Banking Exams|Railway|Police)\b/);
    const featured = page.getByRole("region", { name: "Featured assessments" });
    for (const name of ["AMCAT", "eLitmus (pH Test)", "CoCubes", "TCS NQT", "Infosys", "Accenture"]) await expect(featured.getByRole("link", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Company & Hiring Assessments" }).getByText("Assessment providers")).toBeVisible();
    await shot(page, "explore");

    // Search finds companies, assessments, practice areas and skills.
    const search = page.getByRole("searchbox", { name: /Search companies/ });
    const results = page.getByRole("list", { name: "Search results" });
    await search.fill("tcs");
    await expect(results.getByRole("link", { name: /TCS NQT/ })).toBeVisible();
    await expect(results.getByRole("link", { name: /TCS iON/ })).toBeVisible();
    await search.fill("reasoning");
    await expect(results.getByRole("link", { name: /Logical Reasoning Practice area/ })).toBeVisible();
    await search.fill("cgl");
    await expect(page.getByText(/Nothing matches/)).toBeVisible();
    await search.fill("amcat");
    await expect(results.getByRole("link", { name: /^AMCAT/ })).toBeVisible();
    await search.fill("tcs nqt");
    await results.getByRole("link", { name: /TCS NQT/ }).click();
    await expect(page).toHaveURL(/\/explore\/company-hiring-assessments\/tcs-nqt$/, { timeout: 30_000 });
    await expect(page.getByText("Reasoning Ability", { exact: true })).toBeVisible({ timeout: 30_000 }); // TCS's own section name

    // Signed out: the exam page asks to sign in, and returns here after.
    await expect(page.getByRole("link", { name: "Sign in to start" })).toBeVisible({ timeout: 30_000 });
    await loginAs(page, email, password);
    await page.reload();

    // Subject -> skill -> level -> mode -> start.
    const subjects = page.getByRole("radiogroup", { name: "Subject" });
    await subjects.getByRole("radio", { name: /^Logical Reasoning/ }).click();
    await page.getByRole("group", { name: "Logical Reasoning skills" }).getByRole("button", { name: /^Syllogism/ }).click();
    await page.getByRole("radiogroup", { name: "Level" }).getByRole("radio", { name: /Beginner/ }).click();
    await page.getByRole("radiogroup", { name: "Mode" }).getByRole("radio", { name: /^Practice/ }).click();
    await page.getByRole("radiogroup", { name: "Number of questions" }).getByRole("radio", { name: "5" }).click();
    await shot(page, "exam");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page).toHaveURL(/\/practice-tests\/[a-z0-9]+$/, { timeout: 30_000 });

    // Untimed practice: check each answer, see the explanation, bookmark one.
    await expect(page.getByText("Question 1 of 5")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Bookmark", exact: true }).click();
    await expect(page.getByRole("button", { name: "Bookmarked" })).toBeVisible();
    for (let i = 0; i < 5; i++) {
      await page.getByRole("radio", { name: i === 1 ? "Does not follow" : "Follows" }).click();
      await page.getByRole("button", { name: "Check answer" }).click();
      await expect(page.getByText(i === 1 ? /Not quite\. Correct answer: Follows/ : /^Correct\.$/)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/every pen is a bag/)).toBeVisible();
      if (i === 0) await shot(page, "question");
      await page.getByRole("button", { name: i < 4 ? "Next" : "See results", exact: true }).click();
    }

    // Review: score, accuracy, each question with the right answer.
    await expect(page.getByRole("heading", { name: /TCS NQT · Logical Reasoning · Syllogism/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("80%").first()).toBeVisible();
    await expect(page.getByText("4 / 5")).toBeVisible();
    await page.getByRole("button", { name: "Wrong" }).click();
    await expect(page.getByRole("list", { name: "Question review" }).getByRole("listitem")).toHaveCount(1);
    await shot(page, "review");

    // Skill-first: Practice by skill -> Logical Reasoning, with the skill chosen by the link.
    await page.goto("/explore/skills");
    await expect(page.getByRole("heading", { name: "Work on the skill, whichever test you face" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("link", { name: /^Logical Reasoning/ }).click();
    await expect(page).toHaveURL(/\/explore\/skills\/reasoning$/, { timeout: 30_000 });
    await page.goto("/explore/skills/reasoning?skill=syllogism");
    await expect(page.getByRole("group", { name: "Logical Reasoning skills" }).getByRole("button", { name: /^Syllogism/ })).toHaveAttribute("aria-pressed", "true", { timeout: 30_000 });
    // A timed test on the same skill: no marking until submitted; the timer shows.
    await page.getByRole("radiogroup", { name: "Mode" }).getByRole("radio", { name: /Timed test/ }).click();
    await page.getByRole("radiogroup", { name: "Number of questions" }).getByRole("radio", { name: "5" }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByRole("timer", { name: "Time left" })).toBeVisible({ timeout: 30_000 });
    // Unseen questions come first: 3 of the 8 were never shown.
    const first = await page.getByRole("heading", { level: 2 }).first().innerText();
    await page.getByRole("radio", { name: "Follows" }).click();
    await page.getByRole("button", { name: "Save answer" }).click();
    await expect(page.getByText("Question 2 of 5")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/^Correct\.$/)).toHaveCount(0);
    await shot(page, "timed");
    await page.getByRole("button", { name: "Submit test" }).click();
    await page.getByRole("alertdialog", { name: "Submit test" }).getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText("1 answered, 4 left blank.", { exact: false })).toBeVisible({ timeout: 30_000 });
    expect(first).toMatch(/Conclusion/);

    // History, performance, bookmarks.
    await page.goto("/practice-tests");
    await expect(page.getByRole("list", { name: "Tests" }).getByRole("link")).toHaveCount(2);
    await shot(page, "history");
    await page.goto("/performance");
    await expect(page.getByRole("region", { name: "By subject" }).getByText("Logical Reasoning")).toBeVisible();
    await expect(page.getByRole("region", { name: "By skill" }).getByText("Syllogism")).toBeVisible();
    await shot(page, "performance");
    await page.goto("/bookmarks");
    await expect(page.getByRole("list", { name: "Bookmarked questions" }).getByRole("listitem")).toHaveCount(1);
    await page.getByRole("button", { name: "Practise my bookmarks" }).click();
    await expect(page.getByText("Question 1 of 1")).toBeVisible({ timeout: 30_000 });

    // Old addresses: a moved exam follows its new category; a retired one goes back to Explore.
    await page.goto("/explore/campus-placement/tcs-nqt");
    await expect(page).toHaveURL(/\/explore\/company-hiring-assessments\/tcs-nqt$/, { timeout: 30_000 });
    await page.goto("/explore/ssc/ssc-cgl");
    await expect(page).toHaveURL(/\/explore$/, { timeout: 30_000 });
    await page.goto("/explore/banking");
    await expect(page).toHaveURL(/\/explore$/, { timeout: 30_000 });

    // Phone width: no sideways scrolling on Explore, an assessment and a skill page.
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/explore", "/explore/company-hiring-assessments/tcs-nqt", "/explore/skills/reasoning"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), path).toBe(true);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/catalogue-phone${path.replace(/\//g, "_")}.png`, fullPage: true });
    }

    expect(errors).toEqual([]);
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});
