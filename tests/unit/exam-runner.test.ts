import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  DEADLINE_GRACE_MS,
  buildStateView,
  gradeItem,
  isPastDeadline,
  paperDeadline,
  processExpiry,
  runnerForTemplate,
  seededShuffle,
  selectQuestionUnits,
  startOrResume,
  submitCurrentPaper,
} from "@/lib/exam-runner";
import { defaultEnabled, isFeatureEnabled } from "@/lib/feature-flags";
import { createExamFixture, type ExamFixture } from "../helpers/exam-fixture";

describe("pure helpers", () => {
  it("paperDeadline never runs past the overall exam deadline", () => {
    const start = new Date("2026-01-01T10:00:00Z");
    const exam = new Date("2026-01-01T10:10:00Z");
    expect(paperDeadline(start, 300, exam).toISOString()).toBe("2026-01-01T10:05:00.000Z");
    expect(paperDeadline(start, 3600, exam).toISOString()).toBe(exam.toISOString());
  });

  it("isPastDeadline allows only the short grace period", () => {
    const deadline = new Date("2026-01-01T10:00:00Z");
    expect(isPastDeadline(new Date(deadline.getTime() + DEADLINE_GRACE_MS), deadline)).toBe(false);
    expect(isPastDeadline(new Date(deadline.getTime() + DEADLINE_GRACE_MS + 1), deadline)).toBe(true);
  });

  it("seededShuffle is a deterministic permutation that varies by seed", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const a = seededShuffle(items, "session-1");
    expect(seededShuffle(items, "session-1")).toEqual(a); // stable across refreshes
    expect([...a].sort((x, y) => x - y)).toEqual(items); // nothing lost or duplicated
    expect(seededShuffle(items, "session-2")).not.toEqual(a);
  });

  it("selectQuestionUnits keeps a shared-passage group whole and respects the count", () => {
    const pool = [
      { id: "g1a", itemGroupId: "g1", orderInGroup: 1 },
      { id: "g1b", itemGroupId: "g1", orderInGroup: 2 },
      { id: "g1c", itemGroupId: "g1", orderInGroup: 3 },
      { id: "s1", itemGroupId: null, orderInGroup: null },
      { id: "s2", itemGroupId: null, orderInGroup: null },
    ];
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const picked = selectQuestionUnits(pool, 3, seed, new Set());
      expect(picked.length).toBeLessThanOrEqual(3);
      const groupCount = picked.filter((id) => id.startsWith("g1")).length;
      expect([0, 3]).toContain(groupCount); // never a partial group
      if (groupCount === 3) expect(picked.filter((id) => id.startsWith("g1"))).toEqual(["g1a", "g1b", "g1c"]); // in group order
    }
  });

  it("selectQuestionUnits skips excluded questions and never returns an empty section when something exists", () => {
    const pool = [{ id: "big1", itemGroupId: "g", orderInGroup: 1 }, { id: "big2", itemGroupId: "g", orderInGroup: 2 }];
    expect(selectQuestionUnits(pool, 1, "x", new Set())).toEqual(["big1", "big2"]); // oversized group taken rather than nothing
    expect(selectQuestionUnits(pool, 5, "x", new Set(["big1", "big2"]))).toEqual([]);
  });

  it("gradeItem never fabricates: unknown type or unanswered writing is null, unanswered MCQ is 0", () => {
    expect(gradeItem("NOT_A_TYPE", '"x"', "x")).toEqual({ isCorrect: null, score: null });
    expect(gradeItem("LONG_WRITING", null, null)).toEqual({ isCorrect: null, score: null });
    expect(gradeItem("TRUE_FALSE_NOT_GIVEN", null, "TRUE")).toEqual({ isCorrect: false, score: 0 });
    expect(gradeItem("TRUE_FALSE_NOT_GIVEN", "not json{", "TRUE")).toEqual({ isCorrect: false, score: 0 });
    expect(gradeItem("TRUE_FALSE_NOT_GIVEN", '"TRUE"', "TRUE")).toEqual({ isCorrect: true, score: 100 });
    expect(gradeItem("GAP_FILL", '["AN"]', JSON.stringify([["an"]]))).toEqual({ isCorrect: true, score: 100 });
  });
});

describe("exam_runner_v2 flag", () => {
  it("defaults OFF, while every pre-existing flag keeps defaulting ON", async () => {
    expect(defaultEnabled("exam_runner_v2")).toBe(false);
    expect(defaultEnabled("MOCK_TEST")).toBe(true);
    expect(defaultEnabled("GRAMMAR")).toBe(true);
    const row = await db.featureFlag.findUnique({ where: { key: "exam_runner_v2" } });
    if (!row) expect(await isFeatureEnabled("exam_runner_v2")).toBe(false);
  });

  it("a template with no exam format always uses today's runner, flag or not", async () => {
    expect(await runnerForTemplate({ examVariantId: null })).toBe("v1");
    expect(await runnerForTemplate(null)).toBe("v1");
  });
});

// Longer timeout: each case makes several real round-trips to the remote
// Neon test branch.
describe("server-side exam flow (DB)", { timeout: 60_000 }, () => {
  let fx: ExamFixture;
  let userId: string;

  beforeAll(async () => {
    fx = await createExamFixture("unit");
    const user = await db.user.create({
      data: { email: `exam-runner-unit-${Date.now()}@example.test`, passwordHash: "x", name: "Exam Runner Unit" },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await fx.cleanup();
    await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  });

  it("start builds a fixed plan and resuming returns the exact same exam", async () => {
    const sessionId = await fx.createSession(userId);
    expect((await startOrResume(sessionId)).error).toBeNull();
    const first = await buildStateView(sessionId);
    expect(first?.status).toBe("IN_PROGRESS");
    expect(first?.paperCount).toBe(2);
    expect(first?.paper?.name).toBe("Reading");
    expect(first?.questions).toHaveLength(3);

    // Second start = resume: no new state row, same questions, same option order.
    expect((await startOrResume(sessionId)).error).toBeNull();
    const again = await buildStateView(sessionId);
    expect(again?.questions.map((q) => q.id)).toEqual(first?.questions.map((q) => q.id));
    expect(again?.questions.map((q) => q.options)).toEqual(first?.questions.map((q) => q.options));
    expect(await db.examSessionState.count({ where: { mockTestSessionId: sessionId } })).toBe(1);
  });

  it("the client view never contains a correct answer or an audio transcript", async () => {
    const sessionId = await fx.createSession(userId);
    await startOrResume(sessionId);
    const view = await buildStateView(sessionId);
    const json = JSON.stringify(view);
    expect(json).not.toContain("SECRET TRANSCRIPT");
    expect(json).not.toContain("correctAnswer");
    expect(json).not.toContain('[["an"]]');
  });

  it("an expired paper is auto-submitted and graded, and the next paper's clock starts from the old deadline", async () => {
    const sessionId = await fx.createSession(userId);
    await startOrResume(sessionId);
    await db.itemResponse.create({
      data: { mockTestSessionId: sessionId, questionId: fx.questions.tfng, paperIndex: 0, answerJson: '"TRUE"' },
    });

    const expiredAt = new Date(Date.now() - 60_000);
    await db.examSessionState.update({ where: { mockTestSessionId: sessionId }, data: { paperDeadline: expiredAt } });

    const state = await processExpiry(sessionId);
    expect(state?.currentPaperIndex).toBe(1);
    expect(state?.paperStartedAt.toISOString()).toBe(expiredAt.toISOString());

    const graded = await db.itemResponse.findMany({ where: { mockTestSessionId: sessionId, paperIndex: 0 } });
    expect(graded).toHaveLength(3); // unanswered ones got a row too
    const byQ = new Map(graded.map((r) => [r.questionId, r]));
    expect(byQ.get(fx.questions.tfng)).toMatchObject({ isCorrect: true, score: 100 });
    expect(byQ.get(fx.questions.gap)).toMatchObject({ isCorrect: false, score: 0 }); // unanswered
  });

  it("submitting every paper completes the exam, sets endedAt, and leaves writing/speaking unmarked", async () => {
    const sessionId = await fx.createSession(userId);
    await startOrResume(sessionId);
    await submitCurrentPaper(sessionId, 0);
    await db.itemResponse.create({
      data: { mockTestSessionId: sessionId, questionId: fx.questions.numeric, paperIndex: 1, answerJson: "7" },
    });
    await submitCurrentPaper(sessionId, 1);

    const view = await buildStateView(sessionId);
    expect(view?.status).toBe("COMPLETED");
    const session = await db.mockTestSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session.endedAt).not.toBeNull();

    const numeric = await db.itemResponse.findFirstOrThrow({ where: { mockTestSessionId: sessionId, questionId: fx.questions.numeric } });
    expect(numeric).toMatchObject({ isCorrect: true, score: 100 });
    const shortAnswer = await db.itemResponse.findFirstOrThrow({ where: { mockTestSessionId: sessionId, questionId: fx.questions.shortAnswer } });
    expect(shortAnswer).toMatchObject({ isCorrect: null, score: null });
  });

  it("a double submit for the same paper only ever advances one paper - concurrent or back-to-back", async () => {
    const concurrent = await fx.createSession(userId);
    await startOrResume(concurrent);
    await Promise.all([submitCurrentPaper(concurrent, 0), submitCurrentPaper(concurrent, 0)]);
    expect((await db.examSessionState.findUniqueOrThrow({ where: { mockTestSessionId: concurrent } })).currentPaperIndex).toBe(1);

    const sequential = await fx.createSession(userId);
    await startOrResume(sequential);
    await submitCurrentPaper(sequential, 0);
    await submitCurrentPaper(sequential, 0); // stale second click
    expect((await db.examSessionState.findUniqueOrThrow({ where: { mockTestSessionId: sequential } })).currentPaperIndex).toBe(1);
  });

  it("ending the session via the existing End assessment path finalizes the exam", async () => {
    const sessionId = await fx.createSession(userId);
    await startOrResume(sessionId);
    await db.mockTestSession.update({ where: { id: sessionId }, data: { endedAt: new Date() } });
    const view = await buildStateView(sessionId);
    expect(view?.status).toBe("COMPLETED");
  });

  it("refuses to start a template with no exam format linked", async () => {
    const plain = await db.mockTestTemplate.create({ data: { name: `plain-${Date.now()}` } });
    const s = await db.mockTestSession.create({ data: { userId, templateId: plain.id } });
    expect((await startOrResume(s.id)).error).toMatch(/isn't set up/);
    await db.mockTestSession.delete({ where: { id: s.id } });
    await db.mockTestTemplate.delete({ where: { id: plain.id } });
  });
});
