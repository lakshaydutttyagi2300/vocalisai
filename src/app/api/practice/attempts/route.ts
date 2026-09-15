import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndRecordUsage, checkDifficultyAccess, upgradeMessage } from "@/lib/entitlements";

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

  const { questionId, responseText, recordingId, timeTakenSeconds, mockTestSessionId } = body as {
    questionId?: string;
    responseText?: string;
    recordingId?: string;
    timeTakenSeconds?: number;
    mockTestSessionId?: string;
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
  if (mockTestSessionId) {
    const mockTestSession = await db.mockTestSession.findUnique({ where: { id: mockTestSessionId } });
    if (!mockTestSession || mockTestSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Invalid mock test session." }, { status: 400 });
    }
    validatedMockTestSessionId = mockTestSession.id;
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

    const feature = validatedRecordingId ? "VOICE_RECORDING" : "PRACTICE_SESSION";
    const usage = await checkAndRecordUsage(session.user.id, feature);
    if (!usage.allowed) {
      return NextResponse.json({ error: upgradeMessage(usage, feature) }, { status: 403 });
    }
  }

  let isCorrect: boolean | null = null;
  let score: number | null = null;

  if (question.correctAnswer !== null) {
    isCorrect = (responseText ?? "").trim() === question.correctAnswer.trim();
    score = isCorrect ? 100 : 0;
  }

  const attempt = await db.practiceAttempt.create({
    data: {
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
    },
  });

  return NextResponse.json({
    attemptId: attempt.id,
    isCorrect,
    score,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    scoringCriteria: question.scoringCriteria,
  });
}
