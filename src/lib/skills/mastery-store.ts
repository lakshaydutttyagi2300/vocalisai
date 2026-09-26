// Reads a user's skill-tagged attempts, turns them into mastery scores
// (src/lib/skills/mastery.ts) and keeps UserSkillMastery in sync. Only
// rows whose numbers actually changed are written.

import { db } from "@/lib/db";
import { PACE_SCORE, RATING_SCORE } from "@/lib/scoring-engine";
import {
  attemptCredit,
  computeMastery,
  selfAndAncestors,
  type MasteryAttempt,
  type MasteryResult,
} from "@/lib/skills/mastery";

const SPEECH_DIMENSIONS = ["pronunciation", "fluency", "grammar", "vocabulary", "voiceClarity"] as const;

/**
 * The same "Overall" the voice results page shows: the average of the five
 * AI ratings and the measured pace. Null when the analysis can't be read -
 * never a guessed number.
 */
export function speechOverallScore(analysis: { aiAnalysisJson: string; paceClassification: string } | null): number | null {
  if (!analysis) return null;
  try {
    const ai = JSON.parse(analysis.aiAnalysisJson) as Record<string, { rating?: string } | undefined>;
    const parts: number[] = [];
    for (const key of SPEECH_DIMENSIONS) {
      const rating = ai[key]?.rating as keyof typeof RATING_SCORE | undefined;
      if (!rating || !(rating in RATING_SCORE)) return null;
      parts.push(RATING_SCORE[rating]);
    }
    const pace = PACE_SCORE[analysis.paceClassification as keyof typeof PACE_SCORE];
    if (pace === undefined) return null;
    parts.push(pace);
    return Math.round(parts.reduce((s, n) => s + n, 0) / parts.length);
  } catch {
    return null;
  }
}

type AttemptRow = {
  skillId: string | null;
  level: number | null;
  isCorrect: boolean | null;
  score: number | null;
  createdAt: Date;
  analysis: { aiAnalysisJson: string; paceClassification: string } | null;
};

async function loadAttempts(userId: string, categoryCode?: string): Promise<AttemptRow[]> {
  return db.practiceAttempt.findMany({
    where: { userId, skillId: categoryCode ? { startsWith: `${categoryCode}` } : { not: null } },
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      skillId: true,
      level: true,
      isCorrect: true,
      score: true,
      createdAt: true,
      analysis: { select: { aiAnalysisJson: true, paceClassification: true } },
    },
  });
}

/** Groups attempts under their own node and every ancestor, skipping ungraded ones. */
function byNode(attempts: AttemptRow[], only?: Set<string>): Map<string, MasteryAttempt[]> {
  const map = new Map<string, MasteryAttempt[]>();
  for (const a of attempts) {
    if (!a.skillId) continue;
    const credit = attemptCredit(a) ?? (() => {
      const s = speechOverallScore(a.analysis);
      return s === null ? null : s / 100;
    })();
    if (credit === null) continue;
    for (const node of selfAndAncestors(a.skillId)) {
      if (only && !only.has(node)) continue;
      const list = map.get(node) ?? [];
      list.push({ credit, level: a.level, at: a.createdAt });
      map.set(node, list);
    }
  }
  return map;
}

export async function saveMastery(userId: string, results: Map<string, MasteryResult>) {
  if (results.size === 0) return;
  const existing = await db.userSkillMastery.findMany({ where: { userId, skillId: { in: [...results.keys()] } } });
  const cur = new Map(existing.map((r) => [r.skillId, r]));
  for (const [skillId, m] of results) {
    const data = {
      score: m.score,
      band: m.band,
      attempts: m.attempts,
      correct: m.correct,
      levelsSeen: JSON.stringify(m.levelsSeen),
      lastAttemptAt: m.lastAttemptAt,
    };
    const row = cur.get(skillId);
    if (
      row &&
      row.score === data.score &&
      row.band === data.band &&
      row.attempts === data.attempts &&
      row.correct === data.correct &&
      row.levelsSeen === data.levelsSeen &&
      (row.lastAttemptAt?.getTime() ?? null) === (data.lastAttemptAt?.getTime() ?? null)
    ) {
      continue;
    }
    await db.userSkillMastery.upsert({
      where: { userId_skillId: { userId, skillId } },
      create: { userId, skillId, ...data },
      update: data,
    });
  }
}

/** After one answer: the new results for that skill and its ancestors (one query, nothing saved). */
export async function masteryAfterAttempt(userId: string, skillId: string): Promise<Map<string, MasteryResult>> {
  const nodes = new Set(selfAndAncestors(skillId));
  const grouped = byNode(await loadAttempts(userId, skillId.split(".")[0]), nodes);
  const results = new Map<string, MasteryResult>();
  for (const [node, list] of grouped) results.set(node, computeMastery(list));
  return results;
}

/** Compute and save in one go. Returns the skill's own new result. */
export async function updateMasteryAfterAttempt(userId: string, skillId: string): Promise<MasteryResult | null> {
  const results = await masteryAfterAttempt(userId, skillId);
  await saveMastery(userId, results);
  return results.get(skillId) ?? null;
}

/**
 * Recomputes every node for a user (the dashboard calls this, which also
 * back-fills history from before mastery existed). Writes only changes.
 */
export async function reconcileUserMastery(userId: string): Promise<Map<string, MasteryResult>> {
  const grouped = byNode(await loadAttempts(userId));
  const results = new Map<string, MasteryResult>();
  for (const [node, list] of grouped) results.set(node, computeMastery(list));
  await saveMastery(userId, results);
  return results;
}
