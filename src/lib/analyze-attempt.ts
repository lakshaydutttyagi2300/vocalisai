// Shared core of "run real transcription + AI analysis on one voice
// attempt and save it" - used by the on-demand Analyze button (solo
// practice) and by mock-assessment scoring, which must eagerly analyze
// every recorded response before it can honestly call a session's
// Readiness score complete (see src/app/api/mock-tests/sessions/[id]/score/route.ts).
// Callers own their own usage-quota decision - this function only does
// the real work and never fabricates a result on failure.

import { db } from "@/lib/db";
import { readRecording } from "@/lib/storage";
import { extensionForMimeType, canonicalAudioMimeType } from "@/lib/uploads";
import { createGroqWhisperProvider } from "@/lib/providers/groq-whisper-provider";
import { createGeminiAnalysisProvider } from "@/lib/providers/gemini-analysis-provider";
import { estimateTranscriptionCostUsd, estimateAnalysisCostUsd } from "@/lib/providers/pricing";
import { computeDeterministicMetrics } from "@/lib/speech-metrics";
import { updateMasteryAfterAttempt } from "@/lib/skills/mastery-store";
import type { PracticeAttempt, PracticeQuestion, PracticeRecording } from "@prisma/client";

type AttemptWithRecordingAndQuestion = PracticeAttempt & {
  recording: PracticeRecording | null;
  question: PracticeQuestion;
};

export type AnalyzeAttemptResult = { ok: true } | { ok: false; error: string; status: number };

export async function analyzeAttempt(attempt: AttemptWithRecordingAndQuestion): Promise<AnalyzeAttemptResult> {
  if (!attempt.recording) {
    return { ok: false, error: "This attempt has no recording to analyze.", status: 400 };
  }

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!groqKey || !geminiKey) {
    return { ok: false, error: "AI analysis is not configured on this server.", status: 503 };
  }

  let audioBuffer: Buffer;
  try {
    audioBuffer = await readRecording(attempt.recording.filePath);
  } catch {
    return { ok: false, error: "Recording file is missing on the server.", status: 404 };
  }

  const speechProvider = createGroqWhisperProvider(groqKey);
  const analysisProvider = createGeminiAnalysisProvider(geminiKey);

  let transcription;
  try {
    transcription = await speechProvider.transcribe({
      audioBuffer,
      filename: `recording.${extensionForMimeType(attempt.recording.mimeType)}`,
      mimeType: canonicalAudioMimeType(attempt.recording.mimeType),
    });
  } catch (err) {
    return { ok: false, error: `Transcription failed: ${err instanceof Error ? err.message : "unknown error"}`, status: 502 };
  }

  if (!transcription.transcript) {
    return { ok: false, error: "Transcription returned no speech. The recording may be silent or too short.", status: 422 };
  }

  const durationSeconds = transcription.durationSeconds ?? attempt.recording.durationSeconds ?? 0;
  const metrics = computeDeterministicMetrics(transcription.transcript, durationSeconds, transcription.segments);

  let aiResult;
  try {
    aiResult = await analysisProvider.analyzeVoiceResponse({
      audioBuffer,
      audioMimeType: canonicalAudioMimeType(attempt.recording.mimeType),
      transcript: transcription.transcript,
      context: `${attempt.category} practice, ${attempt.difficulty} difficulty. Prompt: "${attempt.question.prompt}"`,
      scoringCriteria: attempt.question.scoringCriteria,
    });
  } catch (err) {
    return { ok: false, error: `AI analysis failed: ${err instanceof Error ? err.message : "unknown error"}`, status: 502 };
  }

  const estimatedCostUsd =
    estimateTranscriptionCostUsd(durationSeconds) +
    estimateAnalysisCostUsd(aiResult.tokenUsage.textInput, aiResult.tokenUsage.output, aiResult.tokenUsage.audioInput);

  await db.speechAnalysis.create({
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

  // Skills platform: a voice answer counts towards its skill once it has a
  // real analysis. Never allowed to fail the analysis itself.
  if (attempt.skillId) {
    try {
      await updateMasteryAfterAttempt(attempt.userId, attempt.skillId);
    } catch (err) {
      console.error("mastery update failed", err);
    }
  }

  return { ok: true };
}
