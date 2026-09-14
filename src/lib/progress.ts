// Deterministic progress aggregation (Phase 16) - free, pure arithmetic
// over already-persisted rows (PracticeAttempt, ScoreReport). No AI call of
// any kind: this page is a historical record, not a judgment, so every
// number here is a direct count or average of real rows.

import { db } from "@/lib/db";
import { computeCoachProfile, type CategoryTrend } from "@/lib/coach-profile";
import { PRACTICE_MODES } from "@/lib/practice-taxonomy";
import type { ScoreCategory } from "@/lib/scoring-engine";

export interface OverallTrendPoint {
  sessionId: string;
  date: string;
  overallScore: number | null;
}

export interface PracticeByCategory {
  category: string;
  label: string;
  requiresVoice: boolean;
  attemptCount: number;
  correctRate: number | null; // only meaningful for auto-graded (non-voice) categories
  voiceAnalyzedCount: number | null; // only meaningful for voice categories
}

export interface ProgressData {
  mockSessionsCompleted: number;
  overallTrend: OverallTrendPoint[];
  categories: Record<ScoreCategory, CategoryTrend>;
  weakest: { category: ScoreCategory; average: number }[];
  strongest: { category: ScoreCategory; average: number }[];
  totalPracticeAttempts: number;
  practiceByCategory: PracticeByCategory[];
}

export async function getProgressData(userId: string): Promise<ProgressData> {
  const [coachProfile, sessions, attempts] = await Promise.all([
    computeCoachProfile(userId),
    db.mockTestSession.findMany({
      where: { userId, scoreReport: { isNot: null } },
      orderBy: { startedAt: "asc" },
      select: { id: true, startedAt: true, scoreReport: { select: { overallScore: true } } },
    }),
    db.practiceAttempt.findMany({
      where: { userId },
      select: { category: true, isCorrect: true, recordingId: true, analysis: { select: { id: true } } },
    }),
  ]);

  const overallTrend: OverallTrendPoint[] = sessions.map((s) => ({
    sessionId: s.id,
    date: s.startedAt.toISOString(),
    overallScore: s.scoreReport?.overallScore ?? null,
  }));

  const byCategory = new Map<string, { total: number; correct: number; graded: number; voiceTotal: number; voiceAnalyzed: number }>();
  for (const a of attempts) {
    const entry = byCategory.get(a.category) ?? { total: 0, correct: 0, graded: 0, voiceTotal: 0, voiceAnalyzed: 0 };
    entry.total += 1;
    if (a.isCorrect !== null) {
      entry.graded += 1;
      if (a.isCorrect) entry.correct += 1;
    }
    if (a.recordingId) {
      entry.voiceTotal += 1;
      if (a.analysis) entry.voiceAnalyzed += 1;
    }
    byCategory.set(a.category, entry);
  }

  const practiceByCategory: PracticeByCategory[] = PRACTICE_MODES.map((mode) => {
    const entry = byCategory.get(mode.category);
    return {
      category: mode.category,
      label: mode.label,
      requiresVoice: mode.requiresVoice,
      attemptCount: entry?.total ?? 0,
      correctRate: entry && entry.graded > 0 ? Math.round((entry.correct / entry.graded) * 100) : null,
      voiceAnalyzedCount: entry && mode.requiresVoice ? entry.voiceAnalyzed : null,
    };
  }).filter((c) => c.attemptCount > 0);

  return {
    mockSessionsCompleted: coachProfile.sessionsCompleted,
    overallTrend,
    categories: coachProfile.categories,
    weakest: coachProfile.weakest,
    strongest: coachProfile.strongest,
    totalPracticeAttempts: attempts.length,
    practiceByCategory,
  };
}
