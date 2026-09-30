import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { EXAM_LIBRARY, GENERAL_ENGLISH_ASSESSMENT, type LibraryExam, type LibraryFamily } from "../../prisma/exam-library/content.mjs";
import { seedExamLibrary } from "../../prisma/exam-library/seed.mjs";
import { DIFFICULTIES, getModeByCategory, isVoiceCategory } from "@/lib/practice-taxonomy";
import { isValidScoreScaleKey } from "@/lib/score-scales";
import { isWellFormedFamilySlug } from "@/lib/exam-catalogue";
import { createCatalogueRecord } from "@/lib/exam-catalogue-admin";
import { examItemType } from "@/lib/exam-runner";
import { listMockTestOptions, pickVersion, structureKey, versionTitle } from "@/lib/mock-test-options";

type Section = [string, string, number];
type Exam = (typeof EXAM_LIBRARY)[number]["exams"][number];
const minutesOf = (exam: Exam) => exam.papers.reduce((n, p) => n + p.minutes, 0);

describe("the exam library content", () => {
  it("has many exam types with genuinely different exams, 10 to 120+ minutes", () => {
    expect(EXAM_LIBRARY.length).toBeGreaterThanOrEqual(10);
    const exams = EXAM_LIBRARY.flatMap((f) => f.exams);
    expect(exams.length).toBeGreaterThanOrEqual(20);
    const minutes = exams.map(minutesOf);
    expect(Math.min(...minutes)).toBeLessThanOrEqual(10);
    expect(Math.max(...minutes)).toBeGreaterThanOrEqual(120);
    expect(new Set(minutes).size).toBeGreaterThanOrEqual(8); // many different lengths
    for (const name of ["Business English", "Customer Service English", "Speaking Test", "Listening Test", "Reading Test", "Writing Test", "Grammar Test", "Vocabulary Test", "Interview English", "Academic English", "Placement Test"]) {
      expect(EXAM_LIBRARY.map((f) => f.name)).toContain(name);
    }
  });

  it("uses only real categories, levels and score scales, with valid codes", () => {
    const familySlugs = EXAM_LIBRARY.map((f) => f.slug);
    expect(new Set(familySlugs).size).toBe(familySlugs.length);
    for (const family of EXAM_LIBRARY) {
      expect(isWellFormedFamilySlug(family.slug), family.slug).toBe(true);
      const examSlugs = family.exams.map((e) => e.slug);
      expect(new Set(examSlugs).size, family.name).toBe(examSlugs.length);
      for (const exam of family.exams) {
        expect(exam.slug).toMatch(/^[A-Z0-9_]+$/);
        expect(isValidScoreScaleKey(exam.scale), exam.name).toBe(true);
        expect(exam.description?.length ?? 0, exam.name).toBeGreaterThan(20);
        for (const p of exam.papers) {
          expect(p.minutes, `${exam.name} ${p.name}`).toBeGreaterThanOrEqual(5);
          expect(p.parts.length).toBeGreaterThan(0);
          for (const r of p.parts) {
            for (const [category, difficulty, n] of r.sections as Section[]) {
              expect(getModeByCategory(category), `${exam.name}: ${category}`).toBeTruthy();
              expect(DIFFICULTIES as readonly string[]).toContain(difficulty);
              expect(n).toBeGreaterThan(0);
              // Spoken sections always get prep/response timings, and only they do.
              expect(Boolean((r as { speaking?: unknown }).speaking), `${exam.name} / ${r.name}`).toBe(isVoiceCategory(category));
            }
          }
        }
      }
    }
  });

  it("never lists two exams that differ only in name", () => {
    const shape = (exam: Exam) => exam.papers.map((p) => `${p.minutes}:${p.parts.map((r) => (r.sections as Section[]).join("/")).join(";")}`).join("|");
    const seen = new Map<string, string>();
    for (const family of EXAM_LIBRARY) {
      for (const exam of family.exams) {
        const key = shape(exam);
        expect(seen.get(key), `${exam.name} duplicates ${seen.get(key)}`).toBeUndefined();
        seen.set(key, exam.name);
      }
    }
  });

  it("gives the General English assessment its own language focus", () => {
    const categories = GENERAL_ENGLISH_ASSESSMENT.sections.map(([c]) => c);
    expect(categories).not.toContain("CUSTOMER_SERVICE");
    expect(categories).not.toContain("SITUATIONAL_JUDGEMENT");
    expect(categories).toEqual(expect.arrayContaining(["GRAMMAR", "VOCABULARY", "WRITING", "LISTENING"]));
  });
});

describe("timed exams answer bank questions the right way", () => {
  it("records spoken prompts and gives writing tasks the long box; everything else keeps its type", () => {
    expect(examItemType({ type: "SHORT_ANSWER", category: "SPEAKING" })).toBe("TIMED_SPEAKING");
    expect(examItemType({ type: "SHORT_ANSWER", category: "CUSTOMER_SERVICE" })).toBe("TIMED_SPEAKING");
    expect(examItemType({ type: "SHORT_ANSWER", category: "READING" })).toBe("TIMED_SPEAKING"); // read aloud
    expect(examItemType({ type: "SHORT_ANSWER", category: "WRITING" })).toBe("LONG_WRITING");
    expect(examItemType({ type: "SHORT_ANSWER", category: "INTERVIEW" })).toBe("SHORT_ANSWER"); // typed
    expect(examItemType({ type: "MULTIPLE_CHOICE", category: "GRAMMAR" })).toBe("MULTIPLE_CHOICE");
    expect(examItemType({ type: "TIMED_SPEAKING", category: "SPEAKING" })).toBe("TIMED_SPEAKING");
    expect(examItemType({ type: "LONG_WRITING", category: "WRITING" })).toBe("LONG_WRITING");
  });
});

describe("one card per exam, versions grouped", () => {
  it("titles a group of versions without the numbers", () => {
    expect(versionTitle(["IELTS-style Academic - Practice Test 1", "IELTS-style Academic - Practice Test 2", "IELTS-style Academic - Practice Test 3"])).toBe("IELTS-style Academic");
    expect(versionTitle(["Mini Test 1", "Mini Test 2"])).toBe("Mini");
    expect(versionTitle(["Grammar Check"])).toBe("Grammar Check");
  });

  it("the same papers and sections = the same exam, whatever the name", () => {
    const papers = [{ name: "Grammar", durationSeconds: 900, navigationMode: "FREE_WITHIN_SECTION" }];
    const sections = [{ category: "GRAMMAR", difficulty: "BEGINNER", questionCount: 15, examPart: { order: 1, paper: { order: 1 } } }];
    expect(structureKey("f1", papers, sections)).toBe(structureKey("f1", papers, [...sections]));
    expect(structureKey("f1", papers, sections)).not.toBe(structureKey("f1", [{ ...papers[0], durationSeconds: 1200 }], sections));
    expect(structureKey("f1", papers, sections)).not.toBe(structureKey("f2", papers, sections));
  });
});

describe("the library in the database (test branch)", { timeout: 120_000 }, () => {
  const run = Date.now();
  const slug = `TESTLIB_${run}`;
  const shape = (name: string, minutes: number): LibraryExam => ({
    slug: name.toUpperCase().replace(/\W+/g, "_"),
    name,
    scale: "CEFR",
    description: `Test exam ${name} for the library unit test.`,
    papers: [{ name: "Grammar", minutes, navigation: "FREE_WITHIN_SECTION", review: true, instructions: null, parts: [{ name: "Questions", sections: [["GRAMMAR", "BEGINNER", 2]] }] }],
  });
  const library: LibraryFamily[] = [{ slug, name: `Test Library ${run}`, description: "Unit-test exam type.", exams: [shape("Mini Test 1", 12), shape("Mini Test 2", 12), shape("Longer Check", 25)] }];
  const noGeneralEnglish = { name: `no such template ${run}`, sections: [] };
  let previousFlag: boolean | null = null;
  let userId = "";

  beforeAll(async () => {
    previousFlag = (await db.featureFlag.findUnique({ where: { key: "exam_runner_v2" } }))?.enabled ?? null;
    await db.featureFlag.upsert({ where: { key: "exam_runner_v2" }, create: { key: "exam_runner_v2", label: "Exam Runner v2", enabled: true }, update: { enabled: true } });
    userId = (await db.user.create({ data: { name: "Library Tester", email: `lib-${run}@example.org`, passwordHash: "x" } })).id;
  });

  afterAll(async () => {
    const templates = await db.mockTestTemplate.findMany({ where: { examVariant: { family: { slug } } }, select: { id: true } });
    await db.mockTestSession.deleteMany({ where: { templateId: { in: templates.map((t) => t.id) } } });
    await db.mockTestTemplate.deleteMany({ where: { id: { in: templates.map((t) => t.id) } } });
    await db.examFamily.deleteMany({ where: { slug: { in: [slug, `CUSTOM_EXAM_TYPE_${run}`] } } });
    await db.user.deleteMany({ where: { id: userId } });
    if (previousFlag === null) await db.featureFlag.deleteMany({ where: { key: "exam_runner_v2" } });
    else await db.featureFlag.update({ where: { key: "exam_runner_v2" }, data: { enabled: previousFlag } });
  });

  it("creates exams once, then only refreshes them", async () => {
    const first = await seedExamLibrary(db, { library, generalEnglish: noGeneralEnglish });
    expect(first.filter((l: string) => l.startsWith("+"))).toHaveLength(4); // the type + 3 exams
    const again = await seedExamLibrary(db, { library, generalEnglish: noGeneralEnglish });
    expect(again.filter((l: string) => l.startsWith("+") || l.startsWith("~"))).toHaveLength(0);
    const variant = await db.examVariant.findFirstOrThrow({ where: { family: { slug }, slug: "LONGER_CHECK" }, include: { papers: { include: { parts: true } } } });
    expect(variant.description).toContain("Longer Check");
    expect(variant.papers[0].durationSeconds).toBe(25 * 60);
  });

  it("offers identical exams as one card with versions, and a different exam separately", async () => {
    const options = (await listMockTestOptions()).filter((o) => o.typeKey === slug);
    expect(options).toHaveLength(2);
    const mini = options.find((o) => o.name === "Mini")!;
    expect(mini.versionTemplateIds).toHaveLength(2);
    expect(mini).toMatchObject({ kind: "exam", typeName: `Test Library ${run}`, totalMinutes: 12, questionCount: 2, levels: ["Beginner"], skills: ["Grammar"] });
    expect(options.find((o) => o.name === "Longer Check")).toMatchObject({ versionTemplateIds: [expect.any(String)], totalMinutes: 25 });
  });

  it("starts a version the candidate hasn't taken, then the one taken longest ago", async () => {
    const mini = (await listMockTestOptions()).find((o) => o.typeKey === slug && o.name === "Mini")!;
    const [a, b] = mini.versionTemplateIds;
    expect(await pickVersion(userId, mini.versionTemplateIds)).toBe(a);
    await db.mockTestSession.create({ data: { userId, templateId: a, startedAt: new Date(Date.now() - 60_000) } });
    expect(await pickVersion(userId, mini.versionTemplateIds)).toBe(b);
    await db.mockTestSession.create({ data: { userId, templateId: b } });
    expect(await pickVersion(userId, mini.versionTemplateIds)).toBe(a); // both taken: the older one
  });

  it("an admin can create a brand-new exam type from just a name", async () => {
    const result = await createCatalogueRecord("families", { name: `Custom Exam Type ${run}`, description: "Made in the admin panel." });
    expect(result).toMatchObject({ ok: true, record: { slug: `CUSTOM_EXAM_TYPE_${run}`, name: `Custom Exam Type ${run}` } });
  });
});
