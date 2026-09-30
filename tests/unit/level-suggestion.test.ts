import { describe, expect, it } from "vitest";
import { groupSessions, suggestLevel, type MarkedAnswer } from "@/lib/level-suggestion";

const HOUR = 60 * 60 * 1000;
const start = new Date("2026-09-01T09:00:00Z").getTime();

// `sessions[i]` = the right/wrong answers of session i, one per minute, sessions a day apart.
function answers(sessions: number[][]): MarkedAnswer[] {
  return sessions.flatMap((values, s) => values.map((value, i) => ({ createdAt: new Date(start + s * 24 * HOUR + i * 60_000), value })));
}

describe("groupSessions", () => {
  it("splits answers more than 30 minutes apart into sessions, newest first", () => {
    const sessions = groupSessions(answers([[1, 1], [0, 0, 0], [1]]));
    expect(sessions.map((s) => s.length)).toEqual([1, 3, 2]);
  });
});

describe("suggestLevel", () => {
  it("suggests the next level after three sessions averaging 80% or more", () => {
    const s = suggestLevel("INTERMEDIATE", answers([[1, 1, 1, 1, 0], [1, 1, 1, 1, 1], [1, 1, 1, 1, 0]]));
    expect(s).toEqual({ direction: "up", to: "ADVANCED", average: 87 });
  });

  it("suggests the level below after three sessions averaging under 40%", () => {
    const s = suggestLevel("ADVANCED", answers([[0, 0, 1], [0, 0, 0], [1, 0, 0]]));
    expect(s).toMatchObject({ direction: "down", to: "INTERMEDIATE" });
  });

  it("says nothing with fewer than three sessions, or in between", () => {
    expect(suggestLevel("BEGINNER", answers([[1, 1], [1, 1]]))).toBeNull();
    expect(suggestLevel("BEGINNER", answers([[1, 0], [1, 0], [1, 0]]))).toBeNull();
  });

  it("needs the latest session to agree", () => {
    // Two very weak sessions, then a perfect one: no "move down" right after doing well.
    expect(suggestLevel("INTERMEDIATE", answers([[0, 0, 0], [0, 0, 0], [1, 1, 1]]))).toBeNull();
    // Two perfect sessions, then a poor one: no "move up".
    expect(suggestLevel("INTERMEDIATE", answers([[1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 0, 0]]))).toBeNull();
  });

  it("uses only the last three sessions", () => {
    // An old bad session no longer counts once three good ones follow it.
    expect(suggestLevel("BEGINNER", answers([[0, 0, 0], [1, 1], [1, 1], [1, 1]]))).toMatchObject({ direction: "up", to: "INTERMEDIATE" });
  });

  it("never suggests past Expert or below Beginner", () => {
    expect(suggestLevel("EXPERT", answers([[1], [1], [1]]))).toBeNull();
    expect(suggestLevel("BEGINNER", answers([[0], [0], [0]]))).toBeNull();
    expect(suggestLevel("NOT_A_LEVEL", answers([[1], [1], [1]]))).toBeNull();
  });
});
