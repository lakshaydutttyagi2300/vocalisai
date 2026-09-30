import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { answerPracticeQuestion, practiceTestView, setBookmark, startPracticeTest, submitPracticeTest } from "@/lib/practice-tests";

// The catalogue practice engine end to end on the test database, with
// throwaway questions (deleted afterwards): level control, no repetition,
// exam limits, archiving, marking, timed vs untimed, revision, weak areas,
// bookmarks, plan limits.
const run = Date.now();
let userId = "";
let freeUserId = "";
let categoryId = "";
let examA = "";
let examB = "";
let subjectId = "";
let skillX = "";
let skillY = "";
const beginner: string[] = [];
const advanced: string[] = [];
let onlyExamB = "";
let archived = "";

async function question(difficulty: string, i: number, extra: Record<string, unknown> = {}) {
  const q = await db.practiceQuestion.create({
    data: {
      category: "CATALOG",
      subjectId,
      difficulty,
      type: "MULTIPLE_CHOICE",
      prompt: `engine ${run} ${difficulty} ${i}`,
      options: JSON.stringify(["right", "wrong"]),
      correctAnswer: "right",
      explanation: "Because it is right.",
      timeLimitSeconds: 30,
      ...extra,
    },
  });
  return q.id;
}

const start = (overrides: Record<string, unknown> = {}, user = () => userId) =>
  startPracticeTest(user(), { examId: examA, subjectId, difficulty: "BEGINNER", mode: "PRACTICE", timed: false, count: 5, ...overrides });

beforeAll(async () => {
  userId = (await db.user.create({ data: { email: `engine-${run}@example.test`, passwordHash: "x", name: "Engine" } })).id;
  await setPlan(userId, "PREMIUM", { periodDays: 30 });
  freeUserId = (await db.user.create({ data: { email: `engine-free-${run}@example.test`, passwordHash: "x", name: "Engine Free" } })).id;
  categoryId = (await db.catalogCategory.create({ data: { slug: `test-cat-${run}`, name: "Test category" } })).id;
  subjectId = (await db.catalogSubject.create({ data: { slug: `test-subject-${run}`, name: "Test subject" } })).id;
  skillX = (await db.catalogSkill.create({ data: { subjectId, slug: "x", name: "Skill X" } })).id;
  skillY = (await db.catalogSkill.create({ data: { subjectId, slug: "y", name: "Skill Y" } })).id;
  examA = (await db.catalogExam.create({ data: { slug: `test-exam-a-${run}`, name: "Exam A", categoryId, mockMinutes: 20 } })).id;
  examB = (await db.catalogExam.create({ data: { slug: `test-exam-b-${run}`, name: "Exam B", categoryId } })).id;
  await db.catalogExamSubject.createMany({ data: [{ examId: examA, subjectId, mockQuestionCount: 4 }, { examId: examB, subjectId }] });
  for (let i = 0; i < 12; i++) beginner.push(await question("BEGINNER", i, { catalogSkillId: i < 6 ? skillX : skillY }));
  for (let i = 0; i < 3; i++) advanced.push(await question("ADVANCED", i));
  onlyExamB = await question("BEGINNER", 99, { exams: { create: { examId: examB } } });
  archived = await question("BEGINNER", 98, { isActive: false, archivedAt: new Date() });
}, 300_000);

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: [userId, freeUserId] } } });
  await db.practiceQuestion.deleteMany({ where: { subjectId } });
  await db.catalogExam.deleteMany({ where: { categoryId } });
  await db.catalogSubject.deleteMany({ where: { id: subjectId } });
  await db.catalogCategory.deleteMany({ where: { id: categoryId } });
}, 300_000);

describe("practice test engine", { timeout: 180_000 }, () => {
  it("serves only the chosen level, never an archived or other-exam question, and never repeats until the pool runs out", async () => {
    const first = await practiceTestView(userId, await start());
    const second = await practiceTestView(userId, await start());
    const ids = [...first.questions, ...second.questions].map((q) => q.id);
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
    for (const id of ids) {
      expect(beginner).toContain(id);
      expect([onlyExamB, archived, ...advanced]).not.toContain(id);
    }
    // 2 unseen left: they come first, then the least recently seen.
    const third = await practiceTestView(userId, await start());
    const unseen = beginner.filter((id) => !ids.includes(id));
    expect(new Set(third.questions.slice(0, 2).map((q) => q.id))).toEqual(new Set(unseen));
    expect(first.questions.map((q) => q.id)).toContain(third.questions[2].id);
  });

  it("uses an exam-limited question only in that exam", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) ids.push(...(await practiceTestView(userId, await start({ examId: examB, count: 5 }))).questions.map((q) => q.id));
    expect(ids).toContain(onlyExamB);
  });

  it("filters by skill, and by level for Advanced", async () => {
    const skill = await practiceTestView(userId, await start({ skillId: skillX, count: 10 }));
    expect(skill.questions.every((q) => beginner.slice(0, 6).includes(q.id))).toBe(true);
    const adv = await practiceTestView(userId, await start({ difficulty: "ADVANCED", count: 10 }));
    expect(adv.questions.map((q) => q.id).sort()).toEqual([...advanced].sort());
  });

  it("marks untimed practice at once and locks the answer", async () => {
    const testId = await start();
    const view = await practiceTestView(userId, testId);
    const [q1, q2] = view.questions;
    expect(view.questions.every((q) => q.correctAnswer === null)).toBe(true); // nothing revealed before answering
    const r1 = await answerPracticeQuestion(userId, testId, { questionId: q1.id, answer: "right", timeTakenSeconds: 7 });
    expect(r1).toMatchObject({ isCorrect: true, correctAnswer: "right", explanation: "Because it is right." });
    const again = await answerPracticeQuestion(userId, testId, { questionId: q1.id, answer: "wrong", timeTakenSeconds: 3 });
    expect(again).toMatchObject({ isCorrect: true, firstAnswer: false });
    await answerPracticeQuestion(userId, testId, { questionId: q2.id, answer: "wrong", timeTakenSeconds: 9 });
    await expect(answerPracticeQuestion(userId, testId, { questionId: advanced[0], answer: "right", timeTakenSeconds: 1 })).rejects.toThrow(/isn't part of this test/);
    await expect(answerPracticeQuestion(userId, testId, { questionId: q1.id, answer: 42, timeTakenSeconds: 1 })).rejects.toThrow(/isn't valid/);

    const done = await submitPracticeTest(userId, testId);
    expect(done).toMatchObject({ status: "SUBMITTED", answeredCount: 2, correctCount: 1, totalCount: 5, scorePercent: 20, totalTimeSeconds: 16 });
    await expect(answerPracticeQuestion(userId, testId, { questionId: view.questions[2].id, answer: "right", timeTakenSeconds: 1 })).rejects.toThrow(/already been submitted/);
    const seen = await db.questionSeen.findUnique({ where: { userId_questionId: { userId, questionId: q2.id } } });
    expect(seen).toMatchObject({ timesAttempted: 1, timesCorrect: 0, lastCorrect: false });
  });

  it("hides marking in a timed test until it is submitted, and lets answers change", async () => {
    const testId = await start({ timed: true });
    const view = await practiceTestView(userId, testId);
    expect(view.deadline).not.toBeNull();
    const q = view.questions[0];
    expect(await answerPracticeQuestion(userId, testId, { questionId: q.id, answer: "wrong", timeTakenSeconds: 4 })).toEqual({ saved: true, firstAnswer: true, skillId: null }); // no marking in the reply
    await answerPracticeQuestion(userId, testId, { questionId: q.id, answer: "right", timeTakenSeconds: 6 });
    expect((await practiceTestView(userId, testId)).questions[0]).toMatchObject({ answered: true, isCorrect: null, correctAnswer: null });
    await submitPracticeTest(userId, testId);
    expect((await practiceTestView(userId, testId)).questions[0]).toMatchObject({ isCorrect: true, correctAnswer: "right", answer: "right", timeTakenSeconds: 6 });
  });

  it("closes a timed test whose time has run out", async () => {
    const testId = await start({ timed: true });
    await db.practiceTest.update({ where: { id: testId }, data: { startedAt: new Date(Date.now() - 60 * 60 * 1000) } });
    expect((await practiceTestView(userId, testId)).status).toBe("SUBMITTED");
  });

  it("builds a full mock from the exam's subject counts, timed with the exam's minutes", async () => {
    const view = await practiceTestView(userId, await start({ mode: "FULL_MOCK", subjectId: null }));
    expect(view.questions).toHaveLength(4);
    expect(view.timed).toBe(true);
    expect(new Date(view.deadline!).getTime() - new Date(view.startedAt).getTime()).toBe(20 * 60 * 1000);
  });

  it("revision repeats seen questions, wrong answers first", async () => {
    const wrong = await db.questionSeen.findFirst({ where: { userId, lastCorrect: false }, select: { questionId: true } });
    const view = await practiceTestView(userId, await start({ mode: "REVISION" }));
    expect(view.questions[0].id).toBe(wrong!.questionId);
  });

  it("weak areas practises the lowest-accuracy skill", async () => {
    // 3 wrong answers in skill Y make it the weakest area.
    const testId = await start({ skillId: skillY, count: 5 });
    for (const q of (await practiceTestView(userId, testId)).questions.slice(0, 3)) {
      await answerPracticeQuestion(userId, testId, { questionId: q.id, answer: "wrong", timeTakenSeconds: 2 });
    }
    const weak = await practiceTestView(userId, await start({ mode: "WEAK_AREAS", subjectId: null, count: 5 }));
    expect(weak.questions.length).toBeGreaterThan(0);
    expect(weak.questions.every((q) => beginner.slice(6).includes(q.id))).toBe(true);
  });

  it("practises bookmarked questions", async () => {
    await setBookmark(userId, beginner[0], true);
    await setBookmark(userId, beginner[1], true);
    await setBookmark(userId, beginner[1], false);
    const view = await practiceTestView(userId, await start({ mode: "BOOKMARKS" }));
    expect(view.questions.map((q) => q.id)).toEqual([beginner[0]]);
    expect(view.questions[0].bookmarked).toBe(true);
  });

  it("keeps Advanced off the Free plan, and never charges for an empty selection", async () => {
    await expect(start({ difficulty: "ADVANCED" }, () => freeUserId)).rejects.toThrow(/isn't included on your current plan/);
    await expect(start({ difficulty: "EXPERT" })).rejects.toThrow(/no questions/);
    await expect(start({ mode: "REVISION" }, () => freeUserId)).rejects.toThrow(/Nothing to revise/);
    expect(await db.usageEvent.count({ where: { userId: freeUserId } })).toBe(0);
  });

  it("refuses another candidate's test", async () => {
    const testId = await start();
    await expect(practiceTestView(freeUserId, testId)).rejects.toThrow(/doesn't exist/);
    await expect(answerPracticeQuestion(freeUserId, testId, { questionId: beginner[0], answer: "right", timeTakenSeconds: 1 })).rejects.toThrow(/doesn't exist/);
  });
});
