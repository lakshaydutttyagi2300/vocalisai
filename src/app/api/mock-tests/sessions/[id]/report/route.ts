import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeScoreReport, CATEGORY_LABELS, SCORE_CATEGORIES, type AnalyzedVoiceAttempt, type ScoredMcqAttempt } from "@/lib/scoring-engine";
import { createGeminiReportProvider, type ReportEvidenceItem } from "@/lib/providers/gemini-report-provider";
import { estimateAnalysisCostUsd } from "@/lib/providers/pricing";
import type { PaceClassification } from "@/lib/speech-metrics";
import type { VoiceAnalysisResult } from "@/lib/providers/gemini-analysis-provider";

// Same on-demand/idempotent/cached discipline as SpeechAnalysis (Phase 8):
// this calls a paid AI model, so it only ever runs when the candidate
// explicitly asks, and a session that already has a report just returns it
// - never silently re-generated, never re-paid for.
async function loadOwnedSession(id: string, userId: string) {
  const mockTestSession = await db.mockTestSession.findUnique({
    where: { id },
    include: { attempts: { include: { analysis: true } }, events: true, resultsReport: true },
  });
  if (!mockTestSession || mockTestSession.userId !== userId) return null;
  return mockTestSession;
}

function serializeReport(report: { summary: string; strengths: string; improvements: string }) {
  return {
    summary: report.summary,
    strengths: JSON.parse(report.strengths),
    improvements: JSON.parse(report.improvements),
  };
}

// Short, concrete digest of real per-response AI notes - grounding material
// for the narrative call, kept compact rather than dumping full JSON blobs.
function buildEvidence(analyzedVoiceAttempts: AnalyzedVoiceAttempt[]): ReportEvidenceItem[] {
  const evidence: ReportEvidenceItem[] = [];
  for (const a of analyzedVoiceAttempts) {
    const ai = a.ai;
    if (ai.pronunciation?.mispronouncedWords?.length) {
      evidence.push({
        category: a.category,
        note: `Pronunciation (${ai.pronunciation.rating}): flagged words ${ai.pronunciation.mispronouncedWords
          .map((w) => w.word)
          .join(", ")}. ${ai.pronunciation.intelligibility}`,
      });
    }
    if (ai.fluency) {
      evidence.push({ category: a.category, note: `Fluency (${ai.fluency.rating}): ${ai.fluency.smoothness}` });
    }
    if (ai.grammar?.issues?.length) {
      const first = ai.grammar.issues[0];
      evidence.push({
        category: a.category,
        note: `Grammar (${ai.grammar.rating}): "${first.excerpt}" - ${first.problem}`,
      });
    }
    if (ai.vocabulary) {
      evidence.push({ category: a.category, note: `Vocabulary (${ai.vocabulary.rating}): ${ai.vocabulary.assessment}` });
    }
    if (ai.delivery) {
      evidence.push({ category: a.category, note: `Delivery (${ai.delivery.rating}): ${ai.delivery.confidenceIndicators}` });
    }
    if (ai.customerHandling?.applicable) {
      evidence.push({ category: a.category, note: `Customer handling: ${ai.customerHandling.comment}` });
    }
  }
  return evidence;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const mockTestSession = await loadOwnedSession(id, session.user.id);
  if (!mockTestSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!mockTestSession.resultsReport) return NextResponse.json({ generated: false });
  return NextResponse.json({ generated: true, result: serializeReport(mockTestSession.resultsReport) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const mockTestSession = await loadOwnedSession(id, session.user.id);
  if (!mockTestSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (mockTestSession.resultsReport) {
    return NextResponse.json({ generated: true, result: serializeReport(mockTestSession.resultsReport) });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "AI report generation is not configured on this server." }, { status: 503 });
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

  if (analyzedVoiceAttempts.length === 0 && mcqAttempts.length === 0) {
    return NextResponse.json(
      { error: "Not enough answered or analyzed responses yet to generate a report." },
      { status: 400 }
    );
  }

  const scoreReport = computeScoreReport({
    analyzedVoiceAttempts,
    mcqAttempts,
    unanalyzedVoiceCount,
    proctoringEvents: mockTestSession.events.map((e) => ({ eventType: e.eventType })),
  });

  const evidence = buildEvidence(analyzedVoiceAttempts);
  const reportProvider = createGeminiReportProvider(geminiKey);

  let outcome;
  try {
    outcome = await reportProvider.generateResultsReport({
      overallScore: scoreReport.overallScore,
      categories: SCORE_CATEGORIES.map((c) => ({
        label: CATEGORY_LABELS[c],
        score: scoreReport.categories[c].score,
        basis: scoreReport.categories[c].basis,
      })),
      evidence,
      proctoringFlagCount: mockTestSession.events.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `AI report generation failed: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 502 }
    );
  }

  const estimatedCostUsd = estimateAnalysisCostUsd(outcome.tokenUsage.textInput, outcome.tokenUsage.output);

  const saved = await db.resultsReport.create({
    data: {
      mockTestSessionId: id,
      summary: outcome.result.summary,
      strengths: JSON.stringify(outcome.result.strengths),
      improvements: JSON.stringify(outcome.result.improvements),
      analysisProvider: outcome.providerName,
      analysisModel: outcome.model,
      estimatedCostUsd,
    },
  });

  return NextResponse.json({ generated: true, result: serializeReport(saved) });
}
