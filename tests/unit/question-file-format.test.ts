import { describe, expect, it } from "vitest";
import { DEFAULT_TIME_LIMIT_SECONDS, guessColumn, normalizeCategory, rowToQuestion } from "@/lib/question-file-format";

describe("reading question files", () => {
  it("accepts categories by key, page address, label or common name", () => {
    expect(normalizeCategory("GRAMMAR")).toBe("GRAMMAR");
    expect(normalizeCategory("numerical-aptitude")).toBe("NUMERICAL_APTITUDE");
    expect(normalizeCategory("Reading Comprehension")).toBe("READING_COMPREHENSION");
    expect(normalizeCategory("Quantitative Aptitude")).toBe("NUMERICAL_APTITUDE");
    expect(normalizeCategory("Logical Reasoning")).toBe("LOGICAL_REASONING");
    expect(normalizeCategory("Astrology")).toBe("ASTROLOGY"); // unknown: left for the server to reject by name
  });

  it("recognises common column names", () => {
    expect(guessColumn("Option A")).toBe("Options");
    expect(guessColumn("Answer Key")).toBe("Correct Answer");
    expect(guessColumn("Level")).toBe("Difficulty");
  });

  it("fills in type and time, and turns a lettered answer into the option", () => {
    const q = rowToQuestion({ Question: "10% of 250?", Category: "Quant", Difficulty: "Easy", Options: "20 | 25 | 30", "Correct Answer": "B" });
    expect(q).toMatchObject({ category: "NUMERICAL_APTITUDE", difficulty: "BEGINNER", type: "MULTIPLE_CHOICE", correctAnswer: "25", timeLimitSeconds: DEFAULT_TIME_LIMIT_SECONDS });
    expect(rowToQuestion({ Question: "x", Options: "A | B", "Correct Answer": "B" }).correctAnswer).toBe("B"); // already an option
    expect(rowToQuestion({ Question: "x", Options: "a | b", "Correct Answer": "(a)" }).correctAnswer).toBe("a");
    expect(rowToQuestion({ Question: "x", "Time Limit Seconds": "abc" }).timeLimitSeconds).toBeNaN(); // a wrong value is still reported
  });
});
