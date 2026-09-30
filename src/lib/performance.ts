// Candidate performance across catalogue tests: by subject, skill and level,
// plus recent test scores (docs/CATALOGUE.md). Server-only.

import { db } from "@/lib/db";
import { DIFFICULTIES } from "@/lib/practice-taxonomy";

export interface AreaStats {
  key: string;
  name: string;
  detail?: string;
  attempts: number;
  correct: number;
  accuracy: number;
  avgSeconds: number;
}

function finish(map: Map<string, { name: string; detail?: string; attempts: number; correct: number; seconds: number }>): AreaStats[] {
  return [...map.entries()]
    .map(([key, v]) => ({ key, name: v.name, detail: v.detail, attempts: v.attempts, correct: v.correct, accuracy: Math.round((v.correct / v.attempts) * 100), avgSeconds: Math.round(v.seconds / v.attempts) }))
    .sort((a, b) => b.attempts - a.attempts);
}

export async function candidatePerformance(userId: string) {
  const [subjects, attempts, tests] = await Promise.all([
    db.catalogSubject.findMany({ select: { id: true, name: true, legacyCategory: true } }),
    db.practiceAttempt.findMany({
      where: { userId, practiceTestId: { not: null }, isCorrect: { not: null } },
      select: {
        isCorrect: true,
        timeTakenSeconds: true,
        difficulty: true,
        question: { select: { subjectId: true, category: true, catalogSkill: { select: { id: true, name: true } } } },
      },
    }),
    db.practiceTest.findMany({
      where: { userId, status: "SUBMITTED" },
      orderBy: { submittedAt: "desc" },
      take: 12,
      select: { id: true, submittedAt: true, scorePercent: true, difficulty: true, mode: true, exam: { select: { name: true } }, subject: { select: { name: true } } },
    }),
  ]);

  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const byLegacy = new Map(subjects.filter((s) => s.legacyCategory).map((s) => [s.legacyCategory!, s.id]));
  const bySubject = new Map<string, { name: string; attempts: number; correct: number; seconds: number }>();
  const bySkill = new Map<string, { name: string; detail?: string; attempts: number; correct: number; seconds: number }>();
  const byLevel = new Map<string, { name: string; attempts: number; correct: number; seconds: number }>();
  const add = <T extends { attempts: number; correct: number; seconds: number }>(map: Map<string, T>, key: string, init: () => T, correct: boolean, seconds: number) => {
    const row = map.get(key) ?? init();
    row.attempts++;
    if (correct) row.correct++;
    row.seconds += seconds;
    map.set(key, row);
  };

  for (const a of attempts) {
    const correct = a.isCorrect === true;
    const subjectId = a.question.subjectId ?? byLegacy.get(a.question.category) ?? null;
    const sName = subjectId ? (subjectName.get(subjectId) ?? "Other") : "Other";
    add(bySubject, subjectId ?? "other", () => ({ name: sName, attempts: 0, correct: 0, seconds: 0 }), correct, a.timeTakenSeconds);
    if (a.question.catalogSkill) {
      const skill = a.question.catalogSkill;
      add(bySkill, skill.id, () => ({ name: skill.name, detail: sName, attempts: 0, correct: 0, seconds: 0 }), correct, a.timeTakenSeconds);
    }
    add(byLevel, a.difficulty, () => ({ name: a.difficulty.charAt(0) + a.difficulty.slice(1).toLowerCase(), attempts: 0, correct: 0, seconds: 0 }), correct, a.timeTakenSeconds);
  }

  const levels = finish(byLevel).sort((a, b) => DIFFICULTIES.indexOf(a.key as never) - DIFFICULTIES.indexOf(b.key as never));
  const totals = attempts.reduce((t, a) => ({ attempts: t.attempts + 1, correct: t.correct + (a.isCorrect ? 1 : 0), seconds: t.seconds + a.timeTakenSeconds }), { attempts: 0, correct: 0, seconds: 0 });

  return {
    totals: {
      attempts: totals.attempts,
      accuracy: totals.attempts ? Math.round((totals.correct / totals.attempts) * 100) : null,
      avgSeconds: totals.attempts ? Math.round(totals.seconds / totals.attempts) : null,
      tests: await db.practiceTest.count({ where: { userId, status: "SUBMITTED" } }),
    },
    subjects: finish(bySubject),
    skills: finish(bySkill),
    levels,
    recentTests: tests.reverse(),
  };
}
