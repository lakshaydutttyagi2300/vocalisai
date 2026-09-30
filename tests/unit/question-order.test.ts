import { describe, expect, it } from "vitest";
import { orderQuestions, takeWithGroups, type SeenInfo } from "@/lib/question-order";

const day = (n: number) => new Date(Date.UTC(2026, 8, n));
const seen = (entries: [string, Partial<SeenInfo>][]) =>
  new Map<string, SeenInfo>(entries.map(([id, s]) => [id, { lastSeenAt: day(1), timesSeen: 1, lastCorrect: null, timesAttempted: 0, ...s }]));

describe("orderQuestions", () => {
  it("puts every unseen question before any seen one", () => {
    const order = orderQuestions(["a", "b", "c", "d"], seen([["b", {}], ["d", {}]]));
    expect(new Set(order.slice(0, 2))).toEqual(new Set(["a", "c"]));
    expect(new Set(order.slice(2))).toEqual(new Set(["b", "d"]));
  });

  it("repeats the least recently seen first, then the least seen", () => {
    const s = seen([["new", { lastSeenAt: day(9) }], ["old", { lastSeenAt: day(2) }], ["old-twice", { lastSeenAt: day(2), timesSeen: 2 }]]);
    expect(orderQuestions(["new", "old-twice", "old"], s)).toEqual(["old", "old-twice", "new"]);
  });

  it("shuffles unseen questions", () => {
    const ids = Array.from({ length: 20 }, (_, i) => `q${i}`);
    let n = 0;
    const random = () => ((n = (n * 7 + 3) % 11) / 11);
    expect(orderQuestions(ids, new Map(), false, random)).not.toEqual(ids);
  });

  it("revision uses only seen questions, wrong answers first", () => {
    const s = seen([
      ["right", { timesAttempted: 1, lastCorrect: true, lastSeenAt: day(1) }],
      ["wrong", { timesAttempted: 2, lastCorrect: false, lastSeenAt: day(5) }],
      ["skipped", { timesAttempted: 0, lastSeenAt: day(3) }],
    ]);
    expect(orderQuestions(["fresh", "right", "wrong", "skipped"], s, true)).toEqual(["wrong", "skipped", "right"]);
  });
});

describe("takeWithGroups", () => {
  const pool = [
    { id: "a" },
    { id: "p2", itemGroupId: "g", orderInGroup: 2 },
    { id: "b" },
    { id: "p1", itemGroupId: "g", orderInGroup: 1 },
  ];

  it("keeps a passage's questions together, in order", () => {
    expect(takeWithGroups(["p2", "a", "b", "p1"], pool, 3)).toEqual(["p1", "p2", "a"]);
  });

  it("never splits a group, even past the count", () => {
    expect(takeWithGroups(["a", "p1", "b", "p2"], pool, 2)).toEqual(["a", "p1", "p2"]);
  });

  it("never repeats a question", () => {
    const picked = takeWithGroups(["p1", "p2", "a", "b"], pool, 10);
    expect(new Set(picked).size).toBe(picked.length);
  });
});
