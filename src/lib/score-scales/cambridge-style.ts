// CAMBRIDGE_STYLE_SCALE: an approximate "-style" 80-230 scale, linearly
// derived from this platform's own 0-100 rule-based score - not the real
// Cambridge English Scale (proprietary, not reproduced here). Also
// reports the nearest qualification-level label most people associate
// with a given range, purely as an orientation aid, clearly marked
// approximate.
import type { ScaleResult } from "./types";

export const CAMBRIDGE_STYLE_MIN = 80;
export const CAMBRIDGE_STYLE_MAX = 230;

export interface CambridgeStyleLevelThreshold {
  minValue: number;
  label: string; // e.g. "B1-style", "C2-style" - deliberately not a real qualification name
}

export const CAMBRIDGE_STYLE_LEVEL_TABLE: CambridgeStyleLevelThreshold[] = [
  { minValue: 200, label: "C2-style" },
  { minValue: 180, label: "C1-style" },
  { minValue: 160, label: "B2-style" },
  { minValue: 140, label: "B1-style" },
  { minValue: 120, label: "A2-style" },
  { minValue: 80, label: "A1-style" },
];

export function scoreToCambridgeStyle(score0to100: number): number {
  const clamped = Math.max(0, Math.min(100, score0to100));
  const scaled = CAMBRIDGE_STYLE_MIN + (clamped / 100) * (CAMBRIDGE_STYLE_MAX - CAMBRIDGE_STYLE_MIN);
  return Math.round(scaled);
}

export function cambridgeStyleLevelLabel(value: number): string {
  const descending = [...CAMBRIDGE_STYLE_LEVEL_TABLE].sort((a, b) => b.minValue - a.minValue);
  for (const t of descending) {
    if (value >= t.minValue) return t.label;
  }
  return CAMBRIDGE_STYLE_LEVEL_TABLE[CAMBRIDGE_STYLE_LEVEL_TABLE.length - 1].label;
}

export function toScaleResult(value: number): ScaleResult {
  return { scale: "CAMBRIDGE_STYLE_SCALE", label: `${value} (${cambridgeStyleLevelLabel(value)})`, value, isEstimate: true };
}
