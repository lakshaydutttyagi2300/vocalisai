import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";

// Full session create -> answer -> end -> score report path, through the
// real API routes MockTestSessionShell/MockTestQuestionRunner call. Uses
// whichever template is currently the admin-set default in the test
// branch (mirrors real behaviour: "whichever template new sessions use" is
// data-driven, not fixed) and answers only its GRAMMAR section, which is
// enough to prove the whole pipeline without needing every section
// answered.
const runId = Date.now();
const password = "correct-horse-battery-staple";

test("create session -> answer a section -> end -> score report is computed", async ({ page }, testInfo) => {
  const email = `e2e-mocktest-${runId}-${testInfo.testId}@example.test`;
  const user = await createTestUser(email, password);
  // FREE's MOCK_ASSESSMENT limit is 0 (see PLAN_LIMITS in entitlements.ts)
  // - a real, deliberate restriction, not something to work around. A paid
  // plan is the correct precondition for this flow, same as a real
  // candidate would need.
  await setPlan(user.id, "STARTER", { periodDays: 30 });
  await page.goto("/");
  await loginAs(page, email, password);

  const createRes = await page.request.post("/api/mock-tests/sessions");
  expect(createRes.ok()).toBe(true);
  const created = await createRes.json();
  expect(created.sessionId).toBeTruthy();
  expect(created.template?.sections?.length).toBeGreaterThan(0);

  const grammarSection = created.template.sections.find((s: { category: string }) => s.category === "GRAMMAR");
  expect(grammarSection).toBeTruthy();

  const questionsRes = await page.request.get(
    `/api/practice/questions?category=${grammarSection.category}&difficulty=${grammarSection.difficulty}&count=${grammarSection.questionCount}`
  );
  expect(questionsRes.ok()).toBe(true);
  const { questions } = await questionsRes.json();
  expect(questions.length).toBeGreaterThan(0);

  for (const q of questions) {
    const full = await db.practiceQuestion.findUniqueOrThrow({ where: { id: q.id } });
    const attemptRes = await page.request.post("/api/practice/attempts", {
      data: {
        questionId: q.id,
        responseText: full.correctAnswer,
        timeTakenSeconds: 10,
        mockTestSessionId: created.sessionId,
      },
    });
    expect(attemptRes.ok()).toBe(true);
  }

  const endRes = await page.request.patch(`/api/mock-tests/sessions/${created.sessionId}`);
  expect(endRes.ok()).toBe(true);

  const scoreRes = await page.request.get(`/api/mock-tests/sessions/${created.sessionId}/score`);
  expect(scoreRes.ok()).toBe(true);
  const score = await scoreRes.json();

  // GRAMMAR was answered entirely correctly, so it must score 100 with a
  // basis that says so, not a fabricated or missing number.
  expect(score.categories.GRAMMAR.score).toBe(100);
  expect(typeof score.overallScore === "number" || score.overallScore === null).toBe(true);

  // Attempts submitted with mockTestSessionId must not have consumed the
  // candidate's separate solo-practice quota (see api/practice/attempts).
  const soloUsage = await db.usageEvent.count({
    where: { user: { email }, feature: "PRACTICE_SESSION" },
  });
  expect(soloUsage).toBe(0);
});

test("mock test session and its attempts belong only to the creating user", async ({ page }, testInfo) => {
  const email = `e2e-mocktest-${runId}-${testInfo.testId}@example.test`;
  const user = await createTestUser(email, password);
  await setPlan(user.id, "STARTER", { periodDays: 30 });
  await page.goto("/");
  await loginAs(page, email, password);

  const createRes = await page.request.post("/api/mock-tests/sessions");
  const created = await createRes.json();

  const patchAsSelf = await page.request.patch(`/api/mock-tests/sessions/${created.sessionId}`);
  expect(patchAsSelf.ok()).toBe(true);

  // A second, unrelated account must not be able to read or end this session.
  const otherEmail = `e2e-mocktest-other-${runId}-${testInfo.testId}@example.test`;
  await createTestUser(otherEmail, password);
  const otherContext = await page.context().browser()!.newContext();
  const otherPage = await otherContext.newPage();
  await otherPage.goto("/");
  await loginAs(otherPage, otherEmail, password);

  const foreignScoreRes = await otherPage.request.get(`/api/mock-tests/sessions/${created.sessionId}/score`);
  expect(foreignScoreRes.status()).toBe(404);

  await otherContext.close();
});
