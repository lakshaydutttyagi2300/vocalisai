// Aggregated, anonymous product signals for the Audience agent: which skill
// areas candidates practise and struggle with, and how many people signed up.
// Counts and averages only - no names, emails or answers ever leave the database.

import { db } from "@/lib/db";

export interface AudienceSignals {
  areas: { area: string; attempts: number; avgScore: number | null }[];
  signupsLast7d: number;
  signupsPrev7d: number;
}

export async function loadAudienceSignals(now = new Date()): Promise<AudienceSignals> {
  const d = (n: number) => new Date(now.getTime() - n * 864e5);
  const groups = await db.practiceAttempt.groupBy({
    by: ["category"], where: { createdAt: { gte: d(30) } }, _count: { _all: true }, _avg: { score: true },
  });
  const [last, prev] = await Promise.all([
    db.user.count({ where: { createdAt: { gte: d(7) }, role: "CANDIDATE" } }),
    db.user.count({ where: { createdAt: { gte: d(14), lt: d(7) }, role: "CANDIDATE" } }),
  ]);
  return {
    areas: groups.filter((g) => g._count._all >= 5)
      .map((g) => ({ area: g.category, attempts: g._count._all, avgScore: g._avg.score === null ? null : Math.round(g._avg.score) }))
      .sort((a, b) => b.attempts - a.attempts).slice(0, 8),
    signupsLast7d: last, signupsPrev7d: prev,
  };
}
