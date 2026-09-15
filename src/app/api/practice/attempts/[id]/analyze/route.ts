import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { readRecording } from "@/lib/storage";
import { createGroqWhisperProvider } from "@/lib/providers/groq-whisper-provider";
import { createGeminiAnalysisProvider } from "@/lib/providers/gemini-analysis-provider";
import { estimateTranscriptionCostUsd, estimateAnalysisCostUsd } from "@/lib/providers/pricing";
import { computeDeterministicMetrics } from "@/lib/speech-metrics";
import { checkAndRecordUsage, upgradeMessage } from "@/lib/entitlements";

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

  const usage = await checkAndRecordUsage(session.user.id, "SPEECH_ANALYSIS");
  if (!usage.allowed) {
    return NextResponse.json({ error: upgradeMessage(usage, "SPEECH_ANALYSIS") }, { status: 403 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!groqKey || !geminiKey) {
    return NextResponse.json({ error: "AI analysis is not configured on this server." }, { status: 503 });
  }

  let audioBuffer: Buffer;
  try {
    audioBuffer = await readRecording(attempt.recording.filePath);
  } catch {
    return NextResponse.json({ error: "Recording file is missing on the server." }, { status: 404 });
  }

  const speechProvider = createGroqWhisperProvider(groqKey);
  const analysisProvider = createGeminiAnalysisProvider(geminiKey);

  let transcription;
  try {
    transcription = await speechProvider.transcribe({
      audioBuffer,
      filename: `recording.${attempt.recording.mimeType.split("/")[1] || "webm"}`,
      mimeType: attempt.recording.mimeType,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Transcription failed: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 502 }
    );
  }

  if (!transcription.transcript) {
    return NextResponse.json(
      { error: "Transcription returned no speech. The recording may be silent or too short." },
      { status: 422 }
    );
  }

  const durationSeconds = transcription.durationSeconds ?? attempt.recording.durationSeconds ?? 0;
  const metrics = computeDeterministicMetrics(transcription.transcript, durationSeconds, transcription.segments);

  let aiResult;
  try {
    aiResult = await analysisProvider.analyzeVoiceResponse({
      audioBuffer,
      audioMimeType: attempt.recording.mimeType,
      transcript: transcription.transcript,
      context: `${attempt.category} practice, ${attempt.difficulty} difficulty. Prompt: "${attempt.question.prompt}"`,
      scoringCriteria: attempt.question.scoringCriteria,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `AI analysis failed: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 502 }
    );
  }

  const estimatedCostUsd =
    estimateTranscriptionCostUsd(durationSeconds) +
    estimateAnalysisCostUsd(aiResult.tokenUsage.textInput, aiResult.tokenUsage.output, aiResult.tokenUsage.audioInput);

  const saved = await db.speechAnalysis.create({
    data: {
      attemptId: attempt.id,
      transcript: transcription.transcript,
      wordCount: metrics.wordCount,
      durationSeconds: metrics.durationSeconds,
      wpm: metrics.wpm,
      paceClassification: metrics.pace,
      fillerCount: metrics.fillers.total,
      fillerBreakdown: JSON.stringify(metrics.fillers.byWord),
      repetitionCount: metrics.repetitions.count,
      repetitionExamples: JSON.stringify(metrics.repetitions.examples),
      longPauses: JSON.stringify(metrics.longPauses),
      segmentsJson: JSON.stringify(transcription.segments),
      aiAnalysisJson: JSON.stringify(aiResult.result),
      transcriptionProvider: transcription.providerName,
      transcriptionModel: transcription.model,
      analysisProvider: aiResult.providerName,
      analysisModel: aiResult.model,
      estimatedCostUsd,
    },
  });

  return NextResponse.json({ analyzed: true, result: serializeAnalysis(saved, attempt.recording.id, attempt.category) });
}
