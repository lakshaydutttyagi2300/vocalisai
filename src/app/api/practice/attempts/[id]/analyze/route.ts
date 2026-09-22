import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyzeAttempt } from "@/lib/analyze-attempt";
import { checkAndRecordUsage, upgradeMessage } from "@/lib/entitlements";
import { isFeatureEnabled } from "@/lib/feature-flags";

// Analysis runs ONLY when explicitly requested (viewing results), never
// automatically on every recorded attempt - so we never pay for
// transcription/AI on recordings nobody reviews. Idempotent: an attempt
// that's already been analyzed just returns the stored result, never
// re-runs and re-pays.
async function loadOwnedAttemptWithRecording(attemptId: string, userId: string) {
  const attempt = await db.practiceAttempt.findUnique({
    where: { id: attemptId },
    include: { recording: true, question: true, analysis: true },
  });
  if (!attempt || attempt.userId !== userId) return null;
  return attempt;
}

function serializeAnalysis(
  analysis: {
    transcript: string;
    wordCount: number;
    durationSeconds: number;
    wpm: number;
    paceClassification: string;
    fillerCount: number;
    fillerBreakdown: string;
    repetitionCount: number;
    repetitionExamples: string;
    longPauses: string;
    segmentsJson: string | null;
    aiAnalysisJson: string;
    estimatedCostUsd: number;
    improvedAnswerJson: string | null;
  },
  recordingId: string | null,
  category: string
) {
  return {
    transcript: analysis.transcript,
    recordingId,
    category,
    hasImprovedAnswer: !!analysis.improvedAnswerJson,
    deterministic: {
      wordCount: analysis.wordCount,
      durationSeconds: analysis.durationSeconds,
      wpm: analysis.wpm,
      pace: analysis.paceClassification,
      fillerCount: analysis.fillerCount,
      fillerBreakdown: JSON.parse(analysis.fillerBreakdown),
      repetitionCount: analysis.repetitionCount,
      repetitionExamples: JSON.parse(analysis.repetitionExamples),
      longPauses: JSON.parse(analysis.longPauses),
      segments: analysis.segmentsJson ? JSON.parse(analysis.segmentsJson) : [],
    },
    ai: JSON.parse(analysis.aiAnalysisJson),
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attempt = await loadOwnedAttemptWithRecording(id, session.user.id);
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!attempt.analysis) {
    return NextResponse.json({ analyzed: false });
  }
  return NextResponse.json({
    analyzed: true,
    result: serializeAnalysis(attempt.analysis, attempt.recording?.id ?? null, attempt.category),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attempt = await loadOwnedAttemptWithRecording(id, session.user.id);
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (attempt.analysis) {
    return NextResponse.json({
      analyzed: true,
      result: serializeAnalysis(attempt.analysis, attempt.recording?.id ?? null, attempt.category),
    });
  }

  if (!attempt.recording) {
    return NextResponse.json({ error: "This attempt has no recording to analyze." }, { status: 400 });
  }

  if (!(await isFeatureEnabled("AI_SPEECH_ANALYSIS"))) {
    return NextResponse.json({ error: "AI Speech Analysis is currently unavailable." }, { status: 403 });
  }

  const usage = await checkAndRecordUsage(session.user.id, "SPEECH_ANALYSIS");
  if (!usage.allowed) {
    return NextResponse.json({ error: upgradeMessage(usage, "SPEECH_ANALYSIS") }, { status: 403 });
  }

  const result = await analyzeAttempt(attempt);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const saved = await db.speechAnalysis.findUnique({ where: { attemptId: attempt.id } });
  if (!saved) {
    return NextResponse.json({ error: "Analysis didn't save correctly. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ analyzed: true, result: serializeAnalysis(saved, attempt.recording.id, attempt.category) });
}
