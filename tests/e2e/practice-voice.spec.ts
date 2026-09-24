import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";

// Exercises the fetch/submit path for a voice-graded category (READING /
// "Read Aloud" - requiresVoice: true in practice-taxonomy.ts). Recording
// the actual audio through getUserMedia isn't exercised here (that's a
// browser-media concern, not an attempt-submission concern) - a
// PracticeRecording row is created directly, exactly as the real upload
// flow leaves one behind, and linked to the attempt the same way the UI
// does. SpeechAnalysis is deliberately NOT triggered here: it's an
// on-demand, separately-paid action (see schema.prisma's SpeechAnalysis
// comment), not part of submitting an attempt.
const runId = Date.now();
const password = "correct-horse-battery-staple";

test("fetches a READING/BEGINNER question and submits a voice attempt linked to the candidate's own recording", async ({ page }, testInfo) => {
  const email = `e2e-voice-${runId}-${testInfo.testId}@example.test`;
  const user = await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);

  const questionsRes = await page.request.get("/api/practice/questions?category=READING&difficulty=BEGINNER&count=1");
  expect(questionsRes.ok()).toBe(true);
  const { questions } = await questionsRes.json();
  expect(questions.length).toBeGreaterThan(0);
  const question = questions[0];
  expect(question.type).toBe("SHORT_ANSWER"); // Read Aloud has no deterministic correctAnswer

  const recording = await db.practiceRecording.create({
    data: { userId: user.id, filePath: `recordings/${user.id}/e2e-${runId}.webm`, mimeType: "audio/webm", durationSeconds: 14 },
  });

  const attemptRes = await page.request.post("/api/practice/attempts", {
    data: { questionId: question.id, recordingId: recording.id, timeTakenSeconds: 14 },
  });
  expect(attemptRes.ok()).toBe(true);
  const attempt = await attemptRes.json();
  // No correctAnswer exists for this type, so it's never fabricated.
  expect(attempt.isCorrect).toBeNull();
  expect(attempt.score).toBeNull();

  const stored = await db.practiceAttempt.findUniqueOrThrow({ where: { id: attempt.attemptId } });
  expect(stored.recordingId).toBe(recording.id);

  await db.practiceAttempt.delete({ where: { id: attempt.attemptId } });
  await db.practiceRecording.delete({ where: { id: recording.id } });
});

test("rejects a recordingId that belongs to a different user", async ({ page }, testInfo) => {
  const email = `e2e-voice-${runId}-${testInfo.testId}@example.test`;
  await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);

  // A second, unrelated account owns this recording.
  const otherUser = await createTestUser(`e2e-voice-other-${runId}-${testInfo.testId}@example.test`, password);
  const foreignRecording = await db.practiceRecording.create({
    data: { userId: otherUser.id, filePath: `recordings/${otherUser.id}/e2e-${runId}.webm`, mimeType: "audio/webm" },
  });

  const questionsRes = await page.request.get("/api/practice/questions?category=READING&difficulty=BEGINNER&count=1");
  const { questions } = await questionsRes.json();

  const attemptRes = await page.request.post("/api/practice/attempts", {
    data: { questionId: questions[0].id, recordingId: foreignRecording.id, timeTakenSeconds: 10 },
  });
  expect(attemptRes.status()).toBe(400);

  await db.practiceRecording.delete({ where: { id: foreignRecording.id } });
});
