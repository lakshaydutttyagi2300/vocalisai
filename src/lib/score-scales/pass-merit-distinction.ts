// PASS_MERIT_DISTINCTION: the simple categorical scale used by many
// vocational/employment-style assessments (e.g. aptitude and BPO/MNC
// role-readiness tests) - a plain, editable threshold table over this
// platform's own 0-100 rule-based score, no external scale involved at
// all (so nothing here is even an approximation of a third party's
// system - it's this platform's own grading band).
import type { ScaleResult } from "./types";

export const PMD_LEVELS = ["NOT_YET_PASSING", "PASS", "MERIT", "DISTINCTION"] as const;
export type PmdLevel = (typeof PMD_LEVELS)[number];

export interface PmdThreshold {
  minScore: number; // inclusive, out of 100
  level: PmdLevel;
}

export const PMD_THRESHOLD_TABLE: PmdThreshold[] = [
  { minScore: 0, level: "NOT_YET_PASSING" },
  { minScore: 50, level: "PASS" },
  { minScore: 70, level: "MERIT" },
  { minScore: 85, level: "DISTINCTION" },
];

export const PMD_LABELS: Record<PmdLevel, string> = {
  NOT_YET_PASSING: "Not yet passing",
  PASS: "Pass",
  MERIT: "Merit",
  DISTINCTION: "Distinction",
};

export function scoreToPmd(score0to100: number): PmdLevel {
  const clamped = Math.max(0, Math.min(100, score0to100));
  const descending = [...PMD_THRESHOLD_TABLE].sort((a, b) => b.minScore - a.minScore);
  for (const t of descending) {
    if (clamped >= t.minScore) return t.level;
  }
  return "NOT_YET_PASSING";
}

export function toScaleResult(level: PmdLevel): ScaleResult {
  return { scale: "PASS_MERIT_DISTINCTION", label: PMD_LABELS[level], value: level, isEstimate: true };
}
