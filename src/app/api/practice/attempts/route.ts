import { after, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndRecordUsage, checkDifficultyAccess, upgradeMessage } from "@/lib/entitlements";
import { drillTokenCovers } from "@/lib/skills/drill-token";
import { masteryAfterAttempt, saveMastery } from "@/lib/skills/mastery-store";
import { BAND_LABELS, type MasteryResult } from "@/lib/skills/mastery";
import type { Prisma } from "@prisma/client";

// "End assessment" can be clicked while the last recording is still
// uploading, so answers are accepted for a short while after a session ends.
const MOCK_ANSWER_GRACE_MS = 10 * 60 * 1000;

// Every attempt is written scoped to session.user.id - never a client-
// supplied id - and scored here, server-side, against the real
// correctAnswer. Question types with no deterministic answer (interview
// prompts) are saved with isCorrect/score left null rather than invented.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { questionId, responseText, recordingId, timeTakenSeconds, mockTestSessionId, drillToken } = body as {
    questionId?: string;
    responseText?: string;
    recordingId?: string;
    timeTakenSeconds?: number;
    mockTestSessionId?: string;
    drillToken?: string;
  };

  if (!questionId || typeof timeTakenSeconds !== "number") {
    return NextResponse.json({ error: "questionId and timeTakenSeconds are required." }, { status: 400 });
  }

  const question = await db.practiceQuestion.findUnique({ where: { id: questionId } });
  if (!question) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  // A recordingId can only be linked if it actually belongs to this user -
  // never trust a client-supplied id without checking ownership.
  let validatedRecordingId: string | null = null;
  if (recordingId) {
    const recording = await db.practiceRecording.findUnique({ where: { id: recordingId } });
    if (!recording || recording.userId !== session.user.id) {
      return NextResponse.json({ error: "Invalid recording." }, { status: 400 });
    }
    validatedRecordingId = recording.id;
  }

  // Same ownership check for tagging an attempt as part of a mock test.
  let validatedMockTestSessionId: string | null = null;
  let mockQuestionLimit = 0;
  if (mockTestSessionId) {
    const mockTestSession = await db.mockTestSession.findUnique({
      where: { id: mockTestSessionId },
      include: { template: { select: { sections: { select: { questionCount: true } } } } },
    });
    if (!mockTestSession || mockTestSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Invalid mock test session." }, { status: 400 });
    }
    if (mockTestSession.endedAt && Date.now() - mockTestSession.endedAt.getTime() > MOCK_ANSWER_GRACE_MS) {
      return NextResponse.json({ error: "This assessment has already ended." }, { status: 409 });
    }
    validatedMockTestSessionId = mockTestSession.id;
    mockQuestionLimit = (mockTestSession.template?.sections ?? []).reduce((sum, s) => sum + s.questionCount, 0);
  }

  // Usage limits apply to solo practice only - an attempt that's part of a
  // mock assessment is already covered by that assessment's own
  // MOCK_ASSESSMENT quota check, so it must not also consume a separate
  // practice/voice-recording allowance.
  if (!validatedMockTestSessionId) {
    const hasDifficultyAccess = await checkDifficultyAccess(session.user.id, question.difficulty);
    if (!hasDifficultyAccess) {
      return NextResponse.json(
        { error: "This difficulty level isn't included on your current plan. Upgrade to unlock it." },
        { status: 403 }
      );
    }

    // A Skill Drill / diagnostic was already charged once when it started
    // (see src/lib/skills/drill-token.ts), so its answers are not charged again.
    const coveredByDrill = !validatedRecordingId && drillTokenCovers(drillToken, session.user.id, question.id);
    if (!coveredByDrill) {
      const feature = validatedRecordingId ? "VOICE_RECORDING" : "PRACTICE_SESSION";
      const usage = await checkAndRecordUsage(session.user.id, feature);
      if (!usage.allowed) {
        return NextResponse.json({ error: upgradeMessage(usage, feature) }, { status: 403 });
      }
    }
  }

  let isCorrect: boolean | null = null;
  let score: number | null = null;

  if (question.correctAnswer !== null) {
    isCorrect = (responseText ?? "").trim() === question.correctAnswer.trim();
    score = isCorrect ? 100 : 0;
  }

  const data = {
    userId: session.user.id,
    questionId: question.id,
    category: question.category,
    difficulty: question.difficulty,
    responseText: responseText ?? null,
    recordingId: validatedRecordingId,
    mockTestSessionId: validatedMockTestSessionId,
    isCorrect,
    score,
    timeTakenSeconds,
    // Skills platform: copied at answer time so history survives re-tagging.
    skillId: question.skillId,
    level: question.level,
  };
  const attempt = validatedMockTestSessionId
    ? await createMockAttemptWithinLimit(validatedMockTestSessionId, mockQuestionLimit, data)
    : await db.practiceAttempt.create({ data });
  if (!attempt) {
    return NextResponse.json({ error: "This assessment already has an answer for every question." }, { status: 409 });
  }

  // Mastery is a bonus on top of saving the answer - it must never make
  // answering fail or slow it down: the new scores are worked out here (one
  // query) and stored after the response has gone. The My Skills page
  // re-checks everything, so a missed save is caught up there. (Voice
  // answers get theirs once they are analysed.)
  let mastery: MasteryResult | null = null;
  if (question.skillId && isCorrect !== null) {
    try {
      const userId = session.user.id;
      const results = await masteryAfterAttempt(userId, question.skillId);
      mastery = results.get(question.skillId) ?? null;
      await afterResponse(() => saveMastery(userId, results));
    } catch (err) {
      console.error("mastery update failed", err);
    }
  }

  // Why the chosen wrong option is wrong, when the question records it.
  let distractorReason: string | null = null;
  if (isCorrect === false && question.distractorReasons) {
    try {
      const reasons = JSON.parse(question.distractorReasons) as Record<string, string>;
      distractorReason = reasons[(responseText ?? "").trim()] ?? null;
    } catch {
      distractorReason = null;
    }
  }

  return NextResponse.json({
    attemptId: attempt.id,
    isCorrect,
    score,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    scoringCriteria: question.scoringCriteria,
    distractorReason,
    skillId: question.skillId,
    mastery: mastery
      ? { score: mastery.score, band: mastery.band, bandLabel: BAND_LABELS[mastery.band], attempts: mastery.attempts }
      : null,
  });
}

// A mock assessment is charged once, when it starts, so its answers skip the
// per-answer usage check - which means it must not take more answers than
// its template has questions, or GET .../score would run a free AI analysis
// on every extra recording. Count + insert run under a per-session lock so
// parallel requests can't slip past the limit.
async function createMockAttemptWithinLimit(
  mockTestSessionId: string,
  limit: number,
  data: Prisma.PracticeAttemptUncheckedCreateInput,
) {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`mock-attempts:${mockTestSessionId}`}))`;
      const existing = await tx.practiceAttempt.count({ where: { mockTestSessionId } });
      if (existing >= limit) return null;
      return tx.practiceAttempt.create({ data });
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}

// Runs a task once the response is sent (Next's after()). Outside a real
// request - e.g. a unit test calling this handler directly - after() isn't
// available, so the task simply runs before returning.
async function afterResponse(task: () => Promise<void>): Promise<void> {
  const safe = () => task().catch((err) => console.error("mastery save failed", err));
  try {
    after(safe);
  } catch {
    await safe();
  }
}
