import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

// A candidate's paid use is given back when AI speech analysis fails on our
// side, but not when their own recording was silent. The analysis itself is
// mocked; the user, question, attempt and usage rows are real test-DB rows.
const session = vi.hoisted(() => ({ getServerSession: vi.fn() }));
const analysis = vi.hoisted(() => ({ analyzeAttempt: vi.fn() }));
vi.mock("next-auth", () => session);
vi.mock("@/lib/analyze-attempt", () => analysis);

const { POST } = await import("@/app/api/practice/attempts/[id]/analyze/route");

const run = Date.now();
let userId = "";
let questionId = "";
let attemptId = "";

beforeAll(async () => {
  const user = await db.user.create({ data: { email: `refund-${run}@example.test`, passwordHash: "x", name: "Refund Test" } });
  userId = user.id;
  const question = await db.practiceQuestion.create({
    data: { category: "SPEAKING", difficulty: "BEGINNER", type: "SHORT_ANSWER", prompt: `refund test ${run}`, timeLimitSeconds: 60, isActive: false },
  });
  questionId = question.id;
  const recording = await db.practiceRecording.create({ data: { userId, filePath: "recordings/none.webm", mimeType: "audio/webm" } });
  const attempt = await db.practiceAttempt.create({
    data: { userId, questionId, category: "SPEAKING", difficulty: "BEGINNER", timeTakenSeconds: 10, recordingId: recording.id },
  });
  attemptId = attempt.id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: userId } }); // cascades attempts, recordings, usage
  await db.practiceQuestion.deleteMany({ where: { id: questionId } });
});

beforeEach(async () => {
  vi.clearAllMocks();
  session.getServerSession.mockResolvedValue({ user: { id: userId, email: `refund-${run}@example.test`, role: "CANDIDATE" } });
  await db.usageEvent.deleteMany({ where: { userId } });
});

const analyze = () => POST(new Request("http://localhost/x", { method: "POST" }), { params: Promise.resolve({ id: attemptId }) });
const usesSpent = () => db.usageEvent.count({ where: { userId, feature: "SPEECH_ANALYSIS" } });

describe("speech analysis usage when the analysis fails", () => {
  it("gives the use back when the AI provider fails", async () => {
    analysis.analyzeAttempt.mockResolvedValue({ ok: false, error: "The AI analysis didn't complete.", status: 502 });
    expect((await analyze()).status).toBe(502);
    expect(await usesSpent()).toBe(0);
  });

  it("keeps the use when the candidate's recording had no speech", async () => {
    analysis.analyzeAttempt.mockResolvedValue({ ok: false, error: "Transcription returned no speech.", status: 422 });
    expect((await analyze()).status).toBe(422);
    expect(await usesSpent()).toBe(1);
  });
});
