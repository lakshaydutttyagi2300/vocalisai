import { describe, expect, it } from "vitest";
import { achievements, currentStreak, lastDays, longestStreak, weeklySeries, type DayActivity } from "@/lib/dashboard-stats";

const day = (d: string, answers = 1, marked = answers, correct = 0, seconds = 30): DayActivity => ({ day: d, answers, marked, correct, seconds });
// Thursday 1 Oct 2026, mid-afternoon UTC (that week starts Monday 28 Sep).
const NOW = new Date("2026-10-01T15:00:00Z");

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(currentStreak([day("2026-09-29"), day("2026-09-30"), day("2026-10-01")], NOW)).toBe(3);
  });
  it("keeps yesterday's streak alive before today's practice", () => {
    expect(currentStreak([day("2026-09-29"), day("2026-09-30")], NOW)).toBe(2);
  });
  it("is zero after a missed day", () => {
    expect(currentStreak([day("2026-09-28"), day("2026-09-29")], NOW)).toBe(0);
  });
  it("ignores days without answers", () => {
    expect(currentStreak([day("2026-09-30", 0), day("2026-10-01")], NOW)).toBe(1);
  });
});

describe("longestStreak", () => {
  it("finds the longest run anywhere in the history", () => {
    const days = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-09-10", "2026-09-11"].map((d) => day(d));
    expect(longestStreak(days)).toBe(4);
  });
  it("is zero with no activity", () => {
    expect(longestStreak([])).toBe(0);
  });
});

describe("lastDays", () => {
  it("totals the window and works out accuracy over marked answers only", () => {
    const days = [day("2026-09-20", 10, 10, 9), day("2026-09-30", 4, 2, 1, 120), day("2026-10-01", 6, 6, 3, 60)];
    expect(lastDays(days, 7, NOW)).toEqual({ answers: 10, marked: 8, correct: 4, seconds: 180, accuracy: 50 });
  });
  it("reports no accuracy when nothing was marked", () => {
    expect(lastDays([day("2026-10-01", 3, 0)], 7, NOW).accuracy).toBeNull();
  });
});

describe("weeklySeries", () => {
  it("returns Monday-start weeks, oldest first, with the current week last", () => {
    const weeks = weeklySeries([day("2026-09-29", 5, 4, 3), day("2026-09-21", 2, 2, 2)], 3, NOW);
    expect(weeks).toEqual([
      { start: "2026-09-14", answers: 0, accuracy: null },
      { start: "2026-09-21", answers: 2, accuracy: 100 },
      { start: "2026-09-28", answers: 5, accuracy: 75 },
    ]);
  });
  it("puts a Sunday in the week that started the Monday before", () => {
    const weeks = weeklySeries([day("2026-09-27", 1, 1, 1)], 2, NOW);
    expect(weeks).toEqual([
      { start: "2026-09-21", answers: 1, accuracy: 100 },
      { start: "2026-09-28", answers: 0, accuracy: null },
    ]);
  });
});

describe("achievements", () => {
  const base = { totalAnswers: 0, bestStreak: 0, practiceTestsFinished: 0, mockExamsFinished: 0, speechAnalyses: 0, hasGoal: false };
  it("earns nothing for a new account and shows progress towards counts", () => {
    const list = achievements(base);
    expect(list.every((a) => !a.earned)).toBe(true);
    expect(list.find((a) => a.id === "answers-50")?.progress).toEqual({ value: 0, target: 50 });
    expect(list.find((a) => a.id === "first-answer")?.progress).toBeNull();
  });
  it("earns milestones from real activity", () => {
    const list = achievements({ ...base, totalAnswers: 60, bestStreak: 3, hasGoal: true });
    const earned = list.filter((a) => a.earned).map((a) => a.id);
    expect(earned).toEqual(["goal", "first-answer", "answers-50", "streak-3"]);
    expect(list.find((a) => a.id === "streak-7")?.progress).toEqual({ value: 3, target: 7 });
  });
});
