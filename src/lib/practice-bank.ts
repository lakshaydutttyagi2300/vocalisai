// Catalogue practice: which questions a test may use, picking them without
// repetition, and remembering what each candidate has seen and answered
// (docs/CATALOGUE.md). Server-only.

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { orderQuestions, takeWithGroups, type SeenInfo } from "@/lib/question-order";

export const TEST_MODES = ["PRACTICE", "WEAK_AREAS", "REVISION", "BOOKMARKS", "FULL_MOCK"] as const;
export type TestMode = (typeof TEST_MODES)[number];

/** Answered and marked on the spot, and drawn by the shared answer input (components/exam-runner-v2/QuestionInput). */
export const TEST_QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "READING_COMPREHENSION",
  "LISTENING_COMPREHENSION",
  "MATCHING",
  "TRUE_FALSE_NOT_GIVEN",
  "YES_NO_NOT_GIVEN",
  "MULTI_SELECT",
  "GAP_FILL",
  "ORDERING",
  "NUMERIC_ENTRY",
];

export interface SubjectRef {
  id: string;
  legacyCategory: string | null;
}

/** Questions a candidate may be served: live, not archived, a type the test screen can mark. */
export function servableWhere(): Prisma.PracticeQuestionWhereInput {
  return {
    isActive: true,
    archivedAt: null,
    examPartId: null, // pinned to an exam part: only that exam serves it
    type: { in: TEST_QUESTION_TYPES },
    AND: [
      { OR: [{ bankStatus: null }, { bankStatus: "live" }] },
      // Shared passages are fine; shared audio needs the timed-exam player, so it stays there.
      { OR: [{ itemGroupId: null }, { itemGroup: { type: "PASSAGE" } }] },
    ],
  };
}

/** A subject's questions: tagged with it, or (for bridged subjects) untagged questions of its old bank. */
export function subjectWhere(subject: SubjectRef): Prisma.PracticeQuestionWhereInput {
  const tagged: Prisma.PracticeQuestionWhereInput = { subjectId: subject.id };
  return subject.legacyCategory ? { OR: [tagged, { subjectId: null, category: subject.legacyCategory }] } : tagged;
}

/** Questions open to an exam: not limited to named exams, or limited to include this one. */
export function examWhere(examId: string | null): Prisma.PracticeQuestionWhereInput {
  return examId ? { OR: [{ exams: { none: {} } }, { exams: { some: { examId } } }] } : {};
}

export interface PoolSpec {
  subject: SubjectRef;
  skillId?: string | null;
  difficulty: string;
  examId?: string | null;
}

export function poolWhere(spec: PoolSpec): Prisma.PracticeQuestionWhereInput {
  return {
    AND: [
      servableWhere(),
      subjectWhere(spec.subject),
      examWhere(spec.examId ?? null),
      { difficulty: spec.difficulty },
      spec.skillId ? { catalogSkillId: spec.skillId } : {},
    ],
  };
}

async function seenMap(userId: string, ids: string[]): Promise<Map<string, SeenInfo>> {
  if (ids.length === 0) return new Map();
  const rows = await db.questionSeen.findMany({
    where: { userId, questionId: { in: ids } },
    select: { questionId: true, lastSeenAt: true, timesSeen: true, lastCorrect: true, timesAttempted: true },
  });
  return new Map(rows.map((r) => [r.questionId, r]));
}

/** Picks `count` questions from one pool: unseen first (or seen-only for revision), groups kept whole. */
export async function pickFromPool(userId: string, where: Prisma.PracticeQuestionWhereInput, count: number, revision = false): Promise<string[]> {
  const pool = await db.practiceQuestion.findMany({ where, select: { id: true, itemGroupId: true, orderInGroup: true } });
  const ordered = orderQuestions(
    pool.map((q) => q.id),
    await seenMap(
      userId,
      pool.map((q) => q.id)
    ),
    revision
  );
  return takeWithGroups(ordered, pool, count);
}

/** Marks questions as seen (served) for the candidate. */
export async function recordSeen(userId: string, questionIds: string[]): Promise<void> {
  if (questionIds.length === 0) return;
  const now = new Date();
  await db.$transaction([
    db.questionSeen.updateMany({ where: { userId, questionId: { in: questionIds } }, data: { timesSeen: { increment: 1 }, lastSeenAt: now } }),
    db.questionSeen.createMany({ data: questionIds.map((questionId) => ({ userId, questionId, timesSeen: 1, lastSeenAt: now })), skipDuplicates: true }),
  ]);
}

/** Records a first answer to a question (right, wrong or unmarked). */
export async function recordAttempted(userId: string, questionId: string, isCorrect: boolean | null): Promise<void> {
  const now = new Date();
  await db.questionSeen.upsert({
    where: { userId_questionId: { userId, questionId } },
    create: { userId, questionId, timesSeen: 1, timesAttempted: 1, timesCorrect: isCorrect ? 1 : 0, lastSeenAt: now, lastAttemptedAt: now, lastCorrect: isCorrect },
    update: { timesAttempted: { increment: 1 }, timesCorrect: { increment: isCorrect ? 1 : 0 }, lastAttemptedAt: now, lastCorrect: isCorrect },
  });
}

export interface AreaAccuracy {
  subjectId: string;
  skillId: string | null;
  attempts: number;
  correct: number;
}

/**
 * The candidate's answers in catalogue tests, grouped by subject and skill.
 * Questions from a bridged bank count toward their subject.
 */
export async function accuracyByArea(userId: string, subjects: SubjectRef[], difficulty?: string): Promise<AreaAccuracy[]> {
  const byLegacy = new Map(subjects.filter((s) => s.legacyCategory).map((s) => [s.legacyCategory!, s.id]));
  const subjectIds = new Set(subjects.map((s) => s.id));
  const attempts = await db.practiceAttempt.findMany({
    where: { userId, practiceTestId: { not: null }, isCorrect: { not: null }, ...(difficulty ? { difficulty } : {}) },
    select: { isCorrect: true, question: { select: { subjectId: true, catalogSkillId: true, category: true } } },
  });
  const areas = new Map<string, AreaAccuracy>();
  for (const a of attempts) {
    const subjectId = a.question.subjectId ?? byLegacy.get(a.question.category) ?? null;
    if (!subjectId || !subjectIds.has(subjectId)) continue;
    for (const skillId of a.question.catalogSkillId ? [null, a.question.catalogSkillId] : [null]) {
      const key = `${subjectId}:${skillId ?? ""}`;
      const area = areas.get(key) ?? { subjectId, skillId, attempts: 0, correct: 0 };
      area.attempts++;
      if (a.isCorrect) area.correct++;
      areas.set(key, area);
    }
  }
  return [...areas.values()];
}

export const WEAK_MIN_ATTEMPTS = 3;
export const WEAK_BELOW = 0.7;

/** The weakest areas: skills first (needs WEAK_MIN_ATTEMPTS answers each), else subjects; accuracy under WEAK_BELOW. */
export function weakestAreas(areas: AreaAccuracy[], limit = 3): AreaAccuracy[] {
  const weak = (list: AreaAccuracy[]) =>
    list
      .filter((a) => a.attempts >= WEAK_MIN_ATTEMPTS && a.correct / a.attempts < WEAK_BELOW)
      .sort((x, y) => x.correct / x.attempts - y.correct / y.attempts)
      .slice(0, limit);
  const skills = weak(areas.filter((a) => a.skillId));
  return skills.length > 0 ? skills : weak(areas.filter((a) => !a.skillId));
}
