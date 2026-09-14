import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeScoreReport, type AnalyzedVoiceAttempt, type ScoredMcqAttempt } from "@/lib/scoring-engine";
import type { PaceClassification } from "@/lib/speech-metrics";
import type { VoiceAnalysisResult } from "@/lib/providers/gemini-analysis-provider";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const mockTestSession = await db.mockTestSession.findUnique({
    where: { id },
    include: {
      attempts: { include: { analysis: true } },
      events: true,
    },
  });
  if (!mockTestSession || mockTestSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const mcqAttempts: ScoredMcqAttempt[] = [];
  const analyzedVoiceAttempts: AnalyzedVoiceAttempt[] = [];
  let unanalyzedVoiceCount = 0;

  for (const attempt of mockTestSession.attempts) {
    if (attempt.recordingId) {
      if (attempt.analysis) {
        analyzedVoiceAttempts.push({
          category: attempt.category,
          wordCount: attempt.analysis.wordCount,
          fillerCount: attempt.analysis.fillerCount,
          pace: attempt.analysis.paceClassification as PaceClassification,
          ai: JSON.parse(attempt.analysis.aiAnalysisJson) as VoiceAnalysisResult,
        });
      } else {
        unanalyzedVoiceCount += 1;
      }
    } else if (attempt.score !== null) {
      mcqAttempts.push({ category: attempt.category, score: attempt.score });
    }
  }

  const report = computeScoreReport({
    analyzedVoiceAttempts,
    mcqAttempts,
    unanalyzedVoiceCount,
    proctoringEvents: mockTestSession.events.map((e) => ({ eventType: e.eventType })),
  });

  await db.scoreReport.upsert({
    where: { mockTestSessionId: id },
    update: { overallScore: report.overallScore, categoryScoresJson: JSON.stringify(report.categories) },
    create: {
      mockTestSessionId: id,
      overallScore: report.overallScore,
      categoryScoresJson: JSON.stringify(report.categories),
    },
  });

  return NextResponse.json(report);
}
