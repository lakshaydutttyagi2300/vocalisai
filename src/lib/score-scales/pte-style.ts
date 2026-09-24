// PTE_STYLE_10_90: an approximate "-style" 10-90 scale, linearly derived
// from this platform's own 0-100 rule-based score - not the real Pearson
// PTE Academic scoring model (which is proprietary and not reproduced
// here).
import type { ScaleResult } from "./types";

export const PTE_STYLE_MIN = 10;
export const PTE_STYLE_MAX = 90;

export function scoreToPteStyle(score0to100: number): number {
  const clamped = Math.max(0, Math.min(100, score0to100));
  const scaled = PTE_STYLE_MIN + (clamped / 100) * (PTE_STYLE_MAX - PTE_STYLE_MIN);
  return Math.round(scaled);
}

export function toScaleResult(value: number): ScaleResult {
  return { scale: "PTE_STYLE_10_90", label: String(value), value, isEstimate: true };
}
