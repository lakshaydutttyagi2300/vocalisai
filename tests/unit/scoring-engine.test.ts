import { describe, expect, it } from "vitest";
import { computeScoreReport } from "@/lib/scoring-engine";
import type { VoiceAnalysisResult } from "@/lib/providers/gemini-analysis-provider";

function voiceResult(overrides: Partial<VoiceAnalysisResult> = {}): VoiceAnalysisResult {
  return {
    pronunciation: { rating: "strong", mispronouncedWords: [], articulation: "", difficultSounds: [], intelligibility: "" },
    fluency: { rating: "strong", hesitations: "", fillers: "", repetitions: "", longPauses: "", smoothness: "" },
    grammar: { rating: "strong", issues: [], overallComment: "" },
    vocabulary: { rating: "strong", assessment: "", professionalTermsUsed: [], repetitiveWords: [] },
    voiceClarity: { rating: "strong", articulation: "", volumeComment: "", clarity: "", intelligibility: "" },
    delivery: { rating: "strong", confidenceIndicators: "", vocalVariation: "", engagement: "", responseCompleteness: "" },
    customerHandling: { applicable: false, empathyRating: "not_applicable", relevanceRating: "not_applicable", problemSolvingRating: "not_applicable", comment: "" },
    ...overrides,
  };
}

describe("computeScoreReport", () => {
  it("has only PROCTORING_INTEGRITY (a clean 100, no flags) when there is no other data at all", () => {
    const report = computeScoreReport({
      analyzedVoiceAttempts: [],
      mcqAttempts: [],
      unanalyzedVoiceCount: 0,
      proctoringEvents: [],
    });

    expect(report.categories.PRONUNCIATION.score).toBeNull();
    expect(report.categories.LISTENING.score).toBeNull();
    expect(report.categories.PROCTORING_INTEGRITY.score).toBe(100);
    // PROCTORING_INTEGRITY is the only category with a real number, so it
    // alone determines the overall weighted average.
    expect(report.overallScore).toBe(100);
  });

  it("scores LISTENING and COMPREHENSION purely from MCQ correctness", () => {
    const report = computeScoreReport({
      analyzedVoiceAttempts: [],
      mcqAttempts: [
        { category: "LISTENING", score: 100 },
        { category: "LISTENING", score: 0 },
        { category: "READING_COMPREHENSION", score: 100 },
      ],
      unanalyzedVoiceCount: 0,
      proctoringEvents: [],
    });

    expect(report.categories.LISTENING.score).toBe(50);
    expect(report.categories.COMPREHENSION.score).toBe(100);
  });

  it("deducts fixed, known points per proctoring flag and never goes below 0", () => {
    const report = computeScoreReport({
      analyzedVoiceAttempts: [],
      mcqAttempts: [],
      unanalyzedVoiceCount: 0,
      proctoringEvents: [{ eventType: "FULLSCREEN_EXIT" }, { eventType: "TAB_HIDDEN" }],
    });

    // 100 - 8 (FULLSCREEN_EXIT) - 3 (TAB_HIDDEN) = 89
    expect(report.categories.PROCTORING_INTEGRITY.score).toBe(89);

    const heavilyFlagged = computeScoreReport({
      analyzedVoiceAttempts: [],
      mcqAttempts: [],
      unanalyzedVoiceCount: 0,
      proctoringEvents: Array.from({ length: 20 }, () => ({ eventType: "MULTIPLE_FACES" })),
    });
    expect(heavilyFlagged.categories.PROCTORING_INTEGRITY.score).toBe(0);
  });

  it("floors RESPONSE_QUALITY to weak for near-empty voice responses regardless of AI rating", () => {
    const report = computeScoreReport({
      analyzedVoiceAttempts: [
        {
          category: "SPEAKING",
          wordCount: 2,
          fillerCount: 0,
          pace: "balanced",
          ai: voiceResult({ delivery: { rating: "strong", confidenceIndicators: "", vocalVariation: "", engagement: "", responseCompleteness: "" } }),
        },
      ],
      mcqAttempts: [],
      unanalyzedVoiceCount: 0,
      proctoringEvents: [],
    });

    expect(report.categories.RESPONSE_QUALITY.score).toBe(35); // RATING_SCORE.weak
  });

  it("excludes a category entirely from the overall average when its weight is 0", () => {
    const withDefault = computeScoreReport({
      analyzedVoiceAttempts: [],
      mcqAttempts: [{ category: "LISTENING", score: 0 }],
      unanalyzedVoiceCount: 0,
      proctoringEvents: [],
    });
    const withZeroWeight = computeScoreReport({
      analyzedVoiceAttempts: [],
      mcqAttempts: [{ category: "LISTENING", score: 0 }],
      unanalyzedVoiceCount: 0,
      proctoringEvents: [],
      categoryWeights: { LISTENING: 0 },
    });

    // Only LISTENING (0) and PROCTORING_INTEGRITY (100, no flags) have
    // real scores. Default weight 1 averages them: (0 + 100) / 2 = 50.
    // Weight 0 excludes LISTENING, leaving PROCTORING_INTEGRITY alone: 100.
    expect(withDefault.overallScore).toBe(50);
    expect(withZeroWeight.overallScore).toBe(100);
  });

  it("only credits CUSTOMER_HANDLING for CUSTOMER_SERVICE responses the AI itself flagged as applicable", () => {
    const report = computeScoreReport({
      analyzedVoiceAttempts: [
        {
          category: "SPEAKING", // not CUSTOMER_SERVICE
          wordCount: 20,
          fillerCount: 0,
          pace: "balanced",
          ai: voiceResult({ customerHandling: { applicable: true, empathyRating: "strong", relevanceRating: "strong", problemSolvingRating: "strong", comment: "" } }),
        },
      ],
      mcqAttempts: [],
      unanalyzedVoiceCount: 0,
      proctoringEvents: [],
    });

    expect(report.categories.CUSTOMER_HANDLING.score).toBeNull();
  });
});
