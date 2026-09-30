// Catalogue practice tests: start, show, answer, submit (docs/CATALOGUE.md).
// Server-only. Every function takes the signed-in user's id and only ever
// touches that user's own tests.

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { checkAndRecordUsage, checkDifficultyAccess, refundUsage, upgradeMessage, type Feature } from "@/lib/entitlements";
import { getQuestionTypeDef } from "@/lib/question-types";
import { candidateStimulus } from "@/lib/question-stimulus";
import { accuracyByArea, pickFromPool, poolWhere, recordAttempted, recordSeen, servableWhere, subjectWhere, weakestAreas, type SubjectRef, type TestMode } from "@/lib/practice-bank";

/** Answers accepted this long after a timed test's clock runs out (slow networks). */
export const ANSWER_GRACE_MS = 30 * 1000;
const DEFAULT_SECONDS_PER_QUESTION = 60;

export class PracticeTestError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export interface StartInput {
  examId?: string | null;
  subjectId?: string | null;
  skillId?: string | null;
  difficulty: string;
  mode: TestMode;
  timed: boolean;
  count: number;
}

async function examSubjects(examId: string): Promise<SubjectRef[]> {
  const links = await db.catalogExamSubject.findMany({
    where: { examId, subject: { isActive: true } },
    orderBy: { sortOrder: "asc" },
    select: { mockQuestionCount: true, subject: { select: { id: true, legacyCategory: true } } },
  });
  return links.map((l) => l.subject);
}

async function chooseQuestions(userId: string, input: StartInput, subject: SubjectRef | null): Promise<string[]> {
  const { difficulty, examId = null, skillId = null, count } = input;
  switch (input.mode) {
    case "PRACTICE":
      return subject ? pickFromPool(userId, poolWhere({ subject, skillId, difficulty, examId }), count) : [];

    case "REVISION": {
      const subjects = subject ? [subject] : examId ? await examSubjects(examId) : [];
      if (subjects.length === 0) return [];
      return pickFromPool(userId, { OR: subjects.map((s) => poolWhere({ subject: s, skillId: subject ? skillId : null, difficulty, examId })) }, count, true);
    }

    case "FULL_MOCK": {
      if (!examId) return [];
      const links = await db.catalogExamSubject.findMany({
        where: { examId, mockQuestionCount: { gt: 0 }, subject: { isActive: true } },
        orderBy: { sortOrder: "asc" },
        select: { mockQuestionCount: true, subject: { select: { id: true, legacyCategory: true } } },
      });
      const picked: string[] = [];
      for (const link of links) {
        const ids = await pickFromPool(userId, { AND: [poolWhere({ subject: link.subject, difficulty, examId }), { id: { notIn: picked } }] }, link.mockQuestionCount);
        picked.push(...ids);
      }
      return picked;
    }

    case "WEAK_AREAS": {
      const subjects = subject ? [subject] : examId ? await examSubjects(examId) : [];
      const weak = weakestAreas(await accuracyByArea(userId, subjects));
      if (weak.length === 0) return [];
      const perArea = Math.max(1, Math.ceil(count / weak.length));
      const picked: string[] = [];
      for (const area of weak) {
        const s = subjects.find((x) => x.id === area.subjectId)!;
        const ids = await pickFromPool(userId, { AND: [poolWhere({ subject: s, skillId: area.skillId, difficulty, examId }), { id: { notIn: picked } }] }, perArea);
        picked.push(...ids);
      }
      return picked;
    }

    case "BOOKMARKS": {
      const bookmarks = await db.questionBookmark.findMany({
        where: { userId, question: { AND: [servableWhere(), subject ? subjectWhere(subject) : {}] } },
        orderBy: { createdAt: "asc" },
        take: count,
        select: { questionId: true },
      });
      return bookmarks.map((b) => b.questionId);
    }
  }
}

const EMPTY_MESSAGE: Record<TestMode, string> = {
  PRACTICE: "There are no questions for this subject at this level yet.",
  REVISION: "Nothing to revise yet: questions you have already seen at this level appear here.",
  FULL_MOCK: "This exam's full mock needs questions that haven't been added yet.",
  WEAK_AREAS: "No weak areas yet. Answer a few practice questions first (at least 3 per area), and your weakest areas will appear here.",
  BOOKMARKS: "You haven't bookmarked any questions here yet.",
};

/** Starts a test for the candidate and returns its id. Throws PracticeTestError with a plain message. */
export async function startPracticeTest(userId: string, input: StartInput): Promise<string> {
  if (input.mode !== "BOOKMARKS" && !(await checkDifficultyAccess(userId, input.difficulty))) {
    throw new PracticeTestError("This level isn't included on your current plan. Upgrade to unlock it.", 403);
  }

  let exam: { id: string; mockMinutes: number | null } | null = null;
  if (input.examId) {
    exam = await db.catalogExam.findFirst({ where: { id: input.examId, isActive: true, category: { isActive: true } }, select: { id: true, mockMinutes: true } });
    if (!exam) throw new PracticeTestError("That exam isn't available.", 404);
  }
  let subject: SubjectRef | null = null;
  if (input.subjectId) {
    subject = await db.catalogSubject.findFirst({
      where: { id: input.subjectId, isActive: true, ...(exam ? { exams: { some: { examId: exam.id } } } : {}) },
      select: { id: true, legacyCategory: true },
    });
    if (!subject) throw new PracticeTestError("That subject isn't part of this exam.", 404);
  }
  if (input.skillId) {
    const skill = subject ? await db.catalogSkill.findFirst({ where: { id: input.skillId, subjectId: subject.id, isActive: true } }) : null;
    if (!skill) throw new PracticeTestError("That skill isn't part of this subject.", 404);
  }
  if (input.mode === "PRACTICE" && !subject) throw new PracticeTestError("Choose a subject to practise.", 400);
  if (input.mode === "FULL_MOCK" && !exam) throw new PracticeTestError("Choose an exam for a full mock.", 400);

  // Pick first, charge second: an empty selection must never cost a practice session.
  const questionIds = await chooseQuestions(userId, { ...input, examId: exam?.id ?? null }, subject);
  if (questionIds.length === 0) throw new PracticeTestError(EMPTY_MESSAGE[input.mode], 404);

  const feature: Feature = input.mode === "FULL_MOCK" ? "MOCK_ASSESSMENT" : "PRACTICE_SESSION";
  const usage = await checkAndRecordUsage(userId, feature);
  if (!usage.allowed) throw new PracticeTestError(upgradeMessage(usage, feature), 403);

  try {
    const timed = input.mode === "FULL_MOCK" || input.timed;
    let timeLimitSeconds: number | null = null;
    if (timed) {
      if (input.mode === "FULL_MOCK" && exam?.mockMinutes) timeLimitSeconds = exam.mockMinutes * 60;
      else {
        const limits = await db.practiceQuestion.findMany({ where: { id: { in: questionIds } }, select: { timeLimitSeconds: true } });
        timeLimitSeconds = limits.reduce((sum, q) => sum + (q.timeLimitSeconds || DEFAULT_SECONDS_PER_QUESTION), 0);
      }
    }
    const test = await db.practiceTest.create({
      data: {
        userId,
        examId: exam?.id ?? null,
        subjectId: subject?.id ?? null,
        catalogSkillId: input.skillId ?? null,
        difficulty: input.difficulty,
        mode: input.mode,
        timed,
        timeLimitSeconds,
        questionIds,
        totalCount: questionIds.length,
      },
      select: { id: true },
    });
    await recordSeen(userId, questionIds);
    return test.id;
  } catch (err) {
    await refundUsage(usage);
    throw err;
  }
}

async function ownTest(userId: string, testId: string) {
  const test = await db.practiceTest.findFirst({ where: { id: testId, userId } });
  if (!test) throw new PracticeTestError("That test doesn't exist.", 404);
  return test;
}

export function deadlineOf(test: { timed: boolean; timeLimitSeconds: number | null; startedAt: Date }): Date | null {
  return test.timed && test.timeLimitSeconds ? new Date(test.startedAt.getTime() + test.timeLimitSeconds * 1000) : null;
}

/** Closes a test and stores its totals. Safe to call twice. */
export async function submitPracticeTest(userId: string, testId: string) {
  const test = await ownTest(userId, testId);
  if (test.status === "SUBMITTED") return test;
  const attempts = await db.practiceAttempt.findMany({ where: { practiceTestId: test.id }, select: { isCorrect: true, timeTakenSeconds: true } });
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  await db.practiceTest.updateMany({
    where: { id: test.id, status: "IN_PROGRESS" },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      answeredCount: attempts.length,
      correctCount,
      scorePercent: Math.round((correctCount / test.totalCount) * 100),
      totalTimeSeconds: attempts.reduce((sum, a) => sum + a.timeTakenSeconds, 0),
    },
  });
  return ownTest(userId, testId);
}

/** A timed test whose clock (plus grace) has run out is submitted automatically. */
async function closeIfExpired<T extends { id: string; status: string; timed: boolean; timeLimitSeconds: number | null; startedAt: Date }>(userId: string, test: T) {
  const deadline = deadlineOf(test);
  if (test.status === "IN_PROGRESS" && deadline && Date.now() > deadline.getTime() + ANSWER_GRACE_MS) {
    await submitPracticeTest(userId, test.id);
    return true;
  }
  return false;
}

// Choice-style types store the answer as plain text; the rest as JSON.
const TEXT_ANSWER_TYPES = new Set(["MULTIPLE_CHOICE", "READING_COMPREHENSION", "LISTENING_COMPREHENSION", "MATCHING", "TRUE_FALSE_NOT_GIVEN", "YES_NO_NOT_GIVEN"]);

function storeAnswer(answer: unknown): string {
  return typeof answer === "string" ? answer : JSON.stringify(answer);
}

function readAnswer(type: string, raw: string | null): unknown {
  if (raw === null) return null;
  if (TEXT_ANSWER_TYPES.has(type)) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** A stored correct answer, as a candidate should read it. */
export function displayAnswer(raw: string | null): string | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw);
    if (Array.isArray(value)) return value.map((v) => (Array.isArray(v) ? v[0] : String(v))).join(", ");
    if (value && typeof value === "object" && "value" in value) return String((value as { value: unknown }).value);
    return String(value);
  } catch {
    return raw;
  }
}

function parseOptions(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.map(String) : null;
  } catch {
    return null;
  }
}

/** Everything the test screen needs. Correct answers only for submitted tests, or answered questions in untimed practice. */
export async function practiceTestView(userId: string, testId: string) {
  let test = await ownTest(userId, testId);
  if (await closeIfExpired(userId, test)) test = await ownTest(userId, testId);

  const [questions, attempts, bookmarks, exam, subject, skill] = await Promise.all([
    db.practiceQuestion.findMany({
      where: { id: { in: test.questionIds } },
      select: {
        id: true,
        type: true,
        category: true,
        difficulty: true,
        prompt: true,
        passage: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        itemGroup: { select: { type: true, title: true, text: true } },
        subject: { select: { name: true } },
        catalogSkill: { select: { name: true } },
      },
    }),
    db.practiceAttempt.findMany({ where: { practiceTestId: test.id }, select: { questionId: true, responseText: true, isCorrect: true, timeTakenSeconds: true } }),
    db.questionBookmark.findMany({ where: { userId, questionId: { in: test.questionIds } }, select: { questionId: true } }),
    test.examId ? db.catalogExam.findUnique({ where: { id: test.examId }, select: { name: true, slug: true, category: { select: { slug: true } } } }) : null,
    test.subjectId ? db.catalogSubject.findUnique({ where: { id: test.subjectId }, select: { name: true } }) : null,
    test.catalogSkillId ? db.catalogSkill.findUnique({ where: { id: test.catalogSkillId }, select: { name: true } }) : null,
  ]);

  const byId = new Map(questions.map((q) => [q.id, q]));
  const answers = new Map(attempts.map((a) => [a.questionId, a]));
  const bookmarked = new Set(bookmarks.map((b) => b.questionId));
  const submitted = test.status === "SUBMITTED";
  const deadline = deadlineOf(test);

  return {
    id: test.id,
    mode: test.mode,
    difficulty: test.difficulty,
    timed: test.timed,
    status: test.status,
    startedAt: test.startedAt.toISOString(),
    deadline: deadline?.toISOString() ?? null,
    serverNow: new Date().toISOString(),
    totalCount: test.totalCount,
    answeredCount: test.answeredCount,
    correctCount: test.correctCount,
    scorePercent: test.scorePercent,
    totalTimeSeconds: test.totalTimeSeconds,
    exam: exam ? { name: exam.name, href: `/explore/${exam.category.slug}/${exam.slug}` } : null,
    subjectName: subject?.name ?? null,
    skillName: skill?.name ?? null,
    questions: test.questionIds
      .map((id) => byId.get(id))
      .filter((q) => q !== undefined)
      .map((q) => {
        const answer = answers.get(q.id);
        const reveal = submitted || (!test.timed && answer !== undefined);
        return {
          id: q.id,
          type: q.type,
          difficulty: q.difficulty,
          prompt: q.prompt,
          options: parseOptions(q.options),
          stimulus: candidateStimulus(q.passage, q).stimulus,
          passage: q.itemGroup?.type === "PASSAGE" ? { title: q.itemGroup.title, text: q.itemGroup.text } : null,
          subjectName: q.subject?.name ?? null,
          skillName: q.catalogSkill?.name ?? null,
          bookmarked: bookmarked.has(q.id),
          answer: answer ? readAnswer(q.type, answer.responseText) : null,
          answered: answer !== undefined,
          timeTakenSeconds: answer?.timeTakenSeconds ?? null,
          isCorrect: reveal ? (answer?.isCorrect ?? null) : null,
          correctAnswer: reveal ? displayAnswer(q.correctAnswer) : null,
          explanation: reveal ? q.explanation : null,
        };
      }),
  };
}

export type PracticeTestView = Awaited<ReturnType<typeof practiceTestView>>;

export interface AnswerInput {
  questionId: string;
  answer: unknown;
  timeTakenSeconds: number;
}

/** Saves an answer. Untimed practice returns the marking at once; timed tests reveal it after submitting. */
export async function answerPracticeQuestion(userId: string, testId: string, input: AnswerInput) {
  const test = await ownTest(userId, testId);
  if (test.status !== "IN_PROGRESS") throw new PracticeTestError("This test has already been submitted.", 409);
  if (await closeIfExpired(userId, test)) throw new PracticeTestError("Time is up: this test has been submitted.", 409);
  if (!test.questionIds.includes(input.questionId)) throw new PracticeTestError("That question isn't part of this test.", 400);

  const question = await db.practiceQuestion.findUnique({
    where: { id: input.questionId },
    select: { id: true, type: true, category: true, difficulty: true, correctAnswer: true, explanation: true, skillId: true, level: true },
  });
  const def = question ? getQuestionTypeDef(question.type) : undefined;
  if (!question || !def) throw new PracticeTestError("That question can't be answered here.", 400);
  const parsed = def.answerSchema.safeParse(input.answer);
  if (!parsed.success) throw new PracticeTestError("That answer isn't valid for this question.", 400);
  const { isCorrect, score } = def.grade(parsed.data, question.correctAnswer);

  const existing = await db.practiceAttempt.findUnique({
    where: { practiceTestId_questionId: { practiceTestId: test.id, questionId: question.id } },
    select: { id: true, isCorrect: true },
  });
  const feedback = (correct: boolean | null) =>
    test.timed ? { saved: true as const } : { saved: true as const, isCorrect: correct, correctAnswer: displayAnswer(question.correctAnswer), explanation: question.explanation };

  if (existing) {
    // Untimed practice locks an answer once its marking is shown; a timed test lets you change it until you submit.
    if (!test.timed) return { ...feedback(existing.isCorrect), firstAnswer: false, skillId: null };
    await db.practiceAttempt.update({ where: { id: existing.id }, data: { responseText: storeAnswer(parsed.data), isCorrect, score, timeTakenSeconds: input.timeTakenSeconds } });
    return { ...feedback(isCorrect), firstAnswer: false, skillId: null };
  }

  try {
    await db.practiceAttempt.create({
      data: {
        userId,
        questionId: question.id,
        category: question.category,
        difficulty: question.difficulty,
        responseText: storeAnswer(parsed.data),
        isCorrect,
        score,
        timeTakenSeconds: input.timeTakenSeconds,
        practiceTestId: test.id,
        skillId: question.skillId,
        level: question.level,
      },
    });
  } catch (err) {
    // A double click raced us to the same answer: the first one stands.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { ...feedback(isCorrect), firstAnswer: false, skillId: null };
    throw err;
  }
  await recordAttempted(userId, question.id, isCorrect);
  return { ...feedback(isCorrect), firstAnswer: true, skillId: isCorrect === null ? null : question.skillId };
}

export async function setBookmark(userId: string, questionId: string, on: boolean) {
  if (on) {
    const exists = await db.practiceQuestion.findUnique({ where: { id: questionId }, select: { id: true } });
    if (!exists) throw new PracticeTestError("That question doesn't exist.", 404);
    await db.questionBookmark.upsert({ where: { userId_questionId: { userId, questionId } }, create: { userId, questionId }, update: {} });
  } else {
    await db.questionBookmark.deleteMany({ where: { userId, questionId } });
  }
}
