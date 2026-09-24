import { describe, expect, it } from "vitest";
import { QUESTION_TYPE_REGISTRY, QUESTION_TYPE_KEYS, isValidQuestionTypeKey, getQuestionTypeDef, wordCount } from "@/lib/question-types";

describe("question-type registry", () => {
  it("has exactly 16 entries: 12 new types plus the 4 existing aliases", () => {
    expect(QUESTION_TYPE_KEYS).toHaveLength(16);
    expect(QUESTION_TYPE_KEYS).toEqual(
      expect.arrayContaining([
        "GAP_FILL",
        "TRUE_FALSE_NOT_GIVEN",
        "YES_NO_NOT_GIVEN",
        "MULTI_SELECT",
        "MATCHING",
        "LABELLING",
        "ORDERING",
        "HIGHLIGHT_WORDS",
        "DICTATION",
        "NUMERIC_ENTRY",
        "LONG_WRITING",
        "TIMED_SPEAKING",
        "MULTIPLE_CHOICE",
        "READING_COMPREHENSION",
        "LISTENING_COMPREHENSION",
        "SHORT_ANSWER",
      ])
    );
  });

  it("isValidQuestionTypeKey / getQuestionTypeDef agree with the registry", () => {
    expect(isValidQuestionTypeKey("GAP_FILL")).toBe(true);
    expect(isValidQuestionTypeKey("NOT_A_TYPE")).toBe(false);
    expect(getQuestionTypeDef("GAP_FILL")).toBe(QUESTION_TYPE_REGISTRY.GAP_FILL);
    expect(getQuestionTypeDef("NOT_A_TYPE")).toBeUndefined();
  });

  it("returns { isCorrect: null, score: null } for a missing correctAnswer on every auto-gradable type, never a fabricated result", () => {
    // One type-appropriate, schema-valid answer per key - a generic
    // placeholder can't work here since the whole point is exercising
    // each grader's real answer shape.
    const sampleAnswers: Record<string, unknown> = {
      GAP_FILL: ["a", "b"],
      TRUE_FALSE_NOT_GIVEN: "TRUE",
      YES_NO_NOT_GIVEN: "YES",
      MULTI_SELECT: ["A"],
      MATCHING: "C",
      LABELLING: { "1": "engine" },
      ORDERING: ["step1"],
      HIGHLIGHT_WORDS: ["quickly"],
      DICTATION: "the quick brown fox",
      NUMERIC_ENTRY: 42,
      MULTIPLE_CHOICE: "an",
      READING_COMPREHENSION: "an",
      LISTENING_COMPREHENSION: "an",
      SHORT_ANSWER: "anything",
    };

    for (const key of Object.keys(sampleAnswers)) {
      const def = QUESTION_TYPE_REGISTRY[key];
      const answer = sampleAnswers[key];
      expect(def.answerSchema.safeParse(answer).success).toBe(true); // the sample itself must be a valid answer for this type
      expect(() => def.grade(answer as never, null)).not.toThrow();
      expect(def.grade(answer as never, null)).toEqual({ isCorrect: null, score: null });
    }
  });
});

describe("GAP_FILL", () => {
  const grader = QUESTION_TYPE_REGISTRY.GAP_FILL;
  const correct = JSON.stringify([["a", "an"], ["comfortable"]]);

  it("is correct when every blank matches one of its accepted answers, case-insensitively", () => {
    expect(grader.grade(["AN", "Comfortable"], correct)).toEqual({ isCorrect: true, score: 100 });
    expect(grader.grade(["an", "comfortable"], correct)).toEqual({ isCorrect: true, score: 100 });
  });

  it("is incorrect if any blank is wrong or the blank count doesn't match", () => {
    expect(grader.grade(["a", "uncomfortable"], correct)).toEqual({ isCorrect: false, score: 0 });
    expect(grader.grade(["an"], correct)).toEqual({ isCorrect: false, score: 0 });
  });
});

describe("TRUE_FALSE_NOT_GIVEN / YES_NO_NOT_GIVEN", () => {
  it("grades an exact enum match", () => {
    expect(QUESTION_TYPE_REGISTRY.TRUE_FALSE_NOT_GIVEN.grade("TRUE", "TRUE")).toEqual({ isCorrect: true, score: 100 });
    expect(QUESTION_TYPE_REGISTRY.TRUE_FALSE_NOT_GIVEN.grade("FALSE", "TRUE")).toEqual({ isCorrect: false, score: 0 });
    expect(QUESTION_TYPE_REGISTRY.YES_NO_NOT_GIVEN.grade("NOT_GIVEN", "NOT_GIVEN")).toEqual({ isCorrect: true, score: 100 });
  });

  it("rejects the answer schema for a value outside the enum", () => {
    expect(QUESTION_TYPE_REGISTRY.TRUE_FALSE_NOT_GIVEN.answerSchema.safeParse("MAYBE").success).toBe(false);
  });
});

describe("MULTI_SELECT", () => {
  const grader = QUESTION_TYPE_REGISTRY.MULTI_SELECT;
  const correct = JSON.stringify(["A", "C"]);

  it("is correct only when the selected set exactly matches, regardless of order", () => {
    expect(grader.grade(["C", "A"], correct)).toEqual({ isCorrect: true, score: 100 });
    expect(grader.grade(["A"], correct)).toEqual({ isCorrect: false, score: 0 }); // missing one
    expect(grader.grade(["A", "B", "C"], correct)).toEqual({ isCorrect: false, score: 0 }); // extra one
  });
});

describe("MATCHING", () => {
  it("grades a single item's match label, case-insensitively", () => {
    const grader = QUESTION_TYPE_REGISTRY.MATCHING;
    expect(grader.grade("C", "c")).toEqual({ isCorrect: true, score: 100 });
    expect(grader.grade("B", "C")).toEqual({ isCorrect: false, score: 0 });
  });
});

describe("LABELLING", () => {
  const grader = QUESTION_TYPE_REGISTRY.LABELLING;
  const correct = JSON.stringify({ "1": "engine", "2": "wheel" });

  it("is correct only when every label matches", () => {
    expect(grader.grade({ "1": "Engine", "2": "Wheel" }, correct)).toEqual({ isCorrect: true, score: 100 });
    expect(grader.grade({ "1": "engine", "2": "tyre" }, correct)).toEqual({ isCorrect: false, score: 0 });
  });
});

describe("ORDERING", () => {
  const grader = QUESTION_TYPE_REGISTRY.ORDERING;
  const correct = JSON.stringify(["step1", "step2", "step3"]);

  it("requires the exact sequence, not just the same items", () => {
    expect(grader.grade(["step1", "step2", "step3"], correct)).toEqual({ isCorrect: true, score: 100 });
    expect(grader.grade(["step2", "step1", "step3"], correct)).toEqual({ isCorrect: false, score: 0 });
  });
});

describe("HIGHLIGHT_WORDS", () => {
  const grader = QUESTION_TYPE_REGISTRY.HIGHLIGHT_WORDS;
  const correct = JSON.stringify(["quickly", "carefully"]);

  it("is correct when the selected word set matches exactly", () => {
    expect(grader.grade(["carefully", "quickly"], correct)).toEqual({ isCorrect: true, score: 100 });
    expect(grader.grade(["quickly"], correct)).toEqual({ isCorrect: false, score: 0 });
  });
});

describe("DICTATION", () => {
  const grader = QUESTION_TYPE_REGISTRY.DICTATION;

  it("normalizes whitespace and case before comparing", () => {
    expect(grader.grade("  The  quick Brown fox  ", "the quick brown fox")).toEqual({ isCorrect: true, score: 100 });
    expect(grader.grade("the slow brown fox", "the quick brown fox")).toEqual({ isCorrect: false, score: 0 });
  });
});

describe("NUMERIC_ENTRY", () => {
  const grader = QUESTION_TYPE_REGISTRY.NUMERIC_ENTRY;

  it("requires an exact match when no tolerance is set", () => {
    expect(grader.grade(42, JSON.stringify({ value: 42 }))).toEqual({ isCorrect: true, score: 100 });
    expect(grader.grade(41, JSON.stringify({ value: 42 }))).toEqual({ isCorrect: false, score: 0 });
  });

  it("accepts an answer within the configured tolerance", () => {
    expect(grader.grade(43, JSON.stringify({ value: 42, tolerance: 2 }))).toEqual({ isCorrect: true, score: 100 });
    expect(grader.grade(45, JSON.stringify({ value: 42, tolerance: 2 }))).toEqual({ isCorrect: false, score: 0 });
  });
});

describe("LONG_WRITING", () => {
  it("is never auto-graded, but wordCount() reports a real count", () => {
    const grader = QUESTION_TYPE_REGISTRY.LONG_WRITING;
    expect(grader.autoGradable).toBe(false);
    expect(grader.grade("Any essay text at all", "irrelevant")).toEqual({ isCorrect: null, score: null });
    expect(wordCount("This has exactly five words.")).toBe(5);
    expect(wordCount("  extra   spacing   here  ")).toBe(3);
  });
});

describe("TIMED_SPEAKING", () => {
  it("is never auto-graded and takes a recordingId as its answer shape", () => {
    const grader = QUESTION_TYPE_REGISTRY.TIMED_SPEAKING;
    expect(grader.autoGradable).toBe(false);
    expect(grader.grade({ recordingId: "rec_1" }, "irrelevant")).toEqual({ isCorrect: null, score: null });
    expect(grader.answerSchema.safeParse({ recordingId: "rec_1" }).success).toBe(true);
    expect(grader.answerSchema.safeParse({}).success).toBe(false);
  });
});

describe("existing-type aliases reproduce api/practice/attempts/route.ts's real behaviour exactly", () => {
  it("MULTIPLE_CHOICE/READING_COMPREHENSION/LISTENING_COMPREHENSION are case-SENSITIVE trim-only compares (not case-insensitive)", () => {
    const mcq = QUESTION_TYPE_REGISTRY.MULTIPLE_CHOICE;
    expect(mcq.grade("  an  ", "an")).toEqual({ isCorrect: true, score: 100 }); // trims
    expect(mcq.grade("AN", "an")).toEqual({ isCorrect: false, score: 0 }); // does NOT lowercase - matches the real route
  });

  it("SHORT_ANSWER falls through to not-graded when there is no correctAnswer, exactly like the real route", () => {
    const shortAnswer = QUESTION_TYPE_REGISTRY.SHORT_ANSWER;
    expect(shortAnswer.grade("anything I want to say", null)).toEqual({ isCorrect: null, score: null });
  });

  it("SHORT_ANSWER DOES grade when a correctAnswer exists, exactly like the real route", () => {
    const shortAnswer = QUESTION_TYPE_REGISTRY.SHORT_ANSWER;
    expect(shortAnswer.grade("Read this sentence aloud.", "Read this sentence aloud.")).toEqual({ isCorrect: true, score: 100 });
  });
});
