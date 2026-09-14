// Everything here is computed by application code from real data (the
// transcript text and the transcription provider's own segment timestamps)
// - never estimated, never asked of the AI model. WPM, filler counts,
// repetition counts and pause locations are all deterministic and
// reproducible from the same inputs.

import type { TranscriptionSegment } from "@/lib/providers/groq-whisper-provider";

export type PaceClassification = "too_slow" | "balanced" | "fast" | "very_fast";

const FILLER_WORDS = ["um", "umm", "uh", "uhh", "you know", "like", "actually", "basically"];
const LONG_PAUSE_THRESHOLD_SECONDS = 2.0;

export function countWords(transcript: string): number {
  return transcript.split(/\s+/).filter(Boolean).length;
}

export function calculateWpm(wordCount: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  return Number(((wordCount / durationSeconds) * 60).toFixed(1));
}

export function classifyPace(wpm: number): PaceClassification {
  if (wpm < 110) return "too_slow";
  if (wpm <= 160) return "balanced";
  if (wpm <= 190) return "fast";
  return "very_fast";
}

export const PACE_LABELS: Record<PaceClassification, string> = {
  too_slow: "Too slow",
  balanced: "Balanced",
  fast: "Fast",
  very_fast: "Very fast",
};

export function detectFillers(transcript: string): { total: number; byWord: Record<string, number> } {
  const lower = transcript.toLowerCase();
  const byWord: Record<string, number> = {};
  let total = 0;
  for (const filler of FILLER_WORDS) {
    const re = new RegExp(`\\b${filler.replace(" ", "\\s+")}\\b`, "g");
    const matches = lower.match(re);
    const n = matches ? matches.length : 0;
    if (n > 0) {
      byWord[filler] = n;
      total += n;
    }
  }
  return { total, byWord };
}

// Immediate verbatim word repetition ("I I want", "the the customer") -
// a real, simple, deterministic signal. Broader lexical repetition/word
// variety is judged qualitatively by the AI from the transcript instead,
// since that needs actual language judgment, not string matching.
export function detectRepetitions(transcript: string): { count: number; examples: string[] } {
  const words = transcript.toLowerCase().match(/[a-z']+/g) ?? [];
  const examples: string[] = [];
  let count = 0;
  for (let i = 1; i < words.length; i++) {
    if (words[i] === words[i - 1]) {
      count += 1;
      if (examples.length < 5) examples.push(`"${words[i - 1]} ${words[i]}"`);
    }
  }
  return { count, examples };
}

export interface LongPause {
  afterText: string;
  beforeText: string;
  gapSeconds: number;
  atSeconds: number;
}

// Real gaps between consecutive transcription segments - not simulated.
// Requires the provider to return segment timestamps (Groq's verbose_json
// does, for free, as part of transcription - no extra API call or cost).
export function detectLongPauses(segments: TranscriptionSegment[]): LongPause[] {
  const pauses: LongPause[] = [];
  for (let i = 1; i < segments.length; i++) {
    const gap = segments[i].start - segments[i - 1].end;
    if (gap >= LONG_PAUSE_THRESHOLD_SECONDS) {
      pauses.push({
        afterText: segments[i - 1].text.trim(),
        beforeText: segments[i].text.trim(),
        gapSeconds: Number(gap.toFixed(1)),
        atSeconds: Number(segments[i - 1].end.toFixed(1)),
      });
    }
  }
  return pauses;
}

export interface DeterministicSpeechMetrics {
  wordCount: number;
  durationSeconds: number;
  wpm: number;
  pace: PaceClassification;
  fillers: { total: number; byWord: Record<string, number> };
  repetitions: { count: number; examples: string[] };
  longPauses: LongPause[];
}

export function computeDeterministicMetrics(
  transcript: string,
  durationSeconds: number,
  segments: TranscriptionSegment[]
): DeterministicSpeechMetrics {
  const wordCount = countWords(transcript);
  const wpm = calculateWpm(wordCount, durationSeconds);
  return {
    wordCount,
    durationSeconds,
    wpm,
    pace: classifyPace(wpm),
    fillers: detectFillers(transcript),
    repetitions: detectRepetitions(transcript),
    longPauses: detectLongPauses(segments),
  };
}

// Combines metrics across multiple recordings (e.g. every candidate turn in
// a multi-turn conversation) into one set - real totals/averages, not a
// re-estimation. Each turn's own segments are used for pause detection
// within that turn only (gaps BETWEEN separate recordings aren't a
// meaningful "pause" the way gaps within one recording are).
export function combineDeterministicMetrics(
  turns: { transcript: string; durationSeconds: number; segments: TranscriptionSegment[] }[]
): DeterministicSpeechMetrics {
  const totalWordCount = turns.reduce((sum, t) => sum + countWords(t.transcript), 0);
  const totalDuration = turns.reduce((sum, t) => sum + t.durationSeconds, 0);
  const wpm = calculateWpm(totalWordCount, totalDuration);

  const combinedFillers: Record<string, number> = {};
  let fillerTotal = 0;
  let repetitionTotal = 0;
  const repetitionExamples: string[] = [];
  const longPauses: LongPause[] = [];

  for (const t of turns) {
    const f = detectFillers(t.transcript);
    fillerTotal += f.total;
    for (const [word, count] of Object.entries(f.byWord)) {
      combinedFillers[word] = (combinedFillers[word] ?? 0) + count;
    }
    const r = detectRepetitions(t.transcript);
    repetitionTotal += r.count;
    repetitionExamples.push(...r.examples);
    longPauses.push(...detectLongPauses(t.segments));
  }

  return {
    wordCount: totalWordCount,
    durationSeconds: totalDuration,
    wpm,
    pace: classifyPace(wpm),
    fillers: { total: fillerTotal, byWord: combinedFillers },
    repetitions: { count: repetitionTotal, examples: repetitionExamples.slice(0, 5) },
    longPauses,
  };
}
