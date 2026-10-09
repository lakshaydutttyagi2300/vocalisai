import { describe, expect, it } from "vitest";
import { TYPING_PASSAGES, getTypingPassage } from "@/lib/typing/passages";
import { MAX_WPM, scoreTyping, typingReadinessScore, typingVerdict } from "@/lib/typing/scoring";
import { computeInternationalReadiness } from "@/lib/readiness/international";

describe("typing passages", () => {
  it("have unique keys and are long enough for a 3-minute test at job speed", () => {
    expect(new Set(TYPING_PASSAGES.map((p) => p.key)).size).toBe(TYPING_PASSAGES.length);
    for (const p of TYPING_PASSAGES) {
      expect(p.text.split(" ").length, p.key).toBeGreaterThanOrEqual(60);
      expect(p.text, p.key).not.toMatch(/\s{2}|^\s|\s$/);
    }
    expect(getTypingPassage("nope")).toBeUndefined();
  });
});

describe("typing scoring", () => {
  const passage = "Thank you for calling, how can I help you today?";

  it("scores a perfect copy: speed in 5-character words per minute, 100% accuracy", () => {
    // 49 characters + 1 trailing space per word = 50 -> 10 "words" in 30 s = 20 wpm.
    expect(scoreTyping(passage, passage, 30)).toEqual({ typedWords: 10, correctWords: 10, grossWpm: 20, netWpm: 20, accuracy: 100 });
  });

  it("counts a word wrong if it does not match the passage word in the same place", () => {
    const s = scoreTyping(passage, "Thank you for caling, how can I help you today?", 30);
    expect(s.correctWords).toBe(9);
    expect(s.accuracy).toBe(90);
    expect(s.netWpm).toBeLessThan(s.grossWpm);
  });

  it("ignores extra spaces, and stops unbelievable speeds", () => {
    expect(scoreTyping(passage, "  Thank   you  ", 30).correctWords).toBe(2);
    expect(scoreTyping(passage, passage, 1).grossWpm).toBe(MAX_WPM);
    expect(scoreTyping(passage, "", 30)).toMatchObject({ typedWords: 0, accuracy: 0 });
  });

  it("explains the result against the job target (30 wpm, 90%)", () => {
    expect(typingVerdict({ netWpm: 35, accuracy: 95 })).toMatch(/^Job-ready/);
    expect(typingVerdict({ netWpm: 20, accuracy: 95 })).toMatch(/slow/);
    expect(typingVerdict({ netWpm: 40, accuracy: 70 })).toMatch(/mistakes/);
    expect(typingVerdict({ netWpm: 10, accuracy: 60 })).toMatch(/^Keep practising/);
  });

  it("feeds the readiness score: 40 net wpm is full marks", () => {
    expect(typingReadinessScore(40)).toBe(100);
    expect(typingReadinessScore(80)).toBe(100);
    expect(typingReadinessScore(20)).toBe(50);
    const r = computeInternationalReadiness(null, new Map(), new Date(), { typing: { score: 50, tests: 2 } });
    expect(r.areas.find((a) => a.key === "typing")).toMatchObject({ score: 50, source: { kind: "typing", tests: 2 } });
    expect(r.coverage).toBe(5);
  });
});
