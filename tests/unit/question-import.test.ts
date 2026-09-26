import { afterAll, afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { processQuestionBatch } from "@/lib/question-import";

// Real, registry-valid categories (question-validation.ts rejects anything
// not in PRACTICE_MODES) - a made-up "TEST_*" category would fail
// validation before we ever got to test insert/dedup behaviour. Isolation
// from any other data in the test branch's GRAMMAR/WRITING rows comes from
// tracking exactly which ids this file creates and deleting only those.
const CATEGORY = "GRAMMAR";
const RUN_ID = Date.now();
const createdIds: string[] = [];

afterEach(async () => {
  if (createdIds.length > 0) {
    await db.practiceQuestion.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  }
});

afterAll(async () => {
  await db.$disconnect();
});

async function idsCreatedSince(before: Date) {
  const rows = await db.practiceQuestion.findMany({
    // Only this file's rows: other test files create GRAMMAR questions in
    // parallel, and "every GRAMMAR row since `before`" would delete theirs.
    where: { category: CATEGORY, createdAt: { gte: before }, prompt: { contains: `[TEST ${RUN_ID}]` } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

describe("processQuestionBatch", () => {
  it("inserts a valid row and reports it as valid", async () => {
    const before = new Date();
    const prompt = `[TEST ${RUN_ID}] What is 2 + 2?`;

    const outcome = await processQuestionBatch(
      [
        {
          category: CATEGORY,
          difficulty: "BEGINNER",
          type: "MULTIPLE_CHOICE",
          prompt,
          options: ["3", "4", "5"],
          correctAnswer: "4",
          timeLimitSeconds: 30,
        },
      ],
      { insert: true }
    );
    createdIds.push(...(await idsCreatedSince(before)));

    expect(outcome.insertedCount).toBe(1);
    expect(outcome.results[0].status).toBe("valid");

    const stored = await db.practiceQuestion.findUnique({ where: { id: createdIds[0] } });
    expect(stored?.prompt).toBe(prompt);
  });

  it("rejects a row missing required fields, without inserting it", async () => {
    const outcome = await processQuestionBatch(
      [{ category: CATEGORY, difficulty: "BEGINNER", type: "MULTIPLE_CHOICE", prompt: "", timeLimitSeconds: 30 }],
      { insert: true }
    );

    expect(outcome.insertedCount).toBe(0);
    expect(outcome.results[0].status).toBe("error");
  });

  it("detects a near-duplicate against an existing question and skips it by default", async () => {
    const before = new Date();
    const original = await db.practiceQuestion.create({
      data: {
        category: CATEGORY,
        difficulty: "BEGINNER",
        type: "SHORT_ANSWER",
        prompt: `[TEST ${RUN_ID}] Describe your ideal working environment in detail.`,
        timeLimitSeconds: 60,
        source: "SEEDED",
      },
    });
    createdIds.push(original.id);

    const outcome = await processQuestionBatch(
      [
        {
          category: CATEGORY,
          difficulty: "BEGINNER",
          type: "SHORT_ANSWER",
          prompt: `[TEST ${RUN_ID}] Describe your ideal working environment in detail`,
          timeLimitSeconds: 60,
        },
      ],
      { insert: true }
    );
    createdIds.push(...(await idsCreatedSince(before)).filter((id) => id !== original.id));

    expect(outcome.insertedCount).toBe(0);
    expect(outcome.results[0].status).toBe("duplicate");
    expect(outcome.results[0].matchedExisting).toBe(original.id);
  });

  it("imports a would-be duplicate anyway when allowDuplicates is true", async () => {
    const before = new Date();
    const original = await db.practiceQuestion.create({
      data: {
        category: CATEGORY,
        difficulty: "BEGINNER",
        type: "SHORT_ANSWER",
        prompt: `[TEST ${RUN_ID}] Describe your ideal working environment in full.`,
        timeLimitSeconds: 60,
        source: "SEEDED",
      },
    });
    createdIds.push(original.id);

    const outcome = await processQuestionBatch(
      [
        {
          category: CATEGORY,
          difficulty: "BEGINNER",
          type: "SHORT_ANSWER",
          prompt: `[TEST ${RUN_ID}] Describe your ideal working environment in full`,
          timeLimitSeconds: 60,
        },
      ],
      { insert: true, allowDuplicates: true }
    );
    createdIds.push(...(await idsCreatedSince(before)).filter((id) => id !== original.id));

    expect(outcome.insertedCount).toBe(1);
    expect(outcome.results[0].status).toBe("valid");
  });

  it("dry run (insert: false) reports what would happen without writing anything", async () => {
    const before = new Date();
    const prompt = `[TEST ${RUN_ID}] Pick the correct synonym for happy.`;

    const outcome = await processQuestionBatch(
      [
        {
          category: CATEGORY,
          difficulty: "INTERMEDIATE",
          type: "MULTIPLE_CHOICE",
          prompt,
          options: ["sad", "joyful", "angry"],
          correctAnswer: "joyful",
          timeLimitSeconds: 30,
        },
      ],
      { insert: false }
    );

    expect(outcome.insertedCount).toBe(1); // "would insert" count
    const stored = await idsCreatedSince(before);
    expect(stored).toHaveLength(0); // but nothing was actually written
  });
});
