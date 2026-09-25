import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { validateQuestionFields, LEGACY_QUESTION_TYPES } from "@/lib/question-validation";
import { buildPlan, gradeItem } from "@/lib/exam-runner";
import { blankCount } from "@/components/exam-runner-v2/QuestionInput";
import { DEMO_DIFFICULTY, DEMO_PAPERS, DEMO_SCORE_SCALE, type DemoQuestion } from "../../prisma/exam-demo/content.mjs";
import { assertDevDatabase, removeExamDemo, seedExamDemo } from "../../prisma/exam-demo/seed.mjs";

// P1-H: the dev-only demo exam. Content checks run on the data alone; the
// DB checks seed it into the TEST branch under a throwaway family (never
// the real IELTS_STYLE row, which exam-catalogue.test.ts creates and
// deletes itself), build a real plan from it, then remove it.

const allQuestions = DEMO_PAPERS.flatMap((p) =>
  p.parts.flatMap((pt) => [...(pt.groups ?? []).flatMap((g) => g.questions), ...(pt.questions ?? [])].map((q) => ({ paper: p, part: pt, q })))
);
const itemsInPart = (pt: (typeof DEMO_PAPERS)[number]["parts"][number]) =>
  (pt.groups ?? []).reduce((n, g) => n + g.questions.length, 0) + (pt.questions?.length ?? 0);

// Builds the answer a candidate would give to get a question right, from
// its stored answer key - proves every key is readable by its grader.
function correctAnswerFor(q: DemoQuestion): unknown {
  switch (q.type) {
    case "GAP_FILL":
      return (JSON.parse(q.correctAnswer!) as string[][]).map((accepted) => accepted[0]);
    case "MULTI_SELECT":
      return JSON.parse(q.correctAnswer!);
    default:
      return q.correctAnswer;
  }
}

describe("demo exam content (P1-H)", () => {
  it("has the IELTS-style Academic shape: 4 papers, with the right parts and timings", () => {
    expect(DEMO_SCORE_SCALE).toBe("IELTS_STYLE_BAND");
    expect(DEMO_PAPERS.map((p) => p.name)).toEqual(["Listening", "Reading", "Writing", "Speaking"]);
    const [listening, reading, writing, speaking] = DEMO_PAPERS;

    expect(listening.parts).toHaveLength(4);
    expect(listening.durationSeconds).toBe(30 * 60);
    expect(reading.parts).toHaveLength(3);
    expect(reading.durationSeconds).toBe(60 * 60);
    expect(reading.navigationMode).toBe("FREE_WITHIN_SECTION");
    expect(reading.allowReview).toBe(true);
    expect(writing.parts.map((p) => p.name)).toEqual(["Task 1", "Task 2"]);
    expect(writing.durationSeconds).toBe(60 * 60);
    expect(speaking.parts).toHaveLength(3);

    // Writing word targets: 150 for Task 1, 250 for Task 2, on every alternative.
    const task1 = [...(writing.parts[0].groups ?? []).flatMap((g) => g.questions), ...(writing.parts[0].questions ?? [])];
    const task2 = [...(writing.parts[1].groups ?? []).flatMap((g) => g.questions), ...(writing.parts[1].questions ?? [])];
    for (const q of task1) expect(q.prompt).toMatch(/at least 150 words/);
    for (const q of task2) expect(q.prompt).toMatch(/at least 250 words/);

    // Speaking: every part has a response time, Part 2 has prep time, and
    // the whole paper's speaking time fits inside its duration.
    for (const pt of speaking.parts) expect(pt.responseSeconds).toBeGreaterThan(0);
    expect(speaking.parts[1].prepSeconds).toBe(60);
    const speakingTime = speaking.parts.reduce((t, pt) => t + pt.questionCount * ((pt.prepSeconds ?? 0) + (pt.responseSeconds ?? 0)), 0);
    expect(speakingTime).toBeLessThan(speaking.durationSeconds);
  });

  it("has 2-3 items per part, and asks each part for no more than it has", () => {
    for (const p of DEMO_PAPERS) {
      for (const pt of p.parts) {
        const n = itemsInPart(pt);
        expect(n, `${p.name} ${pt.name}`).toBeGreaterThanOrEqual(2);
        expect(n, `${p.name} ${pt.name}`).toBeLessThanOrEqual(3);
        expect(pt.questionCount, `${p.name} ${pt.name}`).toBeLessThanOrEqual(n);
      }
    }
  });

  it("every question passes the same validation the admin import uses", () => {
    for (const { paper, q } of allQuestions) {
      const err = validateQuestionFields({
        category: paper.category,
        difficulty: DEMO_DIFFICULTY,
        type: q.type,
        prompt: q.prompt,
        options: q.options ?? null,
        correctAnswer: q.correctAnswer ?? null,
        timeLimitSeconds: q.timeLimitSeconds,
      });
      expect(err, q.prompt).toBeNull();
    }
  });

  it("uses only newer question types, so none of it can reach today's practice or mock-test screens", () => {
    for (const { q } of allQuestions) expect(LEGACY_QUESTION_TYPES).not.toContain(q.type);
  });

  it("every answer key is gradable: the right answer scores as correct, a wrong one doesn't", () => {
    for (const { q } of allQuestions) {
      if (q.type === "LONG_WRITING" || q.type === "TIMED_SPEAKING") {
        expect(gradeItem(q.type, JSON.stringify("anything"), q.correctAnswer ?? null)).toEqual({ isCorrect: null, score: null });
        continue;
      }
      expect(gradeItem(q.type, JSON.stringify(correctAnswerFor(q)), q.correctAnswer!).isCorrect, q.prompt).toBe(true);
      expect(gradeItem(q.type, JSON.stringify(q.type === "GAP_FILL" || q.type === "MULTI_SELECT" ? ["zzz"] : "zzz"), q.correctAnswer!).isCorrect).toBe(false);
    }
  });

  it("each gap-fill prompt shows exactly as many blanks as it has answers", () => {
    for (const { q } of allQuestions.filter(({ q }) => q.type === "GAP_FILL")) {
      expect(blankCount(q.prompt), q.prompt).toBe((JSON.parse(q.correctAnswer!) as unknown[]).length);
    }
  });

  it("listening recordings are heard once and carry a transcript; charts match their prompt", () => {
    for (const pt of DEMO_PAPERS[0].parts) {
      for (const g of pt.groups ?? []) {
        expect(g.type).toBe("AUDIO");
        expect(g.playLimit).toBe(1);
        expect(g.script!.length).toBeGreaterThan(2);
        expect(g.transcript).toContain(g.script![0][1]);
      }
    }
    for (const g of DEMO_PAPERS[2].parts[0].groups ?? []) {
      expect(g.type).toBe("CHART");
      for (const s of g.chart!.series) expect(g.questions[0].prompt).toContain(`${s.name}: ${s.values.join(" | ")}`);
    }
  });

  it("never names a real exam or exam board (no implied affiliation)", () => {
    const text = JSON.stringify(DEMO_PAPERS);
    for (const banned of [/\bIELTS\b(?!-style)/, /British Council/i, /\bIDP\b/, /Cambridge Assessment/i, /Pearson/i, /\bUKVI\b/]) {
      expect(text).not.toMatch(banned);
    }
  });
});

describe("demo seed safety guard", () => {
  it("only runs against the dev and test branches", () => {
    expect(assertDevDatabase("postgresql://u:p@ep-spring-breeze-b4yfk9e8-pooler.c-6.us-east-2.aws.neon.tech/neondb")).toMatch(/^ep-spring-breeze/);
    expect(assertDevDatabase("postgresql://u:p@ep-flat-salad-b4wht0vo-pooler.c-6.us-east-2.aws.neon.tech/neondb")).toMatch(/^ep-flat-salad/);
    expect(assertDevDatabase("postgresql://u:p@localhost:5432/x")).toBe("localhost");
    expect(() => assertDevDatabase("postgresql://u:p@ep-some-production-host.neon.tech/neondb")).toThrow(/Refusing/);
    expect(() => assertDevDatabase("postgresql://u:p@evil.example.com/ep-flat-salad-b4wht0vo")).toThrow(/Refusing/);
    expect(() => assertDevDatabase(undefined)).toThrow(/Refusing/);
    expect(() => assertDevDatabase("not a url")).toThrow(/Refusing/);
  });

  it("the test database itself passes the guard (so the DB tests below really are on the test branch)", () => {
    expect(assertDevDatabase(process.env.DATABASE_URL)).toMatch(/^ep-flat-salad/);
  });
});

describe("demo seed against the test database", { timeout: 120_000 }, () => {
  const familySlug = `TEST_DEMO_${Date.now()}`;

  afterAll(async () => {
    await removeExamDemo(db, { familySlug, removeFamily: true }).catch(() => {});
    await db.examFamily.deleteMany({ where: { slug: familySlug } });
  });

  it("seeds the whole exam, pinned part by part, and a second run changes nothing", async () => {
    const first = await seedExamDemo(db, { familySlug });
    expect(first.created).toBe(true);
    expect(first.questionTotal).toBe(allQuestions.length);

    const template = await db.mockTestTemplate.findUniqueOrThrow({
      where: { id: first.templateId! },
      include: { sections: { include: { examPart: { include: { paper: true } } } } },
    });
    expect(template.examVariantId).toBe(first.variantId);
    expect(template.isDefault).toBe(false); // only --make-default changes the default
    expect(template.sections).toHaveLength(12);
    expect(template.sections.every((s) => s.examPartId)).toBe(true);

    const questions = await db.practiceQuestion.findMany({ where: { examPart: { paper: { variantId: first.variantId } } } });
    expect(questions).toHaveLength(allQuestions.length);
    expect(questions.every((q) => q.difficulty === DEMO_DIFFICULTY && q.isActive)).toBe(true);

    const again = await seedExamDemo(db, { familySlug });
    expect(again).toMatchObject({ created: false, variantId: first.variantId, templateId: first.templateId });
    expect(await db.practiceQuestion.count({ where: { examPart: { paper: { variantId: first.variantId } } } })).toBe(allQuestions.length);
  });

  it("a real exam plan uses exactly each part's own questions, with passages and recordings kept whole", async () => {
    const template = await db.mockTestTemplate.findFirstOrThrow({ where: { examVariant: { family: { slug: familySlug } } } });
    const plan = await buildPlan(template.id, "demo-seed-test");

    expect(plan.papers.map((p) => p.name)).toEqual(["Listening", "Reading", "Writing", "Speaking"]);
    expect(plan.papers.map((p) => p.questions.length)).toEqual([12, 9, 2, 7]);

    const ids = plan.papers.flatMap((p) => p.questions.map((q) => q.questionId));
    const rows = await db.practiceQuestion.findMany({ where: { id: { in: ids } }, select: { id: true, examPartId: true, itemGroupId: true } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const paper of plan.papers) {
      for (const q of paper.questions) expect(byId.get(q.questionId)?.examPartId).toBe(q.partId);
    }
    // Each listening/reading part is one whole recording/passage.
    for (const paper of plan.papers.slice(0, 2)) {
      for (const part of paper.parts) {
        const groups = new Set(paper.questions.filter((q) => q.partId === part.partId).map((q) => byId.get(q.questionId)?.itemGroupId));
        expect(groups.size, `${paper.name} ${part.name}`).toBe(1);
      }
    }
  });

  it("pinned demo questions never leak into another exam's category-picked section", async () => {
    const variant = await db.examVariant.findFirstOrThrow({ where: { family: { slug: familySlug } } });
    const paper = await db.examPaper.create({ data: { variantId: variant.id, order: 99, name: "Other listening", durationSeconds: 600 } });
    const part = await db.examPart.create({ data: { paperId: paper.id, order: 1, name: "Unpinned part" } });
    const other = await db.mockTestTemplate.create({
      data: {
        name: `unpinned ${familySlug}`,
        examVariantId: variant.id,
        sections: { create: [{ order: 1, category: "LISTENING", difficulty: DEMO_DIFFICULTY, questionCount: 500, examPartId: part.id }] },
      },
    });
    try {
      const plan = await buildPlan(other.id, "leak-check");
      const picked = plan.papers.flatMap((p) => p.questions.map((q) => q.questionId));
      const pinned = await db.practiceQuestion.count({ where: { id: { in: picked }, examPartId: { not: null } } });
      expect(pinned).toBe(0);
    } finally {
      await db.mockTestTemplate.delete({ where: { id: other.id } });
      await db.examPaper.delete({ where: { id: paper.id } });
    }
  });

  it("removes exactly what it created", async () => {
    const res = await removeExamDemo(db, { familySlug, removeFamily: true });
    expect(res).toMatchObject({ removed: true, questionCount: allQuestions.length, familyRemoved: true });
    expect(await db.examFamily.count({ where: { slug: familySlug } })).toBe(0);
    expect(await db.mockTestTemplate.count({ where: { examVariant: { family: { slug: familySlug } } } })).toBe(0);
  });
});
