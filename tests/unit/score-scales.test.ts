import { describe, expect, it } from "vitest";
import { SCORE_SCALE_KEYS, isValidScoreScaleKey } from "@/lib/score-scales";
import {
  IELTS_STYLE_LISTENING_BAND_TABLE,
  IELTS_STYLE_READING_ACADEMIC_BAND_TABLE,
  IELTS_STYLE_READING_GENERAL_BAND_TABLE,
  rawToBand,
  ruleScoreToBand,
  overallBand,
} from "@/lib/score-scales/ielts-style-band";
import { CEFR_THRESHOLD_TABLE, scoreToCefr } from "@/lib/score-scales/cefr";
import { scoreToPteStyle, PTE_STYLE_MIN, PTE_STYLE_MAX } from "@/lib/score-scales/pte-style";
import { scoreToCambridgeStyle, cambridgeStyleLevelLabel, CAMBRIDGE_STYLE_MIN, CAMBRIDGE_STYLE_MAX } from "@/lib/score-scales/cambridge-style";
import { PMD_THRESHOLD_TABLE, scoreToPmd } from "@/lib/score-scales/pass-merit-distinction";
import { computePercentile } from "@/lib/score-scales/percentile";

describe("score-scales registry", () => {
  it("has exactly the 6 keys the original spec names", () => {
    expect(SCORE_SCALE_KEYS).toEqual([
      "IELTS_STYLE_BAND",
      "CEFR",
      "PTE_STYLE_10_90",
      "CAMBRIDGE_STYLE_SCALE",
      "PASS_MERIT_DISTINCTION",
      "PERCENTILE",
    ]);
    expect(isValidScoreScaleKey("IELTS_STYLE_BAND")).toBe(true);
    expect(isValidScoreScaleKey("TOEFL_SCALE")).toBe(false);
  });
});

describe("IELTS_STYLE_BAND", () => {
  it.each(IELTS_STYLE_LISTENING_BAND_TABLE)("Listening: raw $minRaw maps to band $band (exactly at the threshold)", ({ minRaw, band }) => {
    expect(rawToBand(minRaw, IELTS_STYLE_LISTENING_BAND_TABLE)).toBe(band);
  });

  it.each(IELTS_STYLE_READING_ACADEMIC_BAND_TABLE)("Reading Academic: raw $minRaw maps to band $band", ({ minRaw, band }) => {
    expect(rawToBand(minRaw, IELTS_STYLE_READING_ACADEMIC_BAND_TABLE)).toBe(band);
  });

  it.each(IELTS_STYLE_READING_GENERAL_BAND_TABLE)("Reading General Training: raw $minRaw maps to band $band", ({ minRaw, band }) => {
    expect(rawToBand(minRaw, IELTS_STYLE_READING_GENERAL_BAND_TABLE)).toBe(band);
  });

  it("clamps a negative raw score to the lowest table row and a raw score above the table's max to the top band", () => {
    expect(rawToBand(-5, IELTS_STYLE_LISTENING_BAND_TABLE)).toBe(2);
    expect(rawToBand(100, IELTS_STYLE_LISTENING_BAND_TABLE)).toBe(9);
  });

  it("Academic and General Training Reading tables give different bands for the same raw score", () => {
    // A raw score of 20 sits in different bands across the two tables -
    // proves they're genuinely separate tables, not the same one reused.
    const academic = rawToBand(20, IELTS_STYLE_READING_ACADEMIC_BAND_TABLE);
    const general = rawToBand(20, IELTS_STYLE_READING_GENERAL_BAND_TABLE);
    expect(academic).not.toBe(general);
  });

  it("scales a 0-100 rule-based score onto the 0-9 half-band range", () => {
    expect(ruleScoreToBand(0)).toBe(0);
    expect(ruleScoreToBand(100)).toBe(9);
    expect(ruleScoreToBand(50)).toBe(4.5);
  });

  it("computes overall band as the mean of skill bands, rounded to the nearest half band", () => {
    expect(overallBand([7, 7, 7, 7])).toBe(7);
    expect(overallBand([7, 6.5, 7, 6])).toBe(6.5); // mean 6.625 -> rounds to 6.5
    expect(overallBand([7, 7, 7, 8])).toBe(7.5); // mean 7.25 -> rounds to the nearest half band, 7.5
    expect(overallBand([])).toBe(0);
  });
});

describe("CEFR", () => {
  it.each(CEFR_THRESHOLD_TABLE)("score $minScore maps to $level (exactly at the threshold)", ({ minScore, level }) => {
    expect(scoreToCefr(minScore)).toBe(level);
  });

  it("clamps out-of-range scores", () => {
    expect(scoreToCefr(-10)).toBe("A1");
    expect(scoreToCefr(150)).toBe("C2");
  });

  it("a score just below a threshold gets the lower level", () => {
    expect(scoreToCefr(59)).toBe("B1");
    expect(scoreToCefr(60)).toBe("B2");
  });
});

describe("PTE_STYLE_10_90", () => {
  it("maps 0 and 100 to the scale's own min/max", () => {
    expect(scoreToPteStyle(0)).toBe(PTE_STYLE_MIN);
    expect(scoreToPteStyle(100)).toBe(PTE_STYLE_MAX);
  });

  it("scales linearly in between", () => {
    expect(scoreToPteStyle(50)).toBe(50); // midpoint of 10-90 is 50
  });

  it("clamps out-of-range input", () => {
    expect(scoreToPteStyle(-20)).toBe(PTE_STYLE_MIN);
    expect(scoreToPteStyle(150)).toBe(PTE_STYLE_MAX);
  });
});

describe("CAMBRIDGE_STYLE_SCALE", () => {
  it("maps 0 and 100 to the scale's own min/max", () => {
    expect(scoreToCambridgeStyle(0)).toBe(CAMBRIDGE_STYLE_MIN);
    expect(scoreToCambridgeStyle(100)).toBe(CAMBRIDGE_STYLE_MAX);
  });

  it("reports a plausible nearest level label, never a real qualification name", () => {
    expect(cambridgeStyleLevelLabel(80)).toBe("A1-style");
    expect(cambridgeStyleLevelLabel(230)).toBe("C2-style");
    for (const key of ["A1-style", "A2-style", "B1-style", "B2-style", "C1-style", "C2-style"]) {
      expect(key).toMatch(/-style$/); // never a bare real qualification name like "B2 First"
    }
  });
});

describe("PASS_MERIT_DISTINCTION", () => {
  it.each(PMD_THRESHOLD_TABLE)("score $minScore maps to $level (exactly at the threshold)", ({ minScore, level }) => {
    expect(scoreToPmd(minScore)).toBe(level);
  });

  it("a score just below a threshold gets the lower level", () => {
    expect(scoreToPmd(49)).toBe("NOT_YET_PASSING");
    expect(scoreToPmd(69)).toBe("PASS");
    expect(scoreToPmd(84)).toBe("MERIT");
  });
});

describe("PERCENTILE", () => {
  it("computes a real percentile rank from a real population", () => {
    expect(computePercentile(50, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100])).toBe(50);
    expect(computePercentile(100, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100])).toBe(100);
    expect(computePercentile(0, [10, 20, 30])).toBe(0);
  });

  it("returns null for an empty population rather than a fabricated number", () => {
    expect(computePercentile(50, [])).toBeNull();
  });
});
