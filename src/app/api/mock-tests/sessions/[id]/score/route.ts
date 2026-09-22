import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeScoreReport, SCORE_CATEGORIES, type AnalyzedVoiceAttempt, type ScoredMcqAttempt } from "@/lib/scoring-engine";
import { getCategoryWeights } from "@/lib/scoring-config";
import { analyzeAttempt } from "@/lib/analyze-attempt";
import type { PaceClassification } from "@/lib/speech-metrics";
import type { VoiceAnalysisResult } from "@/lib/providers/gemini-analysis-provider";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const mockTestSession = await db.mockTestSession.findUnique({
    where: { id },
    include: {
      attempts: { include: { analysis: true, recording: true, question: true } },
      events: true,
    },
  });
  if (!mockTestSession || mockTestSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // A mock assessment's Readiness score is meant to be a final, complete
  // result, not a partial one that quietly excludes every voice category
  // nobody happened to click "Analyze" on - unlike solo practice, where
  // analysis stays on-demand to avoid paying for recordings nobody
  // reviews, here the candidate is actively asking for their real result,
  // so running the real analysis now IS the deliverable, not wasted spend.
  const unanalyzed = mockTestSession.attempts.filter((a) => a.recordingId && !a.analysis);
  if (unanalyzed.length > 0) {
    const results = await Promise.allSettled(unanalyzed.map((a) => analyzeAttempt(a)));
    if (results.some((r) => r.status === "fulfilled" && r.value.ok)) {
      // Re-load so the report below sees the analyses just written.
      const refreshed = await db.mockTestSession.findUnique({
        where: { id },
        include: { attempts: { include: { analysis: true, recording: true, question: true } }, events: true },
      });
      if (refreshed) Object.assign(mockTestSession, refreshed);
    }
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

  const categoryWeights = await getCategoryWeights(SCORE_CATEGORIES);
  const report = computeScoreReport({
    analyzedVoiceAttempts,
    mcqAttempts,
    unanalyzedVoiceCount,
    proctoringEvents: mockTestSession.events.map((e) => ({ eventType: e.eventType })),
    categoryWeights,
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
