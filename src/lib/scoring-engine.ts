// Transparent, rule-based scoring. Every number here comes from either a
// deterministic measurement (word count, WPM, filler rate, MCQ
// correctness, proctoring event counts) or a bounded 3-value AI rating
// ("strong"/"adequate"/"weak") run through a fixed lookup table defined
// right here in code. No AI call is ever asked for a 0-100 number, and no
// single free-text sentence ever determines a score - see
// gemini-analysis-provider.ts's `rating` fields for the only AI input this
// engine accepts.
//
// A category with no supporting data returns score: null and says so -
// never a fabricated number.

import type { Rating, VoiceAnalysisResult } from "@/lib/providers/gemini-analysis-provider";
import type { PaceClassification } from "@/lib/speech-metrics";

export const SCORE_CATEGORIES = [
  "PRONUNCIATION",
  "FLUENCY",
  "RATE_OF_SPEECH",
  "GRAMMAR",
  "VOCABULARY",
  "VOICE_CLARITY",
  "LISTENING",
  "COMPREHENSION",
  "CUSTOMER_HANDLING",
  "RESPONSE_QUALITY",
  "PROCTORING_INTEGRITY",
] as const;

export type ScoreCategory = (typeof SCORE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ScoreCategory, string> = {
  PRONUNCIATION: "Pronunciation",
  FLUENCY: "Fluency",
  RATE_OF_SPEECH: "Rate of Speech",
  GRAMMAR: "Grammar",
  VOCABULARY: "Vocabulary",
  VOICE_CLARITY: "Voice Clarity",
  LISTENING: "Listening",
  COMPREHENSION: "Comprehension",
  CUSTOMER_HANDLING: "Customer Handling",
  RESPONSE_QUALITY: "Speaking / Response Quality",
  PROCTORING_INTEGRITY: "Proctoring Integrity",
};

export interface CategoryScore {
  score: number | null;
  basis: string;
}

export interface ScoreReportResult {
  overallScore: number | null;
  categories: Record<ScoreCategory, CategoryScore>;
}

// --- Fixed lookup tables (the "structured scoring rules") ---

// Exported so a single attempt's own results page (Phase 6) can show a
// real per-category number for that one response, using the exact same
// deterministic mapping the session-level scoring engine uses below -
// never a separately invented number.
export const RATING_SCORE: Record<Rating, number> = { strong: 90, adequate: 65, weak: 35 };

export const PACE_SCORE: Record<PaceClassification, number> = {
  balanced: 100,
  fast: 75,
  too_slow: 70,
  very_fast: 45,
};

// Proctoring point deductions. Only genuine flags are deducted - the
// "returned to normal" events (TAB_VISIBLE, WINDOW_FOCUS, FACE_REAPPEARED)
// are informational, not violations, and cost nothing.
const PROCTORING_DEDUCTIONS: Record<string, number> = {
  TAB_HIDDEN: 3,
  WINDOW_BLUR: 2,
  FULLSCREEN_EXIT: 8,
  MULTIPLE_FACES: 15,
  FACE_NOT_DETECTED: 5,
  NAVIGATION_ATTEMPT: 5,
  COPY_ATTEMPT: 3,
  PASTE_ATTEMPT: 3,
  CUT_ATTEMPT: 3,
  MIC_DISCONNECTED: 10,
  EXTENDED_SILENCE: 1,
};

function fillerRateScore(fillerCount: number, wordCount: number): number {
  if (wordCount === 0) return 50;
  const per100 = (fillerCount / wordCount) * 100;
  if (per100 === 0) return 100;
  if (per100 <= 2) return 85;
  if (per100 <= 5) return 65;
  return 40;
}

function issueRateScore(issueCount: number, wordCount: number): number {
  if (wordCount === 0) return 50;
  const per100 = (issueCount / wordCount) * 100;
  if (per100 === 0) return 100;
  if (per100 <= 1.5) return 80;
  if (per100 <= 4) return 60;
  return 35;
}

function avg(nums: number[]): number | null {
  const valid = nums.filter((n) => Number.isFinite(n));
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

export interface AnalyzedVoiceAttempt {
  category: string;
  wordCount: number;
  fillerCount: number;
  pace: PaceClassification;
  ai: VoiceAnalysisResult;
}

export interface ScoredMcqAttempt {
  category: string;
  score: number; // 0 or 100, from real deterministic scoring at answer time
}

export interface ProctoringEventInput {
  eventType: string;
}

export function computeScoreReport({
  analyzedVoiceAttempts,
  mcqAttempts,
  unanalyzedVoiceCount,
  proctoringEvents,
}: {
  analyzedVoiceAttempts: AnalyzedVoiceAttempt[];
  mcqAttempts: ScoredMcqAttempt[];
  unanalyzedVoiceCount: number;
  proctoringEvents: ProctoringEventInput[];
}): ScoreReportResult {
  const mcqAvgFor = (category: string) => {
    const scores = mcqAttempts.filter((a) => a.category === category).map((a) => a.score);
    return { value: avg(scores), count: scores.length };
  };

  const pending =
    unanalyzedVoiceCount > 0
      ? ` (${unanalyzedVoiceCount} recorded response${unanalyzedVoiceCount === 1 ? "" : "s"} not yet analyzed - analyze them for a fuller score)`
      : "";

  // RATE_OF_SPEECH - purely deterministic pace classification.
  const paceScores = analyzedVoiceAttempts.map((a) => PACE_SCORE[a.pace]);
  const rateOfSpeech: CategoryScore = {
    score: avg(paceScores),
    basis:
      paceScores.length > 0
        ? `Calculated from real speech rate across ${paceScores.length} analyzed response${paceScores.length === 1 ? "" : "s"}.${pending}`
        : `No analyzed voice responses yet.${pending}`,
  };

  // FLUENCY - blend of deterministic filler rate and AI fluency rating.
  const fluencyScores = analyzedVoiceAttempts.map((a) => {
    const det = fillerRateScore(a.fillerCount, a.wordCount);
    const aiScore = RATING_SCORE[a.ai.fluency?.rating];
    return aiScore ? (det + aiScore) / 2 : det;
  });
  const fluency: CategoryScore = {
    score: avg(fluencyScores),
    basis:
      fluencyScores.length > 0
        ? `Blend of real filler-word rate and AI fluency rating across ${fluencyScores.length} response${fluencyScores.length === 1 ? "" : "s"}.${pending}`
        : `No analyzed voice responses yet.${pending}`,
  };

  // PRONUNCIATION - AI rating, penalized by count of flagged words.
  const pronScores = analyzedVoiceAttempts.map((a) => {
    const base = RATING_SCORE[a.ai.pronunciation?.rating] ?? 65;
    const penalty = Math.min(20, (a.ai.pronunciation?.mispronouncedWords?.length ?? 0) * 5);
    return Math.max(0, base - penalty);
  });
  const pronunciation: CategoryScore = {
    score: avg(pronScores),
    basis:
      pronScores.length > 0
        ? `AI rating from audio, adjusted for flagged words, across ${pronScores.length} response${pronScores.length === 1 ? "" : "s"}.${pending}`
        : `No analyzed voice responses yet.${pending}`,
  };

  // VOICE_CLARITY - AI rating only (no deterministic audio-clarity signal available).
  const clarityScores = analyzedVoiceAttempts.map((a) => RATING_SCORE[a.ai.voiceClarity?.rating]).filter((n): n is number => !!n);
  const voiceClarity: CategoryScore = {
    score: avg(clarityScores),
    basis:
      clarityScores.length > 0
        ? `AI rating from audio across ${clarityScores.length} response${clarityScores.length === 1 ? "" : "s"}.${pending}`
        : `No analyzed voice responses yet.${pending}`,
  };

  // GRAMMAR - combines MCQ Grammar-section score with AI-detected issue rate on voice responses.
  const mcqGrammar = mcqAvgFor("GRAMMAR");
  const voiceGrammarScores = analyzedVoiceAttempts.map((a) => {
    const det = issueRateScore(a.ai.grammar?.issues?.length ?? 0, a.wordCount);
    const aiScore = RATING_SCORE[a.ai.grammar?.rating];
    return aiScore ? (det + aiScore) / 2 : det;
  });
  const grammarParts = [
    ...(mcqGrammar.value !== null ? [mcqGrammar.value] : []),
    ...(voiceGrammarScores.length > 0 ? [avg(voiceGrammarScores)!] : []),
  ];
  const grammar: CategoryScore = {
    score: avg(grammarParts),
    basis:
      grammarParts.length > 0
        ? `From ${mcqGrammar.count} grammar question${mcqGrammar.count === 1 ? "" : "s"} and ${voiceGrammarScores.length} analyzed voice response${voiceGrammarScores.length === 1 ? "" : "s"}.${pending}`
        : `No grammar questions or analyzed voice responses yet.${pending}`,
  };

  // VOCABULARY - same pattern as grammar.
  const mcqVocab = mcqAvgFor("VOCABULARY");
  const voiceVocabScores = analyzedVoiceAttempts.map((a) => {
    const repetitionPenalty = Math.min(20, (a.ai.vocabulary?.repetitiveWords?.length ?? 0) * 5);
    const aiScore = RATING_SCORE[a.ai.vocabulary?.rating] ?? 65;
    return Math.max(0, aiScore - repetitionPenalty);
  });
  const vocabParts = [
    ...(mcqVocab.value !== null ? [mcqVocab.value] : []),
    ...(voiceVocabScores.length > 0 ? [avg(voiceVocabScores)!] : []),
  ];
  const vocabulary: CategoryScore = {
    score: avg(vocabParts),
    basis:
      vocabParts.length > 0
        ? `From ${mcqVocab.count} vocabulary question${mcqVocab.count === 1 ? "" : "s"} and ${voiceVocabScores.length} analyzed voice response${voiceVocabScores.length === 1 ? "" : "s"}.${pending}`
        : `No vocabulary questions or analyzed voice responses yet.${pending}`,
  };

  // LISTENING and COMPREHENSION - purely deterministic MCQ correctness.
  const listeningAvg = mcqAvgFor("LISTENING");
  const listening: CategoryScore = {
    score: listeningAvg.value,
    basis:
      listeningAvg.count > 0
        ? `Calculated from ${listeningAvg.count} listening question${listeningAvg.count === 1 ? "" : "s"} answered.`
        : "No listening questions answered yet.",
  };
  const comprehensionAvg = mcqAvgFor("READING_COMPREHENSION");
  const comprehension: CategoryScore = {
    score: comprehensionAvg.value,
    basis:
      comprehensionAvg.count > 0
        ? `Calculated from ${comprehensionAvg.count} reading comprehension question${comprehensionAvg.count === 1 ? "" : "s"} answered.`
        : "No reading comprehension questions answered yet.",
  };

  // CUSTOMER_HANDLING - only from the Customer-Service section's own
  // responses, AND only where the AI itself flagged the content as an
  // actual customer-service exchange (guards against a response that
  // happens to mention a customer in an unrelated section).
  const handlingScores: number[] = [];
  for (const a of analyzedVoiceAttempts) {
    if (a.category !== "CUSTOMER_SERVICE") continue;
    const ch = a.ai.customerHandling;
    if (!ch?.applicable) continue;
    const parts = [ch.empathyRating, ch.relevanceRating, ch.problemSolvingRating]
      .filter((r): r is Rating => r === "strong" || r === "adequate" || r === "weak")
      .map((r) => RATING_SCORE[r]);
    const one = avg(parts);
    if (one !== null) handlingScores.push(one);
  }
  const customerHandling: CategoryScore = {
    score: avg(handlingScores),
    basis:
      handlingScores.length > 0
        ? `AI rating across ${handlingScores.length} customer-service response${handlingScores.length === 1 ? "" : "s"}.${pending}`
        : `No analyzed customer-service responses yet.${pending}`,
  };

  // RESPONSE_QUALITY - AI delivery rating, overridden to "weak" for near-empty answers.
  const responseQualityScores = analyzedVoiceAttempts.map((a) => {
    if (a.wordCount < 5) return RATING_SCORE.weak;
    return RATING_SCORE[a.ai.delivery?.rating] ?? 65;
  });
  const responseQuality: CategoryScore = {
    score: avg(responseQualityScores),
    basis:
      responseQualityScores.length > 0
        ? `AI delivery rating, floored for near-empty answers, across ${responseQualityScores.length} response${responseQualityScores.length === 1 ? "" : "s"}.${pending}`
        : `No analyzed voice responses yet.${pending}`,
  };

  // PROCTORING_INTEGRITY - purely deterministic deduction table.
  let deduction = 0;
  let flagCount = 0;
  for (const e of proctoringEvents) {
    const points = PROCTORING_DEDUCTIONS[e.eventType];
    if (points) {
      deduction += points;
      flagCount += 1;
    }
  }
  const proctoringIntegrity: CategoryScore = {
    score: Math.max(0, 100 - deduction),
    basis:
      flagCount > 0
        ? `100 minus fixed deductions for ${flagCount} proctoring flag${flagCount === 1 ? "" : "s"} this session.`
        : "No proctoring flags this session.",
  };

  const categories: Record<ScoreCategory, CategoryScore> = {
    PRONUNCIATION: pronunciation,
    FLUENCY: fluency,
    RATE_OF_SPEECH: rateOfSpeech,
    GRAMMAR: grammar,
    VOCABULARY: vocabulary,
    VOICE_CLARITY: voiceClarity,
    LISTENING: listening,
    COMPREHENSION: comprehension,
    CUSTOMER_HANDLING: customerHandling,
    RESPONSE_QUALITY: responseQuality,
    PROCTORING_INTEGRITY: proctoringIntegrity,
  };

  const overallScore = avg(
    SCORE_CATEGORIES.map((c) => categories[c].score).filter((s): s is number => s !== null)
  );

  return { overallScore, categories };
}
