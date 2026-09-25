import { test, expect, type Page } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";
import { setUpExamV2Env, type ExamV2Env } from "./exam-v2-setup";

// API-level checks of every exam-runner-v2 rule against the real server.
// The screen itself is exercised in exam-runner-v2-ui.spec.ts.
const password = "correct-horse-battery-staple";
let env: ExamV2Env;

test.beforeAll(async () => {
  env = await setUpExamV2Env("api");
});

test.afterAll(async () => {
  await env.restore();
});

async function candidate(page: Page, tag: string) {
  const email = `e2e-v2-${tag}-${Date.now()}@example.test`;
  const user = await createTestUser(email, password);
  await setPlan(user.id, "STARTER", { periodDays: 30 }); // FREE has 0 mock assessments
  await page.goto("/");
  await loginAs(page, email, password);
  return user;
}

test("with the flag OFF, even a template linked to an exam format uses today's runner, and v2 routes are closed", async ({ page }) => {
  await env.setFlag(false);
  await candidate(page, "flagoff");

  const createRes = await page.request.post("/api/mock-tests/sessions");
  const created = await createRes.json();
  expect(createRes.status(), JSON.stringify(created)).toBe(200);
  expect(created.runner).toBe("v1");

  const start = await page.request.post(`/api/exam-sessions/${created.sessionId}/start`);
  expect(start.status()).toBe(403);
});

test("with the flag ON: start, autosave, resume, validation, audio limit, locked navigation, submit, results", async ({ page, browser }) => {
  test.setTimeout(180_000); // ~30 real requests, each a round-trip to the remote test DB
  await env.setFlag(true);
  const { fixture } = env;
  await candidate(page, "flagon");

  const created = await (await page.request.post("/api/mock-tests/sessions")).json();
  expect(created.runner).toBe("v2");
  const id: string = created.sessionId;

  // Start: paper 1 (Reading), all 3 fixture questions, no answers leaked.
  const started = await (await page.request.post(`/api/exam-sessions/${id}/start`)).json();
  expect(started.paper.name).toBe("Reading");
  expect(started.questions.map((q: { id: string }) => q.id).sort()).toEqual(
    [fixture.questions.tfng, fixture.questions.gap, fixture.questions.mcq].sort()
  );
  expect(JSON.stringify(started)).not.toContain("SECRET TRANSCRIPT");
  expect(Date.parse(started.paperDeadline)).toBeGreaterThan(Date.now());

  // An answer in the wrong shape for its type is rejected.
  const bad = await page.request.put(`/api/exam-sessions/${id}/response`, { data: { questionId: fixture.questions.tfng, answer: "MAYBE" } });
  expect(bad.status()).toBe(400);

  // Autosave, then resume: a fresh GET returns exactly what was saved.
  for (const [questionId, answer] of [
    [fixture.questions.tfng, "TRUE"],
    [fixture.questions.gap, ["an"]],
    [fixture.questions.mcq, "Coffee"],
  ] as const) {
    const res = await page.request.put(`/api/exam-sessions/${id}/response`, { data: { questionId, answer, flagged: questionId === fixture.questions.gap } });
    expect(res.ok()).toBe(true);
  }
  const resumed = await (await page.request.get(`/api/exam-sessions/${id}`)).json();
  expect(resumed.responses[fixture.questions.gap]).toEqual({ answer: ["an"], flagged: true });

  // A question from a later paper can't be answered early.
  const early = await page.request.put(`/api/exam-sessions/${id}/response`, { data: { questionId: fixture.questions.numeric, answer: 7 } });
  expect(early.status()).toBe(409);

  // Audio: nothing streams before a play is granted; the limit (2) is enforced server-side.
  expect((await page.request.get(`/api/exam-sessions/${id}/assets/${fixture.audioGroupId}`)).status()).toBe(403);
  expect((await page.request.post(`/api/exam-sessions/${id}/audio-play`, { data: { itemGroupId: fixture.audioGroupId } })).ok()).toBe(true);
  expect((await page.request.post(`/api/exam-sessions/${id}/audio-play`, { data: { itemGroupId: fixture.audioGroupId } })).ok()).toBe(true);
  expect((await page.request.post(`/api/exam-sessions/${id}/audio-play`, { data: { itemGroupId: fixture.audioGroupId } })).status()).toBe(403);

  // Another candidate can't see or touch this exam.
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await candidate(otherPage, "other");
  expect((await otherPage.request.get(`/api/exam-sessions/${id}`)).status()).toBe(404);
  await otherContext.close();

  // Submit paper 1 (twice - the stale second click must not skip paper 2).
  await page.request.post(`/api/exam-sessions/${id}/submit-paper`, { data: { paperIndex: 0 } });
  const onSpeaking = await (await page.request.post(`/api/exam-sessions/${id}/submit-paper`, { data: { paperIndex: 0 } })).json();
  expect(onSpeaking.paper.name).toBe("Speaking");
  expect(onSpeaking.paper.navigationMode).toBe("LOCKED_SEQUENTIAL");

  // Paper 1 is now locked.
  const late = await page.request.put(`/api/exam-sessions/${id}/response`, { data: { questionId: fixture.questions.tfng, answer: "FALSE" } });
  expect(late.status()).toBe(409);

  // Forward-only: only the current question accepts an answer.
  const [firstQ, secondQ] = onSpeaking.questions as { id: string; type: string }[];
  const answerFor = (q: { type: string }) => (q.type === "NUMERIC_ENTRY" ? 7 : "A small coastal town.");
  expect((await page.request.put(`/api/exam-sessions/${id}/response`, { data: { questionId: secondQ.id, answer: answerFor(secondQ) } })).status()).toBe(409);
  expect((await page.request.put(`/api/exam-sessions/${id}/response`, { data: { questionId: firstQ.id, answer: answerFor(firstQ) } })).ok()).toBe(true);
  const moved = await (await page.request.post(`/api/exam-sessions/${id}/advance`, { data: { fromIndex: 0 } })).json();
  expect(moved.currentQuestionIndex).toBe(1);
  // ...and there's no going back.
  expect((await page.request.put(`/api/exam-sessions/${id}/response`, { data: { questionId: firstQ.id, answer: answerFor(firstQ) } })).status()).toBe(409);
  expect((await page.request.put(`/api/exam-sessions/${id}/response`, { data: { questionId: secondQ.id, answer: answerFor(secondQ) } })).ok()).toBe(true);

  const done = await (await page.request.post(`/api/exam-sessions/${id}/submit-paper`, { data: { paperIndex: 1 } })).json();
  expect(done.status).toBe("COMPLETED");

  // Graded by the pure registry graders; speaking-style answer left unmarked.
  const responses = await db.itemResponse.findMany({ where: { mockTestSessionId: id } });
  const byQ = new Map(responses.map((r) => [r.questionId, r]));
  expect(byQ.get(fixture.questions.tfng)?.isCorrect).toBe(true);
  expect(byQ.get(fixture.questions.gap)?.isCorrect).toBe(true);
  expect(byQ.get(fixture.questions.mcq)?.isCorrect).toBe(true);
  expect(byQ.get(fixture.questions.numeric)?.isCorrect).toBe(true);
  expect(byQ.get(fixture.questions.shortAnswer)?.isCorrect).toBeNull();

  // The results page renders real counts plus the trademark disclaimer.
  await page.goto(`/exam/results/${id}`);
  await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible();
  await expect(page.getByText("3 of 3").first()).toBeVisible();
  await expect(page.getByText(/not affiliated with or endorsed by IELTS/)).toBeVisible();

  // The existing mock-test flow was not touched: no PracticeAttempt rows.
  expect(await db.practiceAttempt.count({ where: { mockTestSessionId: id } })).toBe(0);
});

test("an expired section is auto-submitted by the server on the next request", async ({ page }) => {
  await env.setFlag(true);
  await candidate(page, "expiry");
  const { sessionId } = await (await page.request.post("/api/mock-tests/sessions")).json();
  await page.request.post(`/api/exam-sessions/${sessionId}/start`);

  await db.examSessionState.update({ where: { mockTestSessionId: sessionId }, data: { paperDeadline: new Date(Date.now() - 30_000) } });
  const view = await (await page.request.get(`/api/exam-sessions/${sessionId}`)).json();
  expect(view.paper.name).toBe("Speaking");
});
