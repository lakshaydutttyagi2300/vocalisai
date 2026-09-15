import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createGeminiImproveProvider } from "@/lib/providers/gemini-improve-provider";
import { estimateAnalysisCostUsd } from "@/lib/providers/pricing";

// Same on-demand/idempotent/cached discipline as the analysis and results
// report features: this is a paid AI call, so it only ever runs when the
// candidate explicitly asks, and only ever once per attempt.
async function loadOwnedAttempt(attemptId: string, userId: string) {
  const attempt = await db.practiceAttempt.findUnique({
    where: { id: attemptId },
    include: { question: true, analysis: true },
  });
  if (!attempt || attempt.userId !== userId) return null;
  return attempt;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attempt = await loadOwnedAttempt(id, session.user.id);
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!attempt.analysis?.improvedAnswerJson) return NextResponse.json({ generated: false });
  return NextResponse.json({ generated: true, result: JSON.parse(attempt.analysis.improvedAnswerJson) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attempt = await loadOwnedAttempt(id, session.user.id);
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!attempt.analysis) {
    return NextResponse.json({ error: "Analyze this recording first." }, { status: 400 });
  }
  if (attempt.analysis.improvedAnswerJson) {
    return NextResponse.json({ generated: true, result: JSON.parse(attempt.analysis.improvedAnswerJson) });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "This feature is not configured on this server." }, { status: 503 });
  }

  const provider = createGeminiImproveProvider(geminiKey);
  let outcome;
  try {
    outcome = await provider.improveAnswer(attempt.analysis.transcript, attempt.question.prompt);
  } catch (err) {
    return NextResponse.json(
      { error: `Couldn't improve your answer: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 502 }
    );
  }

  const estimatedCostUsd = estimateAnalysisCostUsd(outcome.tokenUsage.textInput, outcome.tokenUsage.output);

  await db.speechAnalysis.update({
    where: { id: attempt.analysis.id },
    data: {
      improvedAnswerJson: JSON.stringify(outcome.result),
      improvedAnswerCostUsd: estimatedCostUsd,
    },
  });

  return NextResponse.json({ generated: true, result: outcome.result });
}
