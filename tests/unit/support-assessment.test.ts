import { describe, expect, it } from "vitest";
import { dictationAccuracy, normalizeWords, wordAccuracy } from "@/lib/support-assessment/text-match";
import { computeSupportResult, fluencyScore, type ItemFacts, type SpeechFacts } from "@/lib/support-assessment/scoring";
import { itemKindOf, isSupportAssessment } from "@/lib/support-assessment/config";
import { buildAssessmentPrompt, collectRatings } from "@/lib/providers/gemini-assessment-provider";
import { parseStimulus } from "@/lib/question-stimulus";

const speech = (transcript: string, seconds = 30, extra: Partial<SpeechFacts> = {}): SpeechFacts => ({
  transcript,
  wordCount: transcript.split(/\s+/).filter(Boolean).length,
  speakingSeconds: seconds,
  fillerCount: 0,
  repetitionCount: 0,
  longPauseCount: 0,
  ...extra,
});

describe("text matching", () => {
  it("ignores case, punctuation, contractions and number spelling", () => {
    expect(normalizeWords("I'll call you on the 14th, OK?")).toEqual(["i", "will", "call", "you", "on", "the", "14", "ok"]);
    expect(normalizeWords("twenty-five fourteenth")).toEqual(["25", "14"]);
    expect(wordAccuracy("I will call you back on Friday.", "i'll call you back on friday")).toBe(1);
    expect(wordAccuracy("Your refund will arrive on Friday", "your refund arrive on monday")).toBeCloseTo(4 / 6);
    expect(wordAccuracy("Hello there", "")).toBe(0);
  });

  it("treats codes the same however they are spaced, but not wrong digits", () => {
    const want = "Your order number is BK-4729.";
    expect(dictationAccuracy(want, "your order number is bk4729")).toBe(1);
    expect(dictationAccuracy(want, "Your order number is B K 4 7 2 9")).toBe(1);
    expect(dictationAccuracy(want, "Your order number is BK-4728")).toBeLessThan(1);
    expect(dictationAccuracy(want, "")).toBe(0);
  });
});

describe("fluency", () => {
  it("rewards a steady pace and penalises silence, fillers and long pauses", () => {
    expect(fluencyScore(null)).toBe(0);
    expect(fluencyScore(speech("too short"))).toBe(0);
    const steady = fluencyScore(speech(Array(65).fill("word").join(" "), 30)); // 130 wpm
    expect(steady).toBe(100);
    expect(fluencyScore(speech(Array(65).fill("word").join(" "), 30, { fillerCount: 6, longPauseCount: 2 }))).toBeLessThan(steady);
    expect(fluencyScore(speech(Array(30).fill("word").join(" "), 30))).toBeLessThan(steady); // 60 wpm
  });
});

describe("the score out of 100", () => {
  const full: ItemFacts[] = [
    ...Array.from({ length: 5 }, (_, i) => ({ questionId: `us${i}`, kind: "us-listening" as const, unitId: `us${i}`, correct: true })),
    ...Array.from({ length: 5 }, (_, i) => ({ questionId: `uk${i}`, kind: "uk-listening" as const, unitId: `uk${i}`, correct: i < 4 })),
    { questionId: "d1", kind: "dictation", unitId: "d1", expected: "Call me on Friday", typed: "call me on friday" },
    { questionId: "g1", kind: "grammar", unitId: "g1", correct: true },
    { questionId: "a1", kind: "call-action", unitId: "a1", correct: true },
    { questionId: "r1", kind: "repeat", unitId: "r1", expected: "Thank you for waiting", speech: speech("thank you for waiting", 2) },
    { questionId: "t1", kind: "retell", unitId: "t1", speech: speech(Array(65).fill("word").join(" ")) },
    { questionId: "f1", kind: "fast-speaking", unitId: "f1", speech: null },
    { questionId: "p1", kind: "roleplay", unitId: "call1", speech: speech(Array(65).fill("word").join(" ")) },
    { questionId: "p2", kind: "roleplay", unitId: "call1", speech: speech(Array(65).fill("word").join(" ")) },
  ];
  const strong = { content: "strong", organisation: "strong", language: "strong" } as const;
  const call = { empathy: "strong", professionalism: "strong", problemSolving: "adequate", clarity: "strong" } as const;

  it("waits for the AI ratings of spoken answers before giving a total", () => {
    const r = computeSupportResult(full, {});
    expect(r.overall).toBeNull();
    expect(r.components.find((c) => c.key === "speaking")?.pending).toBe(true);
    expect(r.components.find((c) => c.key === "listening")?.pending).toBe(false);
    expect(r.priorities).toEqual([]);
  });

  it("adds the six parts to the owner's 100-point split", () => {
    const r = computeSupportResult(full, { t1: strong, call1: call });
    expect(r.components.map((c) => c.max)).toEqual([25, 20, 15, 15, 10, 15]);
    expect(r.overall).toBe(r.components.reduce((n, c) => n + c.points, 0));
    // 11 of 12 listening items fully right.
    expect(r.components.find((c) => c.key === "listening")?.points).toBe(Math.round((11 / 12) * 25));
    // A blank fast answer scores 0, so speaking is the mean of strong (0.9) and 0.
    expect(r.components.find((c) => c.key === "speaking")?.points).toBe(Math.round(0.45 * 20));
    expect(r.components.find((c) => c.key === "pronunciation")?.points).toBe(15);
    expect(r.priorities).toHaveLength(3);
    expect(r.priorities[0].label).toBe("Answering clearly and to the point");
  });

  it("gives an all-blank test 0, not a fabricated score", () => {
    const blank = full.map((i) => ({ ...i, correct: false, typed: "", speech: null }));
    expect(computeSupportResult(blank, {}).overall).toBe(0);
  });
});

describe("assessment plumbing", () => {
  it("reads the question's kind from its tag and recognises the exam", () => {
    expect(itemKindOf(["x", "support:dictation"])).toBe("dictation");
    expect(itemKindOf(["support:nope"])).toBeNull();
    expect(isSupportAssessment({ slug: "CUSTOMER_SUPPORT_BPO", family: { slug: "CUSTOMER_SERVICE_ENGLISH" } })).toBe(true);
    expect(isSupportAssessment({ slug: "CONTACT_CENTRE_SCREENING", family: { slug: "CUSTOMER_SERVICE_ENGLISH" } })).toBe(false);
  });

  it("requires every dimension of every unit from the AI", () => {
    const units = [{ id: "t1", kind: "retell" as const, task: "Retell", reference: null, turns: [{ speaker: "Candidate" as const, text: "hi" }] }];
    expect(buildAssessmentPrompt(units)).toContain("never judge the accent");
    expect(collectRatings(units, { ratings: [{ id: "t1", content: "strong", organisation: "weak", language: "adequate" }] })).toEqual({
      t1: { content: "strong", organisation: "weak", language: "adequate" },
    });
    expect(() => collectRatings(units, { ratings: [{ id: "t1", content: "strong" }] })).toThrow();
  });

  it("passes a clip's accent to the browser voice", () => {
    const passage = JSON.stringify({ audio: { script: [{ speaker: "S1", text: "Cheers" }], accent: "UK" } });
    expect(parseStimulus(passage, { id: "q" })).toMatchObject({ kind: "audio", lang: "en-GB" });
    expect(parseStimulus(JSON.stringify({ audio: { script: [{ speaker: "S1", text: "Hi" }] } }), { id: "q" })).not.toHaveProperty("lang");
  });
});
