import { describe, expect, it } from "vitest";
import { CATALOGUE, getExam, isAvailable } from "@/lib/catalogue";
import { PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { EXAM_LIBRARY } from "../../prisma/exam-library/content.mjs";
import { DEMO_FAMILY_SLUG } from "../../prisma/exam-demo/content.mjs";

const modeSlugs = new Set(PRACTICE_MODES.map((m) => m.slug));
const familySlugs = new Set([...EXAM_LIBRARY.map((f) => f.slug), DEMO_FAMILY_SLUG]);

describe("catalogue", () => {
  it("has the ten top-level categories, each with at least one exam", () => {
    expect(CATALOGUE).toHaveLength(10);
    for (const c of CATALOGUE) expect(c.exams.length).toBeGreaterThan(0);
  });

  it("uses unique ids, safe for web addresses", () => {
    const categoryIds = CATALOGUE.map((c) => c.id);
    expect(new Set(categoryIds).size).toBe(categoryIds.length);
    for (const c of CATALOGUE) {
      const examIds = c.exams.map((e) => e.id);
      expect(new Set(examIds).size, c.id).toBe(examIds.length);
      for (const id of [c.id, ...examIds]) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("only lists subjects that are real practice areas, and mock exams that exist", () => {
    for (const c of CATALOGUE) {
      for (const e of c.exams) {
        for (const s of e.subjects) expect(modeSlugs.has(s), `${e.id}: ${s}`).toBe(true);
        expect(new Set(e.subjects).size, e.id).toBe(e.subjects.length);
        for (const f of e.mockFamilies ?? []) expect(familySlugs.has(f), `${e.id}: ${f}`).toBe(true);
        // An exam with nothing to practise must say what's coming instead.
        if (!isAvailable(e)) expect(e.upcoming?.length, e.id).toBeGreaterThan(0);
      }
    }
  });

  it("every practice area appears under at least one exam", () => {
    const used = new Set(CATALOGUE.flatMap((c) => c.exams.flatMap((e) => e.subjects)));
    for (const slug of modeSlugs) expect(used.has(slug), slug).toBe(true);
  });

  it("names exams after other organisations only as '-style'", () => {
    for (const c of CATALOGUE) {
      for (const e of c.exams) expect(e.name, e.id).not.toMatch(/\b(IELTS|PTE|TOEFL|Cambridge|SSC|SELT)\b(?!-style)/);
    }
  });

  it("finds an exam by category and id", () => {
    expect(getExam("university-entrance", "ielts-style")?.name).toBe("IELTS-style");
    expect(getExam("university-entrance", "nope")).toBeUndefined();
  });
});
