import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { validateCorrectAnswerForType } from "@/lib/question-types/correct-answer";
import { validateQuestionFields, LEGACY_QUESTION_TYPES } from "@/lib/question-validation";
import { TEMPLATE_COLUMNS, guessColumn, questionToRow, rowToQuestion } from "@/lib/question-file-format";
import { validateExamVariantFields } from "@/lib/exam-catalogue";
import { isItemGroupAssetKeyShape } from "@/lib/item-groups";
import { processQuestionBatch } from "@/lib/question-import";
import { createCatalogueRecord, deleteCatalogueRecord, updateCatalogueRecord } from "@/lib/exam-catalogue-admin";
import { attachQuestions, createItemGroup, deleteItemGroup, detachQuestions, updateItemGroup } from "@/lib/item-groups-admin";
import { validateTemplateExamLink } from "@/lib/template-exam-link";

// Asserts a create/update succeeded and returns its record, typed for the
// fields the test reads.
function rec<T>(result: { ok: boolean }): T {
  expect(result.ok).toBe(true);
  return (result as unknown as { record: T }).record;
}

describe("correct-answer validation for the 12 new types", () => {
  it.each([
    ["TRUE_FALSE_NOT_GIVEN", "not_given", null, true],
    ["TRUE_FALSE_NOT_GIVEN", "MAYBE", null, false],
    ["YES_NO_NOT_GIVEN", "YES", null, true],
    ["YES_NO_NOT_GIVEN", "TRUE", null, false],
    ["MATCHING", "C", ["A", "B", "C"], true],
    ["MATCHING", "D", ["A", "B", "C"], false],
    ["DICTATION", "the quick brown fox", null, true],
    ["DICTATION", "  ", null, false],
    ["GAP_FILL", '[["a","an"],["comfortable"]]', null, true],
    ["GAP_FILL", '["a","an"]', null, false],
    ["GAP_FILL", "an", null, false],
    ["MULTI_SELECT", '["A","C"]', ["A", "B", "C"], true],
    ["MULTI_SELECT", '["A","Z"]', ["A", "B", "C"], false],
    ["ORDERING", '["b","a","c"]', ["a", "b", "c"], true],
    ["ORDERING", '["a","b"]', ["a", "b", "c"], false],
    ["LABELLING", '{"A":"engine","B":"wheel"}', ["A", "B"], true],
    ["LABELLING", '{"A":"engine"}', ["A", "B"], false],
    ["HIGHLIGHT_WORDS", '["quickly"]', null, true],
    ["HIGHLIGHT_WORDS", "[]", null, false],
    ["NUMERIC_ENTRY", '{"value":42,"tolerance":2}', null, true],
    ["NUMERIC_ENTRY", '{"value":"42"}', null, false],
    ["NUMERIC_ENTRY", '{"value":42,"tolerance":-1}', null, false],
    ["LONG_WRITING", null, null, true],
    ["TIMED_SPEAKING", null, null, true],
  ] as const)("%s with %s -> valid: %s", (type, correct, options, valid) => {
    const result = validateCorrectAnswerForType(type, correct, options as string[] | null);
    if (valid) expect(result).toBeNull();
    else expect(result).toEqual(expect.any(String));
  });
});

describe("validateQuestionFields", () => {
  const base = { category: "READING_COMPREHENSION", difficulty: "BEGINNER", prompt: "Some question text", timeLimitSeconds: 60 };

  it("keeps the 4 original types' rules exactly", () => {
    expect(LEGACY_QUESTION_TYPES).toEqual(["MULTIPLE_CHOICE", "READING_COMPREHENSION", "LISTENING_COMPREHENSION", "SHORT_ANSWER"]);
    expect(validateQuestionFields({ ...base, type: "MULTIPLE_CHOICE", options: ["a", "b"], correctAnswer: "a" })).toBeNull();
    expect(validateQuestionFields({ ...base, type: "MULTIPLE_CHOICE", options: ["a", "b"], correctAnswer: "c" })).toMatch(/exactly match/);
    expect(validateQuestionFields({ ...base, type: "SHORT_ANSWER" })).toBeNull();
  });

  it("accepts a new type with a well-formed answer and rejects a malformed one", () => {
    expect(validateQuestionFields({ ...base, type: "TRUE_FALSE_NOT_GIVEN", correctAnswer: "TRUE" })).toBeNull();
    expect(validateQuestionFields({ ...base, type: "TRUE_FALSE_NOT_GIVEN", correctAnswer: "yes" })).toMatch(/TRUE, FALSE or NOT_GIVEN/);
  });

  it("still rejects a type that isn't in the registry", () => {
    expect(validateQuestionFields({ ...base, type: "ESSAY_BOT" })).toMatch(/Invalid type/);
  });
});

describe("bulk import file format", () => {
  it("adds two optional columns at the end, after the original 12", () => {
    expect(TEMPLATE_COLUMNS).toHaveLength(14);
    expect(TEMPLATE_COLUMNS.slice(12)).toEqual(["Item Group", "Order In Group"]);
    expect(guessColumn("Item Group ID")).toBe("Item Group");
    expect(guessColumn("order in group")).toBe("Order In Group");
  });

  it("an old 12-column row imports exactly as before - standalone, no group", () => {
    const q = rowToQuestion({
      Question: "What is 2+2?",
      Category: "Grammar",
      Difficulty: "easy",
      "Question Type": "MCQ",
      Options: "3 | 4",
      "Correct Answer": "4",
      "Time Limit Seconds": "30",
      Active: "yes",
    });
    expect(q).toMatchObject({ category: "GRAMMAR", difficulty: "BEGINNER", type: "MULTIPLE_CHOICE", options: ["3", "4"], correctAnswer: "4", isActive: true });
    expect(q.itemGroupId).toBeNull();
    expect(q.orderInGroup).toBeNull();
  });

  it("reads the new columns and friendly names for new types", () => {
    const q = rowToQuestion({ Question: "x", "Question Type": "TFNG", "Item Group": " grp1 ", "Order In Group": "2" });
    expect(q.type).toBe("TRUE_FALSE_NOT_GIVEN");
    expect(q.itemGroupId).toBe("grp1");
    expect(q.orderInGroup).toBe(2);
    expect(rowToQuestion({ "Question Type": "Gap Fill" }).type).toBe("GAP_FILL");
    // Order without a group is meaningless and is dropped.
    expect(rowToQuestion({ "Order In Group": "3" }).orderInGroup).toBeNull();
  });

  it("round-trips through export with the new columns", () => {
    const row = questionToRow({
      category: "GRAMMAR",
      difficulty: "BEGINNER",
      type: "MULTIPLE_CHOICE",
      prompt: "p",
      timeLimitSeconds: 30,
      itemGroupId: "g1",
      orderInGroup: 3,
    });
    expect(row).toHaveLength(14);
    expect(row.slice(12)).toEqual(["g1", 3]);
  });
});

describe("small validators", () => {
  it("exam version score scale must be a real P1-F scale key", () => {
    expect(validateExamVariantFields({ slug: "ACADEMIC", name: "Academic", scoreScale: "IELTS_STYLE_BAND" })).toBeNull();
    expect(validateExamVariantFields({ slug: "ACADEMIC", name: "Academic", scoreScale: "MADE_UP" })).toMatch(/Unknown scoreScale/);
  });

  it("only accepts asset keys our own upload routes produce", () => {
    expect(isItemGroupAssetKeyShape("item-groups/3f2b8c1e-9a4d-4c2b-8e1f-0a1b2c3d4e5f.mp3")).toBe(true);
    expect(isItemGroupAssetKeyShape("recordings/user_1/3f2b8c1e-9a4d-4c2b-8e1f-0a1b2c3d4e5f.webm")).toBe(false);
    expect(isItemGroupAssetKeyShape("item-groups/../secret.mp3")).toBe(false);
    expect(isItemGroupAssetKeyShape("item-groups/3f2b8c1e-9a4d-4c2b-8e1f-0a1b2c3d4e5f.exe")).toBe(false);
  });
});

describe("admin rules against the database", { timeout: 60_000 }, () => {
  const run = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const cleanup: (() => Promise<unknown>)[] = [];

  afterAll(async () => {
    for (const fn of cleanup.reverse()) await fn().catch(() => {});
    await db.$disconnect();
  });

  it("catalogue: create/update, refuses deleting anything a template uses, then deletes once unlinked", async () => {
    // A throwaway family row (per-run slug - the admin create path only
    // allows registry slugs, so the family itself is made directly).
    const family = await db.examFamily.create({ data: { slug: `TEST_${run}`, name: "Unit family" } });
    cleanup.push(() => db.examFamily.deleteMany({ where: { id: family.id } }));

    const variant = await createCatalogueRecord("variants", { familyId: family.id, slug: "academic", name: "Academic", scoreScale: "IELTS_STYLE_BAND" });
    expect(variant.ok).toBe(true);
    const variantId = String(rec<{ id: string }>(variant).id);
    expect(rec<{ slug: string }>(variant).slug).toBe("ACADEMIC"); // normalized

    const dup = await createCatalogueRecord("variants", { familyId: family.id, slug: "ACADEMIC", name: "Again", scoreScale: "CEFR" });
    expect(dup).toMatchObject({ ok: false, status: 409 });

    const badScale = await createCatalogueRecord("variants", { familyId: family.id, slug: "GT", name: "GT", scoreScale: "NOPE" });
    expect(badScale).toMatchObject({ ok: false, status: 400 });

    const paper = await createCatalogueRecord("papers", { variantId, name: "Listening", durationSeconds: 1800, navigationMode: "LOCKED_SEQUENTIAL" });
    const paperId = String(rec<{ id: string }>(paper).id);
    expect(rec<{ order: number }>(paper).order).toBe(1); // auto-ordered
    const paper2 = await createCatalogueRecord("papers", { variantId, name: "Reading", durationSeconds: 3600, navigationMode: "FREE_WITHIN_SECTION" });
    expect(rec<{ order: number }>(paper2).order).toBe(2);

    const part = await createCatalogueRecord("parts", { paperId, name: "Part 1", prepSeconds: 30 });
    const partId = String(rec<{ id: string }>(part).id);

    const updated = await updateCatalogueRecord("papers", paperId, { durationSeconds: 1500, allowReview: true });
    expect(rec<{ durationSeconds: number; allowReview: boolean }>(updated)).toMatchObject({ durationSeconds: 1500, allowReview: true });
    expect(await updateCatalogueRecord("papers", paperId, { navigationMode: "WHATEVER" })).toMatchObject({ ok: false, status: 400 });

    const template = await db.mockTestTemplate.create({
      data: {
        name: `unit-${run}`,
        examVariantId: variantId,
        sections: { create: [{ order: 1, category: "LISTENING", difficulty: "BEGINNER", questionCount: 1, examPartId: partId }] },
      },
    });
    cleanup.push(() => db.mockTestTemplate.deleteMany({ where: { id: template.id } }));

    expect(await deleteCatalogueRecord("parts", partId)).toMatchObject({ ok: false, status: 409 });
    expect(await deleteCatalogueRecord("papers", paperId)).toMatchObject({ ok: false, status: 409 });
    expect(await deleteCatalogueRecord("variants", variantId)).toMatchObject({ ok: false, status: 409 });
    expect(await deleteCatalogueRecord("families", family.id)).toMatchObject({ ok: false, status: 409 });
    // Nothing was touched by the refused deletes.
    expect((await db.mockTestTemplate.findUniqueOrThrow({ where: { id: template.id } })).examVariantId).toBe(variantId);

    await db.mockTestTemplate.delete({ where: { id: template.id } });
    expect(await deleteCatalogueRecord("families", family.id)).toMatchObject({ ok: true });
    expect(await db.examPart.findUnique({ where: { id: partId } })).toBeNull(); // cascaded
  });

  it("template link: part must belong to the chosen version; no parts without a version", async () => {
    const family = await db.examFamily.create({ data: { slug: `TEST2_${run}`, name: "Unit family 2" } });
    cleanup.push(() => db.examFamily.deleteMany({ where: { id: family.id } }));
    const [v1, v2] = await Promise.all([
      db.examVariant.create({ data: { familyId: family.id, slug: "A", name: "A", scoreScale: "CEFR" } }),
      db.examVariant.create({ data: { familyId: family.id, slug: "B", name: "B", scoreScale: "CEFR" } }),
    ]);
    const p1 = await db.examPaper.create({ data: { variantId: v1.id, order: 1, name: "P", durationSeconds: 600 } });
    const part1 = await db.examPart.create({ data: { paperId: p1.id, order: 1, name: "Part" } });

    expect(await validateTemplateExamLink(v1.id, [part1.id, null])).toBeNull();
    expect(await validateTemplateExamLink(v2.id, [part1.id])).toMatch(/doesn't belong/);
    expect(await validateTemplateExamLink(null, [part1.id])).toMatch(/Choose an exam format/);
    expect(await validateTemplateExamLink(null, [null])).toBeNull(); // plain template, as before
    expect(await validateTemplateExamLink("nope", [])).toMatch(/doesn't exist/);
  });

  it("item groups: asset key check, attach/detach, and no delete while questions are attached", async () => {
    expect(await createItemGroup({ type: "AUDIO", assetKey: "recordings/someone/else.webm" })).toMatchObject({ ok: false, status: 400 });
    expect(await createItemGroup({ type: "PASSAGE" })).toMatchObject({ ok: false, status: 400 });
    expect(await createItemGroup({ type: "PASSAGE", text: "t", metadataJson: "[1,2]" })).toMatchObject({ ok: false, status: 400 });

    const created = await createItemGroup({ type: "PASSAGE", title: `unit-${run}`, text: "A passage.", metadataJson: '{"wordCount":2}' });
    expect(created.ok).toBe(true);
    const groupId = String(rec<{ id: string }>(created).id);
    cleanup.push(() => db.itemGroup.deleteMany({ where: { id: groupId } }));

    // Type can't be switched after creation.
    const upd = await updateItemGroup(groupId, { type: "AUDIO", title: "Renamed" });
    expect(rec<{ type: string; title: string }>(upd)).toMatchObject({ type: "PASSAGE", title: "Renamed" });

    const other = await db.itemGroup.create({ data: { type: "PASSAGE", text: "other" } });
    cleanup.push(() => db.itemGroup.deleteMany({ where: { id: other.id } }));
    const q = await db.practiceQuestion.create({
      data: { category: "READING_COMPREHENSION", difficulty: "BEGINNER", type: "TRUE_FALSE_NOT_GIVEN", prompt: `unit ${run}`, correctAnswer: "TRUE", timeLimitSeconds: 30, isActive: false },
    });
    cleanup.push(() => db.practiceQuestion.deleteMany({ where: { id: q.id } }));

    expect(await attachQuestions(groupId, [{ questionId: q.id, orderInGroup: 0 }])).toMatchObject({ ok: false, status: 400 });
    expect(await attachQuestions(groupId, [{ questionId: q.id, orderInGroup: 1 }])).toMatchObject({ ok: true });
    expect(await attachQuestions(other.id, [{ questionId: q.id, orderInGroup: 1 }])).toMatchObject({ ok: false, status: 409 }); // not silently moved

    expect(await deleteItemGroup(groupId)).toMatchObject({ ok: false, status: 409 });
    await detachQuestions(groupId, [q.id]);
    expect((await db.practiceQuestion.findUniqueOrThrow({ where: { id: q.id } })).itemGroupId).toBeNull();
    expect(await deleteItemGroup(groupId)).toMatchObject({ ok: true });
  });

  it("bulk import: attaches to an existing group, rejects an unknown one, and validates new-type answers", async () => {
    const group = await db.itemGroup.create({ data: { type: "PASSAGE", text: "import passage" } });
    cleanup.push(() => db.itemGroup.deleteMany({ where: { id: group.id } }));
    cleanup.push(() => db.practiceQuestion.deleteMany({ where: { prompt: { contains: `import-${run}` } } }));

    const base = { category: "READING_COMPREHENSION", difficulty: "BEGINNER", timeLimitSeconds: 30, isActive: false };
    const { results } = await processQuestionBatch(
      [
        { ...base, type: "TRUE_FALSE_NOT_GIVEN", prompt: `import-${run} the sky is green`, correctAnswer: "FALSE", itemGroupId: group.id, orderInGroup: 1 },
        { ...base, type: "TRUE_FALSE_NOT_GIVEN", prompt: `import-${run} unknown group item`, correctAnswer: "TRUE", itemGroupId: "no-such-group" },
        { ...base, type: "GAP_FILL", prompt: `import-${run} a malformed gap fill ___`, correctAnswer: "an" },
      ],
      { insert: true, allowDuplicates: true }
    );
    expect(results.map((r) => r.status)).toEqual(["valid", "error", "error"]);
    expect(results[1].error).toMatch(/doesn't exist/);

    const stored = await db.practiceQuestion.findFirstOrThrow({ where: { prompt: `import-${run} the sky is green` } });
    expect(stored).toMatchObject({ itemGroupId: group.id, orderInGroup: 1, type: "TRUE_FALSE_NOT_GIVEN" });
  });
});
