// P1-F: the score-scales registry. Keys here are what ExamVariant.scoreScale
// (P1-A) is meant to hold - exam-catalogue.ts's validateExamVariantFields
// deliberately didn't check against this list yet (this file didn't exist
// when P1-A was built), so wiring that check up is left for P1-G, which is
// the first chunk that actually creates/edits ExamVariant rows through an
// admin UI.

export const SCORE_SCALE_KEYS = [
  "IELTS_STYLE_BAND",
  "CEFR",
  "PTE_STYLE_10_90",
  "CAMBRIDGE_STYLE_SCALE",
  "PASS_MERIT_DISTINCTION",
  "PERCENTILE",
] as const;

export type ScoreScaleKey = (typeof SCORE_SCALE_KEYS)[number];

export function isValidScoreScaleKey(value: string): value is ScoreScaleKey {
  return (SCORE_SCALE_KEYS as readonly string[]).includes(value);
}

export type { ScaleResult } from "./types";
export * as ieltsStyleBand from "./ielts-style-band";
export * as cefr from "./cefr";
export * as pteStyle from "./pte-style";
export * as cambridgeStyle from "./cambridge-style";
export * as passMeritDistinction from "./pass-merit-distinction";
export * as percentile from "./percentile";
