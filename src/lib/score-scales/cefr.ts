// CEFR: the Common European Framework of Reference for Languages (A1-C2)
// is a publicly published, non-proprietary framework (Council of Europe),
// unlike the exam-specific scales in this directory - still labeled an
// estimate here since the mapping from a rule-based 0-100 score to a CEFR
// level is this platform's own approximation, not an official one.
import type { ScaleResult } from "./types";

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export interface CefrThreshold {
  minScore: number; // inclusive, out of 100
  level: CefrLevel;
}

// Editable config, ascending order for readability - descending is used
// internally by the lookup below.
export const CEFR_THRESHOLD_TABLE: CefrThreshold[] = [
  { minScore: 0, level: "A1" },
  { minScore: 20, level: "A2" },
  { minScore: 40, level: "B1" },
  { minScore: 60, level: "B2" },
  { minScore: 75, level: "C1" },
  { minScore: 90, level: "C2" },
];

export function scoreToCefr(score0to100: number): CefrLevel {
  const clamped = Math.max(0, Math.min(100, score0to100));
  const descending = [...CEFR_THRESHOLD_TABLE].sort((a, b) => b.minScore - a.minScore);
  for (const t of descending) {
    if (clamped >= t.minScore) return t.level;
  }
  return "A1";
}

export function toScaleResult(level: CefrLevel): ScaleResult {
  return { scale: "CEFR", label: level, value: level, isEstimate: true };
}
