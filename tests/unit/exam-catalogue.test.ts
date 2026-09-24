import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  EXAM_FAMILY_SEED,
  isValidExamFamilySlug,
  isValidNavigationMode,
  validateExamFamilyFields,
  validateExamVariantFields,
  validateExamPaperFields,
  validateExamPartFields,
} from "@/lib/exam-catalogue";

afterAll(async () => {
  await db.$disconnect();
});

describe("exam-catalogue registries", () => {
  it("accepts every seeded family slug and rejects an unknown one", () => {
    for (const f of EXAM_FAMILY_SEED) {
      expect(isValidExamFamilySlug(f.slug)).toBe(true);
    }
    expect(isValidExamFamilySlug("TOEFL_STYLE")).toBe(false);
  });

  it("validates navigation modes", () => {
    expect(isValidNavigationMode("LOCKED_SEQUENTIAL")).toBe(true);
    expect(isValidNavigationMode("FREE_WITHIN_SECTION")).toBe(true);
    expect(isValidNavigationMode("ANYTHING_GOES")).toBe(false);
  });

  it("rejects an ExamFamily with an invalid slug or missing name", () => {
    expect(validateExamFamilyFields({ slug: "NOT_A_REAL_FAMILY", name: "Whatever" })).toMatch(/Invalid exam family slug/);
    expect(validateExamFamilyFields({ slug: "IELTS_STYLE", name: "" })).toMatch(/name is required/);
    expect(validateExamFamilyFields({ slug: "IELTS_STYLE", name: "IELTS-style" })).toBeNull();
  });

  it("rejects an ExamVariant with a malformed slug or missing scoreScale", () => {
    expect(validateExamVariantFields({ slug: "academic", name: "Academic", scoreScale: "IELTS_STYLE_BAND" })).toMatch(/Invalid variant slug/);
    expect(validateExamVariantFields({ slug: "ACADEMIC", name: "Academic", scoreScale: "" })).toMatch(/scoreScale is required/);
    expect(validateExamVariantFields({ slug: "ACADEMIC", name: "Academic", scoreScale: "IELTS_STYLE_BAND" })).toBeNull();
  });

  it("rejects an ExamPaper with an out-of-range duration or invalid navigation mode", () => {
    expect(validateExamPaperFields({ name: "Listening", durationSeconds: 10, navigationMode: "LOCKED_SEQUENTIAL" })).toMatch(/durationSeconds/);
    expect(validateExamPaperFields({ name: "Listening", durationSeconds: 1800, navigationMode: "WHATEVER" })).toMatch(/navigationMode/);
    expect(validateExamPaperFields({ name: "Listening", durationSeconds: 1800, navigationMode: "LOCKED_SEQUENTIAL" })).toBeNull();
  });

  it("rejects an ExamPart with a negative timer", () => {
    expect(validateExamPartFields({ name: "Part 1", prepSeconds: -5 })).toMatch(/prepSeconds/);
    expect(validateExamPartFields({ name: "Part 1", responseSeconds: -1 })).toMatch(/responseSeconds/);
    expect(validateExamPartFields({ name: "Part 1", prepSeconds: 60, responseSeconds: 120 })).toBeNull();
  });
});

describe("exam-catalogue schema (P1-A)", () => {
  const marker = `exam-catalogue-test-${Date.now()}`;

  it("creates a Family -> Variant -> Paper -> Part chain and cascades deletes downward", async () => {
    const family = await db.examFamily.create({
      data: { slug: "IELTS_STYLE", name: marker, description: "test row" },
    });
    const variant = await db.examVariant.create({
      data: { familyId: family.id, slug: "ACADEMIC", name: "Academic", scoreScale: "IELTS_STYLE_BAND" },
    });
    const paper = await db.examPaper.create({
      data: { variantId: variant.id, order: 1, name: "Listening", durationSeconds: 1800 },
    });
    const part = await db.examPart.create({
      data: { paperId: paper.id, order: 1, name: "Part 1" },
    });

    const reloaded = await db.examFamily.findUniqueOrThrow({
      where: { id: family.id },
      include: { variants: { include: { papers: { include: { parts: true } } } } },
    });
    expect(reloaded.variants[0].papers[0].parts[0].id).toBe(part.id);

    // Deleting the family cascades all the way down (onDelete: Cascade at
    // every level) - cleans up this test's rows in one call and proves the
    // relation chain is real, not just type-level.
    await db.examFamily.delete({ where: { id: family.id } });
    expect(await db.examVariant.findUnique({ where: { id: variant.id } })).toBeNull();
    expect(await db.examPaper.findUnique({ where: { id: paper.id } })).toBeNull();
    expect(await db.examPart.findUnique({ where: { id: part.id } })).toBeNull();
  });

  it("enforces slug uniqueness within a family, not globally", async () => {
    const familyA = await db.examFamily.create({ data: { slug: "SELT_STYLE", name: `${marker}-a` } });
    const familyB = await db.examFamily.create({ data: { slug: "PTE_STYLE", name: `${marker}-b` } });

    // Same slug ("ACADEMIC") in two different families must both succeed.
    const variantA = await db.examVariant.create({
      data: { familyId: familyA.id, slug: "ACADEMIC", name: "Academic", scoreScale: "IELTS_STYLE_BAND" },
    });
    const variantB = await db.examVariant.create({
      data: { familyId: familyB.id, slug: "ACADEMIC", name: "Academic", scoreScale: "PTE_STYLE_10_90" },
    });
    expect(variantA.id).not.toBe(variantB.id);

    // The same slug again within familyA must fail (the @@unique([familyId, slug])).
    await expect(
      db.examVariant.create({ data: { familyId: familyA.id, slug: "ACADEMIC", name: "Duplicate", scoreScale: "CEFR" } })
    ).rejects.toThrow();

    await db.examFamily.deleteMany({ where: { id: { in: [familyA.id, familyB.id] } } });
  });

  it("MockTestTemplate.examVariantId and MockTestTemplateSection.examPartId default to null (existing behaviour unaffected)", async () => {
    const template = await db.mockTestTemplate.create({ data: { name: marker } });
    expect(template.examVariantId).toBeNull();

    const section = await db.mockTestTemplateSection.create({
      data: { templateId: template.id, order: 1, category: "GRAMMAR", difficulty: "BEGINNER", questionCount: 2 },
    });
    expect(section.examPartId).toBeNull();

    await db.mockTestTemplate.delete({ where: { id: template.id } }); // cascades the section
  });
});
