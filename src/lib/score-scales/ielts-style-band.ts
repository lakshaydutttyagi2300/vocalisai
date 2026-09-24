// IELTS_STYLE_BAND: an approximate, clearly-labeled "-style" 0-9 half-band
// estimate - NOT the real IELTS/IDP/British Council/Cambridge conversion
// table, which is proprietary and never reproduced here (see
// TrademarkDisclaimer.tsx). The thresholds below are a reasonable,
// editable approximation for candidate feedback purposes only.
//
// Listening uses one raw-out-of-40 table regardless of variant (mirrors
// the real exam's own convention of one Listening test for every
// variant). Reading has separate Academic and General Training tables,
// since a GT passage is generally considered easier than an Academic one
// at the same band - again mirroring the real exam's convention, not its
// actual published numbers.
import type { ScaleResult } from "./types";

export interface BandThreshold {
  minRaw: number; // inclusive
  band: number;
}

// Descending order (highest raw score first) - editable config, not a
// formula, so an admin/future maintainer can retune it without touching
// the conversion logic below.
export const IELTS_STYLE_LISTENING_BAND_TABLE: BandThreshold[] = [
  { minRaw: 39, band: 9 },
  { minRaw: 37, band: 8.5 },
  { minRaw: 35, band: 8 },
  { minRaw: 32, band: 7.5 },
  { minRaw: 30, band: 7 },
  { minRaw: 26, band: 6.5 },
  { minRaw: 23, band: 6 },
  { minRaw: 18, band: 5.5 },
  { minRaw: 16, band: 5 },
  { minRaw: 13, band: 4.5 },
  { minRaw: 11, band: 4 },
  { minRaw: 8, band: 3.5 },
  { minRaw: 6, band: 3 },
  { minRaw: 4, band: 2.5 },
  { minRaw: 0, band: 2 },
];

export const IELTS_STYLE_READING_ACADEMIC_BAND_TABLE: BandThreshold[] = [
  { minRaw: 39, band: 9 },
  { minRaw: 37, band: 8.5 },
  { minRaw: 35, band: 8 },
  { minRaw: 33, band: 7.5 },
  { minRaw: 30, band: 7 },
  { minRaw: 27, band: 6.5 },
  { minRaw: 23, band: 6 },
  { minRaw: 19, band: 5.5 },
  { minRaw: 15, band: 5 },
  { minRaw: 13, band: 4.5 },
  { minRaw: 10, band: 4 },
  { minRaw: 8, band: 3.5 },
  { minRaw: 6, band: 3 },
  { minRaw: 4, band: 2.5 },
  { minRaw: 0, band: 2 },
];

export const IELTS_STYLE_READING_GENERAL_BAND_TABLE: BandThreshold[] = [
  { minRaw: 40, band: 9 },
  { minRaw: 39, band: 8.5 },
  { minRaw: 37, band: 8 },
  { minRaw: 36, band: 7.5 },
  { minRaw: 34, band: 7 },
  { minRaw: 32, band: 6.5 },
  { minRaw: 30, band: 6 },
  { minRaw: 27, band: 5.5 },
  { minRaw: 23, band: 5 },
  { minRaw: 19, band: 4.5 },
  { minRaw: 15, band: 4 },
  { minRaw: 12, band: 3.5 },
  { minRaw: 9, band: 3 },
  { minRaw: 5, band: 2.5 },
  { minRaw: 0, band: 2 },
];

export function rawToBand(raw: number, table: BandThreshold[]): number {
  const clamped = Math.max(0, raw);
  for (const t of table) {
    if (clamped >= t.minRaw) return t.band;
  }
  return table[table.length - 1].band;
}

// Writing/Speaking have no raw-out-of-40 concept here (this platform
// scores them via the existing rule-based scoring-engine.ts, 0-100) - a
// simple, clearly-approximate linear scaling onto the 0-9 half-band
// range, rounded to the nearest half band.
export function ruleScoreToBand(score0to100: number): number {
  const raw = Math.max(0, Math.min(100, score0to100));
  const band = (raw / 100) * 9;
  return Math.round(band * 2) / 2;
}

// Overall band = mean of the four skill bands, rounded to the nearest
// half band - the real exam's own well-known rounding convention (e.g.
// 6.25 -> 6.5, 6.1 -> 6.0), reproduced here only because it's a rounding
// RULE, not proprietary content.
export function overallBand(skillBands: number[]): number {
  if (skillBands.length === 0) return 0;
  const mean = skillBands.reduce((a, b) => a + b, 0) / skillBands.length;
  return Math.round(mean * 2) / 2;
}

export function toScaleResult(band: number): ScaleResult {
  return { scale: "IELTS_STYLE_BAND", label: `Band ${band.toFixed(1)}`, value: band, isEstimate: true };
}
