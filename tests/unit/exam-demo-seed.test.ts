import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { validateQuestionFields, LEGACY_QUESTION_TYPES } from "@/lib/question-validation";
import { buildPlan, gradeItem } from "@/lib/exam-runner";
import { blankCount } from "@/components/exam-runner-v2/QuestionInput";
import { DEMO_DIFFICULTY, DEMO_SCORE_SCALE, PRACTICE_TESTS, type DemoQuestion, type PracticeTest } from "../../prisma/exam-demo/content.mjs";
import { assertDevDatabase, removeExamDemo, seedExamDemo } from "../../prisma/exam-demo/seed.mjs";

// The 3 IELTS-style Academic practice tests (P1-H + follow-up). Content
// checks run on the data alone; the DB checks seed them into the TEST
// branch under a throwaway family (never the real IELTS_STYLE row, which
// exam-catalogue.test.ts creates and deletes itself), build real plans
// from them, then remove them.

type Part = PracticeTest["papers"][number]["parts"][number];
const questionsOf = (pt: Part): DemoQuestion[] => [...(pt.groups ?? []).flatMap((g) => g.questions), ...(pt.questions ?? [])];
const allQuestions = PRACTICE_TESTS.flatMap((t) =>
  t.papers.flatMap((p) => p.parts.flatMap((pt) => questionsOf(pt).map((q) => ({ test: t, paper: p, part: pt, q }))))
);
const questionsPerTest = allQuestions.length / PRACTICE_TESTS.length;

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

describe("practice test content", () => {
  it("has 3 practice tests with distinct identities", () => {
    expect(PRACTICE_TESTS.map((t) => t.number)).toEqual([1, 2, 3]);
    expect(new Set(PRACTICE_TESTS.map((t) => t.variantSlug)).size).toBe(3);
    expect(new Set(PRACTICE_TESTS.map((t) => t.templateName)).size).toBe(3);
    expect(DEMO_SCORE_SCALE).toBe("IELTS_STYLE_BAND");
  });

  it.each(PRACTICE_TESTS)("test $number has the IELTS-style Academic shape and timings", (t) => {
    expect(t.papers.map((p) => p.name)).toEqual(["Listening", "Reading", "Writing", "Speaking"]);
    const [listening, reading, writing, speaking] = t.papers;

    expect(listening.parts).toHaveLength(4);
    expect(listening.durationSeconds).toBe(30 * 60);
    expect(reading.parts).toHaveLength(3);
    expect(reading.durationSeconds).toBe(60 * 60);
    expect(reading.navigationMode).toBe("FREE_WITHIN_SECTION");
    expect(reading.allowReview).toBe(true);
    expect(writing.parts.map((p) => p.name)).toEqual(["Task 1", "Task 2"]);
    expect(writing.durationSeconds).toBe(60 * 60);
    expect(speaking.parts).toHaveLength(3);

    // Listening/reading: 3 questions per part, all on ONE recording/passage.
    for (const pt of [...listening.parts, ...reading.parts]) {
      expect(pt.groups).toHaveLength(1);
      expect(questionsOf(pt)).toHaveLength(3);
      expect(pt.questionCount).toBe(3);
    }
    // Writing: exactly one task per part, with the right word target.
    expect(questionsOf(writing.parts[0]).map((q) => q.prompt).join()).toMatch(/at least 150 words/);
    expect(questionsOf(writing.parts[1]).map((q) => q.prompt).join()).toMatch(/at least 250 words/);
    for (const pt of writing.parts) expect([questionsOf(pt).length, pt.questionCount]).toEqual([1, 1]);

    // Speaking: 3 + 1 cue card + 3, every part timed, and it all fits.
    expect(speaking.parts.map((pt) => questionsOf(pt).length)).toEqual([3, 1, 3]);
    for (const pt of speaking.parts) expect(pt.responseSeconds).toBeGreaterThan(0);
    expect(speaking.parts[1].prepSeconds).toBe(60);
    const speakingTime = speaking.parts.reduce((s, pt) => s + pt.questionCount * ((pt.prepSeconds ?? 0) + (pt.responseSeconds ?? 0)), 0);
    expect(speakingTime).toBeLessThan(speaking.durationSeconds);
  });

  it("never repeats a passage, recording, chart, task or question across the 3 tests", () => {
    const prompts = allQuestions.map(({ q }) => q.prompt);
    expect(new Set(prompts).size).toBe(prompts.length);
    const titles = PRACTICE_TESTS.flatMap((t) => t.papers.flatMap((p) => p.parts.flatMap((pt) => (pt.groups ?? []).map((g) => g.title.replace(/^PT\d · /, "")))));
    expect(new Set(titles).size).toBe(titles.length);
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

  it("every listening answer is actually spoken in its recording", () => {
    for (const t of PRACTICE_TESTS) {
      for (const pt of t.papers[0].parts) {
        const g = pt.groups![0];
        expect(g.type).toBe("AUDIO");
        expect(g.playLimit).toBe(1);
        const spoken = g.script!.map(([, line]) => line).join(" ").toLowerCase();
        expect(g.transcript).toContain(g.script![0][1]);
        for (const q of g.questions.filter((x) => x.type === "GAP_FILL")) {
          const accepted = (JSON.parse(q.correctAnswer!) as string[][])[0];
          // Spelled-out names ("O, K, A, F, O, R") and numbers said in words count as spoken.
          const said = accepted.some((a) => spoken.includes(a.toLowerCase()) || spoken.includes(a.toLowerCase().split("").join(", ")));
          expect(said, `${t.templateName}: ${q.prompt}`).toBe(true);
        }
      }
    }
  });

  it("each chart's numbers appear in its task prompt", () => {
    for (const t of PRACTICE_TESTS) {
      const g = t.papers[2].parts[0].groups![0];
      expect(g.type).toBe("CHART");
      for (const s of g.chart!.series) expect(g.questions[0].prompt).toContain(`${s.name}: ${s.values.join(" | ")}`);
    }
  });

  it("never names a real exam or exam board (no implied affiliation)", () => {
    const text = JSON.stringify(PRACTICE_TESTS);
    for (const banned of [/\bIELTS\b(?!-style)/, /British Council/i, /\bIDP\b/, /Cambridge Assessment/i, /Pearson/i, /\bUKVI\b/]) {
      expect(text).not.toMatch(banned);
    }
  });
});

describe("practice test seed safety guard", () => {
  it("runs on dev and test; production only with the explicit flag; nothing else ever", () => {
    expect(assertDevDatabase("postgresql://u:p@ep-spring-breeze-b4yfk9e8-pooler.c-6.us-east-2.aws.neon.tech/neondb")).toMatch(/^ep-spring-breeze/);
    expect(assertDevDatabase("postgresql://u:p@ep-flat-salad-b4wht0vo-pooler.c-6.us-east-2.aws.neon.tech/neondb")).toMatch(/^ep-flat-salad/);
    expect(assertDevDatabase("postgresql://u:p@localhost:5432/x")).toBe("localhost");

    const prod = "postgresql://u:p@ep-falling-sound-b4rdr3dg-pooler.c-6.us-east-2.aws.neon.tech/neondb";
    expect(() => assertDevDatabase(prod)).toThrow(/PRODUCTION database - pass --production/);
    expect(assertDevDatabase(prod, { allowProduction: true })).toMatch(/^ep-falling-sound/);

    for (const bad of ["postgresql://u:p@ep-some-other-host.neon.tech/neondb", "postgresql://u:p@evil.example.com/ep-flat-salad-b4wht0vo", undefined, "not a url"]) {
      expect(() => assertDevDatabase(bad)).toThrow(/Refusing/);
      expect(() => assertDevDatabase(bad, { allowProduction: true })).toThrow(/Refusing/);
    }
  });

  it("the test database itself passes the guard (so the DB tests below really are on the test branch)", () => {
    expect(assertDevDatabase(process.env.DATABASE_URL)).toMatch(/^ep-flat-salad/);
  });
});

describe("practice test seed against the test database", { timeout: 180_000 }, () => {
  const familySlug = `TEST_DEMO_${Date.now()}`;

  afterAll(async () => {
    await removeExamDemo(db, { familySlug, removeFamily: true }).catch(() => {});
    await db.examFamily.deleteMany({ where: { slug: familySlug } });
  });

  it("seeds all 3 tests, each pinned part by part, and a second run changes nothing", async () => {
    const first = await seedExamDemo(db, { familySlug });
    expect(first.created).toBe(true);
    expect(first.tests.map((t) => t.created)).toEqual([true, true, true]);
    expect(first.questionTotal).toBe(allQuestions.length);

    for (const [i, t] of first.tests.entries()) {
      const template = await db.mockTestTemplate.findUniqueOrThrow({ where: { id: t.templateId! }, include: { sections: true } });
      expect(template.name).toBe(PRACTICE_TESTS[i].templateName);
      expect(template.examVariantId).toBe(t.variantId);
      expect(template.isDefault).toBe(false); // only --make-default changes the default
      expect(template.sections).toHaveLength(12);
      expect(template.sections.every((s) => s.examPartId)).toBe(true);
      expect(await db.practiceQuestion.count({ where: { examPart: { paper: { variantId: t.variantId } } } })).toBe(questionsPerTest);
    }

    const again = await seedExamDemo(db, { familySlug });
    expect(again.tests.map((t) => t.created)).toEqual([false, false, false]);
    expect(again.tests.map((t) => t.templateId)).toEqual(first.tests.map((t) => t.templateId));
    expect(await db.practiceQuestion.count({ where: { examPart: { paper: { variant: { family: { slug: familySlug } } } } } })).toBe(allQuestions.length);
  });

  it("a real exam plan for each test uses exactly that test's own questions, with passages and recordings kept whole", async () => {
    const templates = await db.mockTestTemplate.findMany({ where: { examVariant: { family: { slug: familySlug } } }, orderBy: { name: "asc" } });
    expect(templates).toHaveLength(3);
    const seenAcrossTests = new Set<string>();

    for (const template of templates) {
      const plan = await buildPlan(template.id, `plan-${template.id}`);
      expect(plan.papers.map((p) => p.name)).toEqual(["Listening", "Reading", "Writing", "Speaking"]);
      expect(plan.papers.map((p) => p.questions.length)).toEqual([12, 9, 2, 7]);

      const ids = plan.papers.flatMap((p) => p.questions.map((q) => q.questionId));
      const rows = await db.practiceQuestion.findMany({
        where: { id: { in: ids } },
        select: { id: true, examPartId: true, itemGroupId: true, examPart: { select: { paper: { select: { variantId: true } } } } },
      });
      const byId = new Map(rows.map((r) => [r.id, r]));
      for (const paper of plan.papers) {
        for (const q of paper.questions) {
          expect(byId.get(q.questionId)?.examPartId).toBe(q.partId);
          expect(byId.get(q.questionId)?.examPart?.paper.variantId).toBe(template.examVariantId);
        }
      }
      for (const paper of plan.papers.slice(0, 2)) {
        for (const part of paper.parts) {
          const groups = new Set(paper.questions.filter((q) => q.partId === part.partId).map((q) => byId.get(q.questionId)?.itemGroupId));
          expect(groups.size, `${template.name} ${paper.name} ${part.name}`).toBe(1);
        }
      }
      for (const id of ids) {
        expect(seenAcrossTests.has(id)).toBe(false);
        seenAcrossTests.add(id);
      }
    }
  });

  it("pinned questions never leak into another exam's category-picked section", async () => {
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
      expect(await db.practiceQuestion.count({ where: { id: { in: picked }, examPartId: { not: null } } })).toBe(0);
    } finally {
      await db.mockTestTemplate.delete({ where: { id: other.id } });
      await db.examPaper.delete({ where: { id: paper.id } });
    }
  });

  it("removes exactly what it created", async () => {
    const res = await removeExamDemo(db, { familySlug, removeFamily: true });
    expect(res).toMatchObject({ removed: true, testCount: 3, questionCount: allQuestions.length, familyRemoved: true });
    expect(await db.examFamily.count({ where: { slug: familySlug } })).toBe(0);
    expect(await db.mockTestTemplate.count({ where: { examVariant: { family: { slug: familySlug } } } })).toBe(0);
  });
});
