import { describe, expect, it } from "vitest";
import { computeInternationalReadiness, READINESS_AREAS, MIN_COVERAGE, type AssessmentEvidence, type MasteryEvidence } from "@/lib/readiness/international";

const NOW = new Date("2026-10-08T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const rated = (score: number, attempts = 10): MasteryEvidence => ({ score, band: "DEVELOPING", attempts });

// A marked Customer Support English Assessment (the owner's 100-point split).
const assessment = (at: Date): AssessmentEvidence => ({
  completedAt: at,
  components: {
    listening: { points: 20, max: 25 }, // 80
    speaking: { points: 14, max: 20 }, // 70
    pronunciation: { points: 12, max: 15 }, // 80
    fluency: { points: 9, max: 15 }, // 60
    grammarVocabulary: { points: 9, max: 10 }, // 90
    customerHandling: { points: 12, max: 15 }, // 80
  },
});

describe("International Process readiness", () => {
  it("weights add up to 100 and every area has a practice link", () => {
    expect(READINESS_AREAS.reduce((s, a) => s + a.weight, 0)).toBe(100);
    for (const a of READINESS_AREAS) expect(a.practice.href).toMatch(/^\//);
  });

  it("gives no overall score until enough of it is measured", () => {
    const r = computeInternationalReadiness(null, new Map([["ENG.LST", rated(70)], ["SPK.PRN", rated(60)]]), NOW);
    expect(r.coverage).toBe(35);
    expect(r.coverage).toBeLessThan(MIN_COVERAGE);
    expect(r.overall).toBeNull();
    expect(r.verdict).toBe("Not enough evidence yet.");
  });

  it("ignores practice areas that are not rated yet", () => {
    const r = computeInternationalReadiness(null, new Map([["ENG.LST", { score: 100, band: "UNRATED", attempts: 2 }]]), NOW);
    expect(r.areas.find((a) => a.key === "listening")!.score).toBeNull();
  });

  it("uses a recent assessment for its six areas: that alone gives a score", () => {
    const r = computeInternationalReadiness(assessment(daysAgo(3)), new Map(), NOW);
    expect(r.coverage).toBe(85); // writing (10) and judgement (5) need practice
    // (20*80 + 15*80 + 15*60 + 15*80 + 10*70 + 10*90) / 85 = 6500 / 85 = 76.5
    expect(r.overall).toBe(76);
    expect(r.verdict).toMatch(/^Nearly ready/);
    expect(r.areas.find((a) => a.key === "fluency")).toMatchObject({ score: 60, source: { kind: "assessment" } });
  });

  it("prefers the recent assessment over practice, but practice fills the other areas", () => {
    const r = computeInternationalReadiness(assessment(daysAgo(3)), new Map([["ENG.LST", rated(30)], ["ENG.WRT", rated(50, 12)], ["SJT", rated(90)]]), NOW);
    expect(r.areas.find((a) => a.key === "listening")!.score).toBe(80);
    expect(r.areas.find((a) => a.key === "writing")).toMatchObject({ score: 50, source: { kind: "practice", attempts: 12 } });
    expect(r.coverage).toBe(100);
  });

  it("an old assessment stops counting; practice decides again", () => {
    const r = computeInternationalReadiness(assessment(daysAgo(120)), new Map([["ENG.LST", rated(40)]]), NOW);
    expect(r.areas.find((a) => a.key === "listening")).toMatchObject({ score: 40, source: { kind: "practice" } });
    expect(r.overall).toBeNull();
  });

  it("averages grammar and vocabulary from practice", () => {
    const r = computeInternationalReadiness(null, new Map([["ENG.GRM", rated(80)], ["ENG.VOC", rated(60)]]), NOW);
    expect(r.areas.find((a) => a.key === "grammarVocabulary")!.score).toBe(70);
  });

  it("next steps: the weak areas that cost most first, then the biggest unmeasured areas", () => {
    const r = computeInternationalReadiness(assessment(daysAgo(3)), new Map(), NOW);
    // Below 80: fluency (gap 15*40=600), speaking (10*30=300); then the unmeasured writing (10).
    expect(r.nextSteps.map((a) => a.key)).toEqual(["fluency", "speaking", "writing"]);
    const empty = computeInternationalReadiness(null, new Map(), NOW);
    expect(empty.nextSteps.map((a) => a.key)).toEqual(["listening", "pronunciation", "fluency"]);
  });
});
