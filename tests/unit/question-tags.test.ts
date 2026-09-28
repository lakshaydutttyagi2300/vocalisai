import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { processQuestionBatch } from "@/lib/question-import";
import { autoSkillTags, difficultyForLevel, tagsAfterEdit } from "@/lib/skills/question-tags";
import { difficultyForLevel as seedDifficultyForLevel } from "../../prisma/seed-skills-content.mjs";

// Phase 5 QA: questions added AFTER the skills migration (bulk import, the
// single-question form, duplicates, AI scenarios, admin edits) must carry
// skill tags straight away, or they'd never reach drills or mastery.

describe("automatic skill tags", () => {
  it("tags a new question from its category, type and difficulty", () => {
    expect(autoSkillTags({ category: "GRAMMAR", type: "MULTIPLE_CHOICE", difficulty: "BEGINNER" })).toEqual({
      skillId: "ENG.GRM",
      skillPrecision: "subcategory",
      skillSource: "legacy-auto",
      level: 2,
    });
    expect(autoSkillTags({ category: "READING", type: "SHORT_ANSWER", difficulty: "EXPERT" })).toMatchObject({ skillId: "SPK.PRN.READALOUD", skillPrecision: "skill", level: 5 });
    expect(autoSkillTags({ category: "NUMERICAL_APTITUDE", type: "MULTIPLE_CHOICE", difficulty: "ADVANCED" })).toMatchObject({ skillId: "QNT", level: 4 });
    expect(autoSkillTags({ category: "MADE_UP", type: "MULTIPLE_CHOICE", difficulty: "INTERMEDIATE" })).toEqual({ skillId: null, skillPrecision: null, skillSource: null, level: 3 });
  });

  it("after an edit: automatic tags follow the category, hand-set tags stay, the level follows the difficulty", () => {
    const auto = { skillId: "ENG.GRM", skillPrecision: "subcategory", skillSource: "legacy-auto", level: 2 };
    expect(tagsAfterEdit(auto, { category: "VOCABULARY", type: "MULTIPLE_CHOICE", difficulty: "BEGINNER" })).toMatchObject({ skillId: "ENG.VOC", level: 2 });
    const author = { skillId: "QNT.COM.PERCENT", skillPrecision: "skill", skillSource: "author", level: 3 };
    expect(tagsAfterEdit(author, { category: "NUMERICAL_APTITUDE", type: "MULTIPLE_CHOICE", difficulty: "INTERMEDIATE" })).toEqual(author);
    expect(tagsAfterEdit(author, { category: "NUMERICAL_APTITUDE", type: "MULTIPLE_CHOICE", difficulty: "EXPERT" })).toEqual({ ...author, level: 5 });
    const l1 = { ...author, level: 1 };
    expect(tagsAfterEdit(l1, { category: "NUMERICAL_APTITUDE", type: "MULTIPLE_CHOICE", difficulty: "BEGINNER" }).level).toBe(1); // L1 is still Beginner
  });

  it("uses the same level <-> difficulty rule as the question-bank loader", () => {
    for (let l = 1; l <= 6; l++) expect(difficultyForLevel(l)).toBe(seedDifficultyForLevel(l));
  });
});

describe("bulk import tags questions on the way in (test database)", { timeout: 60_000 }, () => {
  const run = Date.now();
  afterAll(async () => {
    await db.practiceQuestion.deleteMany({ where: { prompt: { contains: `[TAGS ${run}]` } } });
  });

  it("imported questions arrive with a skill and a level", async () => {
    const res = await processQuestionBatch(
      [
        { category: "GRAMMAR", difficulty: "ADVANCED", type: "MULTIPLE_CHOICE", prompt: `[TAGS ${run}] Pick the correct form of the verb in this sentence.`, options: ["goes", "go", "going", "gone"], correctAnswer: "goes", timeLimitSeconds: 30 },
        { category: "INTERVIEW", difficulty: "BEGINNER", type: "SHORT_ANSWER", prompt: `[TAGS ${run}] Tell us about a time you learned something new at work.`, timeLimitSeconds: 90 },
      ],
      { insert: true }
    );
    expect(res.insertedCount).toBe(2);
    const rows = await db.practiceQuestion.findMany({ where: { prompt: { contains: `[TAGS ${run}]` } }, orderBy: { category: "asc" } });
    expect(rows.map((r) => [r.category, r.skillId, r.skillSource, r.level])).toEqual([
      ["GRAMMAR", "ENG.GRM", "legacy-auto", 4],
      ["INTERVIEW", "INV", "legacy-auto", 2],
    ]);
  });
});
