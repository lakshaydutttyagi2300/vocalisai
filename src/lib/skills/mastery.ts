// Skill mastery (Phase 2): a 0-100 score per skill from weighted accuracy,
// recency and difficulty - deliberately simple and explainable, no IRT.
//
//  - Recency: each attempt's weight halves every HALF_LIFE_DAYS, so recent
//    work counts most and old mistakes fade.
//  - Difficulty: a correct answer at a higher level earns more credit, and
//    a miss at a higher level costs less (d = 0.75 + 0.1 x (level - 1)).
//  - Partial credit: voice/written answers scored 0-100 by AI analysis
//    count as a fraction of a correct answer.
//
// Only the latest MAX_ATTEMPTS attempts per node are used. Scores roll up:
// an attempt on ENG.GRM.TENSES also counts towards ENG.GRM and ENG.

export const HALF_LIFE_DAYS = 14;
export const MAX_ATTEMPTS = 50;
export const MIN_ATTEMPTS_FOR_BAND = 5;

export const BANDS = ["UNRATED", "WEAK", "DEVELOPING", "PROFICIENT", "MASTERED"] as const;
export type Band = (typeof BANDS)[number];

export const BAND_LABELS: Record<Band, string> = {
  UNRATED: "Not enough data",
  WEAK: "Weak",
  DEVELOPING: "Developing",
  PROFICIENT: "Proficient",
  MASTERED: "Mastered",
};

export interface MasteryAttempt {
  /** 0..1 - 1 for correct, 0 for wrong, a fraction for AI-scored answers. */
  credit: number;
  /** L1-L6; null means "unknown", treated as L3 (neutral). */
  level: number | null;
  at: Date;
}

export interface MasteryResult {
  score: number; // 0-100, one decimal
  band: Band;
  attempts: number;
  correct: number;
  levelsSeen: number[];
  lastAttemptAt: Date | null;
}

export function difficultyFactor(level: number | null): number {
  const l = Math.min(6, Math.max(1, level ?? 3));
  return 0.75 + 0.1 * (l - 1);
}

export function recencyWeight(at: Date, now: Date): number {
  const days = Math.max(0, (now.getTime() - at.getTime()) / 86_400_000);
  return Math.pow(0.5, days / HALF_LIFE_DAYS);
}

export function bandFor(score: number, attempts: number, distinctLevels: number): Band {
  if (attempts < MIN_ATTEMPTS_FOR_BAND) return "UNRATED";
  if (score >= 90) return distinctLevels >= 2 ? "MASTERED" : "PROFICIENT";
  if (score >= 75) return "PROFICIENT";
  if (score >= 50) return "DEVELOPING";
  return "WEAK";
}

export function computeMastery(input: MasteryAttempt[], now = new Date()): MasteryResult {
  const recent = [...input].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, MAX_ATTEMPTS);
  let earned = 0;
  let possible = 0;
  let correct = 0;
  const levels = new Set<number>();
  for (const a of recent) {
    const credit = Math.min(1, Math.max(0, a.credit));
    const w = recencyWeight(a.at, now);
    const d = difficultyFactor(a.level);
    // Credit earns w*d; the missing part costs w*(2-d), so a hard miss
    // (large d) costs less than an easy one.
    earned += w * d * credit;
    possible += w * d * credit + w * (2 - d) * (1 - credit);
    if (credit >= 0.75) correct++;
    if (a.level) levels.add(a.level);
  }
  const score = possible > 0 ? Math.round((earned / possible) * 1000) / 10 : 0;
  return {
    score,
    band: bandFor(score, recent.length, levels.size),
    attempts: recent.length,
    correct,
    levelsSeen: [...levels].sort((a, b) => a - b),
    lastAttemptAt: recent[0]?.at ?? null,
  };
}

/** A skill id and every ancestor: "ENG.GRM.TENSES" -> [ENG.GRM.TENSES, ENG.GRM, ENG]. */
export function selfAndAncestors(skillId: string): string[] {
  const parts = skillId.split(".");
  return parts.map((_, i) => parts.slice(0, parts.length - i).join("."));
}

/** Credit for an attempt: exact-answer questions use isCorrect; AI-scored ones use score/100. */
export function attemptCredit(a: { isCorrect: boolean | null; score: number | null }): number | null {
  if (a.isCorrect !== null) return a.isCorrect ? 1 : 0;
  if (a.score !== null) return Math.min(100, Math.max(0, a.score)) / 100;
  return null;
}
