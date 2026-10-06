// Marks a finished Customer Support Assessment and stores the result on the
// session's ScoreReport (overallScore + per-category scores, so progress and
// the coach see it like any other mock exam).
//
// AI use per test: speech-to-text once per spoken answer, then ONE text-only
// rating call for all of them. Transcripts are saved before the rating call,
// so a retry after a failure never transcribes (or pays) twice. A second
// request while marking is running just reports "marking".

import { db } from "@/lib/db";
import { readRecording } from "@/lib/storage";
import { canonicalAudioMimeType, extensionForMimeType } from "@/lib/uploads";
import { createGroqWhisperProvider } from "@/lib/providers/groq-whisper-provider";
import { createGeminiAssessmentProvider, type RatingUnit } from "@/lib/providers/gemini-assessment-provider";
import { estimateAnalysisCostUsd, estimateTranscriptionCostUsd } from "@/lib/providers/pricing";
import { countWords, detectFillers, detectLongPauses, detectRepetitions } from "@/lib/speech-metrics";
import { parsePlan, processExpiry } from "@/lib/exam-runner";
import { parseStimulusSpec } from "@/lib/question-stimulus";
import { SCORE_CATEGORIES, type ScoreCategory } from "@/lib/scoring-engine";
import { isSupportAssessment, itemKindOf, SPOKEN_KINDS, type ComponentKey } from "./config";
import { computeSupportResult, isRatedKind, unitHasSpeech, type ItemFacts, type SpeechFacts, type SupportResult, type UnitRatings } from "./scoring";

/** Stored in ScoreReport.categoryScoresJson under "supportAssessment". */
export interface SupportReportState {
  status: "marking" | "failed" | "done";
  speech: Record<string, SpeechFacts>; // by questionId
  ratings: Record<string, UnitRatings> | null;
  result: SupportResult | null;
  costUsd: number;
}

export type MarkOutcome =
  | { status: "done"; result: SupportResult }
  | { status: "marking" }
  | { status: "failed"; error: string }
  | { status: "not-ready"; error: string };

const STALE_MARKING_MS = 3 * 60_000;

const COMPONENT_CATEGORY: Record<ComponentKey, ScoreCategory> = {
  listening: "LISTENING",
  speaking: "RESPONSE_QUALITY",
  pronunciation: "PRONUNCIATION",
  fluency: "FLUENCY",
  grammarVocabulary: "GRAMMAR",
  customerHandling: "CUSTOMER_HANDLING",
};

export function parseSupportReport(categoryScoresJson: string | null | undefined): SupportReportState | null {
  if (!categoryScoresJson) return null;
  try {
    return (JSON.parse(categoryScoresJson) as { supportAssessment?: SupportReportState }).supportAssessment ?? null;
  } catch {
    return null;
  }
}

function serialise(state: SupportReportState): string {
  const categories = Object.fromEntries(SCORE_CATEGORIES.map((c) => [c, { score: null, basis: "Not part of this test." }])) as Record<
    ScoreCategory,
    { score: number | null; basis: string }
  >;
  for (const c of state.result?.components ?? []) {
    if (!c.pending) categories[COMPONENT_CATEGORY[c.key]] = { score: Math.round((c.points / c.max) * 100), basis: `Customer Support Assessment: ${c.points} of ${c.max} points.` };
  }
  return JSON.stringify({ ...categories, supportAssessment: state });
}

async function save(sessionId: string, state: SupportReportState) {
  const data = { overallScore: state.result?.overall ?? null, categoryScoresJson: serialise(state), computedAt: new Date() };
  await db.scoreReport.upsert({ where: { mockTestSessionId: sessionId }, update: data, create: { mockTestSessionId: sessionId, ...data } });
}

async function transcribeWithRetry(groq: ReturnType<typeof createGroqWhisperProvider>, buffer: Buffer, mimeType: string) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await groq.transcribe({ audioBuffer: buffer, filename: `recording.${extensionForMimeType(mimeType)}`, mimeType: canonicalAudioMimeType(mimeType) });
    } catch (err) {
      // Rate limits and provider hiccups: wait and retry twice.
      if (attempt >= 2) throw err;
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
}

function speechFacts(t: { transcript: string; durationSeconds: number | null; segments: { start: number; end: number; text: string }[] }, fallbackSeconds: number): SpeechFacts {
  const segments = t.segments.filter((s) => s.text.trim());
  const span = segments.length ? segments[segments.length - 1].end - segments[0].start : (t.durationSeconds ?? fallbackSeconds);
  return {
    transcript: t.transcript,
    wordCount: countWords(t.transcript),
    speakingSeconds: Math.max(0, Number(span.toFixed(1))),
    fillerCount: detectFillers(t.transcript).total,
    repetitionCount: detectRepetitions(t.transcript).count,
    longPauseCount: detectLongPauses(segments).length,
  };
}

/** The customer's spoken line(s) from a role-play turn's audio spec. */
function spokenLines(passage: string | null): string {
  const s = passage ? parseStimulusSpec(passage) : null;
  return s?.kind === "audio" ? s.turns.map((t) => t.text).join(" ") : "";
}

export async function markSupportAssessment(sessionId: string): Promise<MarkOutcome> {
  const session = await db.mockTestSession.findUnique({
    where: { id: sessionId },
    include: { template: { include: { examVariant: { include: { family: true } } } }, scoreReport: true },
  });
  if (!session || !isSupportAssessment(session.template?.examVariant)) return { status: "not-ready", error: "This isn't a Customer Support Assessment." };

  const examState = await processExpiry(sessionId);
  if (examState?.status !== "COMPLETED") return { status: "not-ready", error: "Finish the assessment first to see your result." };

  const previous = parseSupportReport(session.scoreReport?.categoryScoresJson);
  if (previous?.status === "done" && previous.result) return { status: "done", result: previous.result };

  // Claim the marking (one at a time per session).
  const stillMarking = previous?.status === "marking" && Date.now() - session.scoreReport!.computedAt.getTime() < STALE_MARKING_MS;
  if (stillMarking) return { status: "marking" };
  const claimed = await db.scoreReport.updateMany({
    where: { mockTestSessionId: sessionId, computedAt: session.scoreReport?.computedAt ?? new Date(0) },
    data: { computedAt: new Date() },
  });
  const state: SupportReportState = { status: "marking", speech: previous?.speech ?? {}, ratings: previous?.ratings ?? null, result: null, costUsd: previous?.costUsd ?? 0 };
  if (session.scoreReport && claimed.count === 0) return { status: "marking" };
  if (!session.scoreReport) {
    try {
      await db.scoreReport.create({ data: { mockTestSessionId: sessionId, overallScore: null, categoryScoresJson: serialise(state) } });
    } catch {
      return { status: "marking" }; // another request created it first
    }
  } else await save(sessionId, state);

  try {
    return await mark(sessionId, parsePlan(examState.planJson).papers.flatMap((p) => p.questions.map((q) => q.questionId)), state);
  } catch (err) {
    console.error("support assessment: marking failed", { sessionId, err });
    await save(sessionId, { ...state, status: "failed" });
    return { status: "failed", error: "We couldn't finish marking your spoken answers. Please try again in a minute." };
  }
}

async function mark(sessionId: string, questionIds: string[], state: SupportReportState): Promise<MarkOutcome> {
  const [questions, responses] = await Promise.all([
    db.practiceQuestion.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, tags: true, prompt: true, passage: true, correctAnswer: true, expectedAnswer: true, orderInGroup: true, itemGroupId: true, itemGroup: { select: { text: true } } },
    }),
    db.itemResponse.findMany({ where: { mockTestSessionId: sessionId, questionId: { in: questionIds } } }),
  ]);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const responseOf = new Map(responses.map((r) => [r.questionId, r]));
  const answerOf = (id: string): unknown => {
    const raw = responseOf.get(id)?.answerJson;
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // 1. Speech-to-text for every spoken answer not transcribed yet.
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!groqKey || !geminiKey) throw new Error("AI keys are not configured");
  const groq = createGroqWhisperProvider(groqKey);
  const spoken = questionIds.filter((id) => {
    const kind = itemKindOf(byId.get(id)?.tags ?? []);
    return kind && SPOKEN_KINDS.includes(kind) && !state.speech[id];
  });
  const recordingIds = spoken.map((id) => (answerOf(id) as { recordingId?: string } | null)?.recordingId).filter((r): r is string => !!r);
  const recordings = new Map((await db.practiceRecording.findMany({ where: { id: { in: recordingIds } } })).map((r) => [r.id, r]));
  const queue = [...spoken];
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      const recording = recordings.get((answerOf(id) as { recordingId?: string } | null)?.recordingId ?? "");
      if (!recording) continue; // not answered: scored 0
      let audio: Buffer;
      try {
        audio = await readRecording(recording.filePath);
      } catch (err) {
        // A lost file can't be fixed by retrying: mark it as silent rather than block the result.
        console.error("support assessment: recording missing", { sessionId, questionId: id, err });
        state.speech[id] = { transcript: "", wordCount: 0, speakingSeconds: 0, fillerCount: 0, repetitionCount: 0, longPauseCount: 0 };
        continue;
      }
      const t = await transcribeWithRetry(groq, audio, recording.mimeType);
      state.speech[id] = speechFacts(t, recording.durationSeconds ?? 0);
      state.costUsd += estimateTranscriptionCostUsd(t.durationSeconds ?? recording.durationSeconds ?? 0);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  await save(sessionId, state);

  // 2. Per-question facts.
  const items: ItemFacts[] = [];
  for (const id of questionIds) {
    const q = byId.get(id);
    const kind = q && itemKindOf(q.tags);
    if (!q || !kind) continue;
    const answer = answerOf(id);
    items.push({
      questionId: id,
      kind,
      unitId: kind === "roleplay" && q.itemGroupId ? q.itemGroupId : id,
      correct: responseOf.get(id)?.isCorrect ?? null,
      typed: kind === "dictation" && typeof answer === "string" ? answer : null,
      expected: kind === "repeat" ? q.expectedAnswer : kind === "dictation" ? q.correctAnswer : null,
      speech: state.speech[id] ?? null,
    });
  }

  // 3. One AI call rating every unit that has real speech.
  if (!state.ratings) {
    const units = new Map<string, ItemFacts[]>();
    for (const i of items) if (isRatedKind(i.kind)) units.set(i.unitId, [...(units.get(i.unitId) ?? []), i]);
    const toRate: RatingUnit[] = [];
    for (const [unitId, unitItems] of units) {
      if (!unitHasSpeech(unitItems)) continue;
      const kind = unitItems[0].kind;
      if (!isRatedKind(kind)) continue;
      const ordered = unitItems.map((i) => byId.get(i.questionId)!).sort((a, b) => (a.orderInGroup ?? 0) - (b.orderInGroup ?? 0));
      const first = ordered[0];
      toRate.push({
        id: unitId,
        kind,
        task: kind === "roleplay" ? (first.itemGroup?.text ?? first.prompt) : first.prompt,
        reference: ordered.map((q) => q.expectedAnswer).filter(Boolean).join(" ") || null,
        turns:
          kind === "roleplay"
            ? ordered.flatMap((q) => [
                { speaker: "Customer" as const, text: spokenLines(q.passage) },
                { speaker: "Candidate" as const, text: state.speech[q.id]?.transcript ?? "" },
              ])
            : [{ speaker: "Candidate" as const, text: state.speech[first.id]?.transcript ?? "" }],
      });
    }
    if (toRate.length) {
      const rated = await createGeminiAssessmentProvider(geminiKey).rateUnits(toRate);
      state.ratings = rated.ratings;
      state.costUsd += estimateAnalysisCostUsd(rated.inputTokens, rated.outputTokens);
    } else state.ratings = {};
  }

  // 4. The score.
  const result = computeSupportResult(items, state.ratings);
  const done: SupportReportState = { ...state, status: "done", result };
  await save(sessionId, done);
  return { status: "done", result };
}
