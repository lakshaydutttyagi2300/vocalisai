import { test, expect } from "@playwright/test";
import { createTestUser, loginAs } from "./helpers";

// Exercises the real question-fetch and attempt-submit API routes (not the
// UI player component, which is free to change its own markup) through an
// authenticated browser session, for an MCQ-graded practice category
// (GRAMMAR). Assumes the test branch has at least one active GRAMMAR/
// BEGINNER question, which it does as a fork of the real dev branch.
const password = "correct-horse-battery-staple";

test.beforeEach(async ({ page }, testInfo) => {
  const email = `e2e-mcq-${Date.now()}-${testInfo.testId}@example.test`;
  await createTestUser(email, password);
  await page.goto("/"); // establishes an origin before setting auth cookies via request context
  await loginAs(page, email, password);
});

test("fetches GRAMMAR/BEGINNER questions and submits a correct attempt", async ({ page }) => {
  const questionsRes = await page.request.get("/api/practice/questions?category=GRAMMAR&difficulty=BEGINNER&count=1");
  expect(questionsRes.ok()).toBe(true);
  const { questions } = await questionsRes.json();
  expect(questions.length).toBeGreaterThan(0);

  const question = questions[0];
  expect(question.options).toBeTruthy(); // MCQ options never leak the correct answer here
  expect(question).not.toHaveProperty("correctAnswer");

  // The correct answer isn't returned by GET - fetch it directly from the
  // DB the same way the seed data does, to submit a genuinely correct attempt.
  const { db } = await import("@/lib/db");
  const full = await db.practiceQuestion.findUniqueOrThrow({ where: { id: question.id } });

  const attemptRes = await page.request.post("/api/practice/attempts", {
    data: { questionId: question.id, responseText: full.correctAnswer, timeTakenSeconds: 12 },
  });
  expect(attemptRes.ok()).toBe(true);
  const attempt = await attemptRes.json();
  expect(attempt.isCorrect).toBe(true);
  expect(attempt.score).toBe(100);
});

test("submitting a wrong answer is scored incorrect, not silently accepted", async ({ page }) => {
  const questionsRes = await page.request.get("/api/practice/questions?category=GRAMMAR&difficulty=BEGINNER&count=1");
  const { questions } = await questionsRes.json();
  const question = questions[0];

  const attemptRes = await page.request.post("/api/practice/attempts", {
    data: { questionId: question.id, responseText: "definitely not the right answer", timeTakenSeconds: 8 },
  });
  expect(attemptRes.ok()).toBe(true);
  const attempt = await attemptRes.json();
  expect(attempt.isCorrect).toBe(false);
  expect(attempt.score).toBe(0);
});

test("fetching questions while logged out is rejected", async ({ browser }) => {
  const loggedOutContext = await browser.newContext();
  const res = await loggedOutContext.request.get("http://localhost:3000/api/practice/questions?category=GRAMMAR&difficulty=BEGINNER");
  expect(res.status()).toBe(401);
  await loggedOutContext.close();
});
