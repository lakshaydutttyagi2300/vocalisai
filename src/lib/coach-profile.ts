// Deterministic aggregation of a candidate's REAL history across every
// completed mock test session - free, pure arithmetic over already-computed
// ScoreReport rows (Phase 13). This is the only "personalization" the
// Personal AI Coach (Phase 15) is allowed to reason from: no session here
// re-derives or re-judges anything, it only averages numbers that already
// exist. A candidate with zero completed sessions gets an honest empty
// profile, never a fabricated one.

import { db } from "@/lib/db";
import { SCORE_CATEGORIES, CATEGORY_LABELS, type ScoreCategory } from "@/lib/scoring-engine";

export interface CategoryTrend {
  average: number | null;
  latest: number | null;
  trend: "up" | "down" | "flat" | null;
  sessionsWithData: number;
}

export interface CoachProfile {
  sessionsCompleted: number;
  averageOverallScore: number | null;
  latestOverallScore: number | null;
  categories: Record<ScoreCategory, CategoryTrend>;
  weakest: { category: ScoreCategory; average: number }[];
  strongest: { category: ScoreCategory; average: number }[];
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export async function computeCoachProfile(userId: string): Promise<CoachProfile> {
  const reports = await db.scoreReport.findMany({
    where: { mockTestSession: { userId } },
    orderBy: { computedAt: "asc" },
    select: { overallScore: true, categoryScoresJson: true },
  });

  const parsed = reports.map((r) => ({
    overallScore: r.overallScore,
    categories: JSON.parse(r.categoryScoresJson) as Record<ScoreCategory, { score: number | null; basis: string }>,
  }));

  const overallScores = parsed.map((p) => p.overallScore).filter((s): s is number => s !== null);

  const categories: Record<ScoreCategory, CategoryTrend> = {} as Record<ScoreCategory, CategoryTrend>;
  for (const cat of SCORE_CATEGORIES) {
    const scores = parsed.map((p) => p.categories[cat]?.score).filter((s): s is number => s !== null && s !== undefined);
    const latest = scores.length > 0 ? scores[scores.length - 1] : null;
    let trend: CategoryTrend["trend"] = null;
    if (scores.length >= 2) {
      const prevAvg = avg(scores.slice(0, -1))!;
      const diff = scores[scores.length - 1] - prevAvg;
      trend = diff > 3 ? "up" : diff < -3 ? "down" : "flat";
    }
    categories[cat] = { average: avg(scores), latest, trend, sessionsWithData: scores.length };
  }

  const withAverage = SCORE_CATEGORIES.map((cat) => ({ category: cat, average: categories[cat].average }))
    .filter((c): c is { category: ScoreCategory; average: number } => c.average !== null);

  const weakest = [...withAverage].sort((a, b) => a.average - b.average).slice(0, 3);
  const strongest = [...withAverage].sort((a, b) => b.average - a.average).slice(0, 3);

  return {
    sessionsCompleted: parsed.length,
    averageOverallScore: avg(overallScores),
    latestOverallScore: overallScores.length > 0 ? overallScores[overallScores.length - 1] : null,
    categories,
    weakest,
    strongest,
  };
}

// Compact plain-text digest for the AI prompt - keeps token usage low and
// gives the model only real numbers, never raw JSON to reinterpret.
export function describeCoachProfile(profile: CoachProfile): string {
  if (profile.sessionsCompleted === 0) {
    return "This candidate has not completed any mock test sessions yet, so there is no personalized performance history available.";
  }
  const lines: string[] = [
    `Completed mock test sessions: ${profile.sessionsCompleted}`,
    `Average overall score: ${profile.averageOverallScore ?? "N/A"}`,
    `Most recent overall score: ${profile.latestOverallScore ?? "N/A"}`,
  ];
  if (profile.weakest.length > 0) {
    lines.push(
      `Weakest categories (average score): ${profile.weakest
        .map((w) => `${CATEGORY_LABELS[w.category]} (${w.average})`)
        .join(", ")}`
    );
  }
  if (profile.strongest.length > 0) {
    lines.push(
      `Strongest categories (average score): ${profile.strongest
        .map((s) => `${CATEGORY_LABELS[s.category]} (${s.average})`)
        .join(", ")}`
    );
  }
  const trending = SCORE_CATEGORIES.filter((c) => profile.categories[c].trend === "up" || profile.categories[c].trend === "down");
  if (trending.length > 0) {
    lines.push(
      `Recent trend: ${trending
        .map((c) => `${CATEGORY_LABELS[c]} is trending ${profile.categories[c].trend}`)
        .join(", ")}`
    );
  }
  return lines.join("\n");
}
