import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { isValidItemGroupType, validateItemGroupFields } from "@/lib/item-groups";

afterAll(async () => {
  await db.$disconnect();
});

describe("item-groups registry", () => {
  it("accepts every real type and rejects an unknown one", () => {
    for (const t of ["PASSAGE", "AUDIO", "IMAGE", "CHART", "VIDEO"]) {
      expect(isValidItemGroupType(t)).toBe(true);
    }
    expect(isValidItemGroupType("PDF")).toBe(false);
  });

  it("requires text content for a PASSAGE group", () => {
    expect(validateItemGroupFields({ type: "PASSAGE" })).toMatch(/require text content/);
    expect(validateItemGroupFields({ type: "PASSAGE", text: "Once upon a time..." })).toBeNull();
  });

  it("requires an uploaded asset for AUDIO/IMAGE/CHART/VIDEO groups", () => {
    expect(validateItemGroupFields({ type: "AUDIO" })).toMatch(/require an uploaded asset/);
    expect(validateItemGroupFields({ type: "AUDIO", assetKey: "item-groups/abc.mp3" })).toBeNull();
    expect(validateItemGroupFields({ type: "IMAGE", assetKey: "item-groups/abc.png" })).toBeNull();
  });

  it("rejects an invalid type outright", () => {
    expect(validateItemGroupFields({ type: "PDF", text: "whatever" })).toMatch(/Invalid item group type/);
  });

  it("only allows playLimit on AUDIO groups, and only a positive integer", () => {
    expect(validateItemGroupFields({ type: "IMAGE", assetKey: "x.png", playLimit: 2 })).toMatch(/playLimit only applies to AUDIO/);
    expect(validateItemGroupFields({ type: "AUDIO", assetKey: "x.mp3", playLimit: 0 })).toMatch(/positive integer/);
    expect(validateItemGroupFields({ type: "AUDIO", assetKey: "x.mp3", playLimit: 1.5 })).toMatch(/positive integer/);
    expect(validateItemGroupFields({ type: "AUDIO", assetKey: "x.mp3", playLimit: 2 })).toBeNull();
  });
});

describe("ItemGroup schema (P1-B)", () => {
  const marker = `item-group-test-${Date.now()}`;

  it("creates a PASSAGE group and links two questions to it via itemGroupId/orderInGroup", async () => {
    const group = await db.itemGroup.create({
      data: { type: "PASSAGE", title: marker, text: "A short reading passage for two comprehension questions." },
    });

    const q1 = await db.practiceQuestion.create({
      data: {
        category: "READING_COMPREHENSION",
        difficulty: "BEGINNER",
        type: "READING_COMPREHENSION",
        prompt: `[${marker}] Question 1 about the passage`,
        options: JSON.stringify(["A", "B", "C"]),
        correctAnswer: "A",
        timeLimitSeconds: 30,
        itemGroupId: group.id,
        orderInGroup: 1,
      },
    });
    const q2 = await db.practiceQuestion.create({
      data: {
        category: "READING_COMPREHENSION",
        difficulty: "BEGINNER",
        type: "READING_COMPREHENSION",
        prompt: `[${marker}] Question 2 about the passage`,
        options: JSON.stringify(["A", "B", "C"]),
        correctAnswer: "B",
        timeLimitSeconds: 30,
        itemGroupId: group.id,
        orderInGroup: 2,
      },
    });

    const reloaded = await db.itemGroup.findUniqueOrThrow({
      where: { id: group.id },
      include: { questions: { orderBy: { orderInGroup: "asc" } } },
    });
    expect(reloaded.questions.map((q) => q.id)).toEqual([q1.id, q2.id]);

    await db.practiceQuestion.deleteMany({ where: { id: { in: [q1.id, q2.id] } } });
    await db.itemGroup.delete({ where: { id: group.id } });
  });

  it("a question's existing standalone passage field keeps working with no itemGroupId set (unchanged behaviour)", async () => {
    const q = await db.practiceQuestion.create({
      data: {
        category: "LISTENING",
        difficulty: "BEGINNER",
        type: "LISTENING_COMPREHENSION",
        prompt: `[${marker}] Standalone question`,
        passage: "S1: Hello.\nS2: Hi there.",
        options: JSON.stringify(["A", "B"]),
        correctAnswer: "A",
        timeLimitSeconds: 30,
      },
    });
    expect(q.itemGroupId).toBeNull();
    expect(q.orderInGroup).toBeNull();
    expect(q.passage).toBe("S1: Hello.\nS2: Hi there.");

    await db.practiceQuestion.delete({ where: { id: q.id } });
  });
});
