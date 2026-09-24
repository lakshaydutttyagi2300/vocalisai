// Shared shape for every score-scale conversion (P1-F). Every function in
// this directory is pure (no DB, no AI) and every result is explicitly
// labeled an estimate - these are informational "-style" approximations
// for candidate feedback, never a claim of official affiliation with or
// equivalence to any real exam board's actual proprietary scale (see
// src/components/exam/TrademarkDisclaimer.tsx).

export interface ScaleResult {
  scale: string; // key into SCORE_SCALE_KEYS (score-scales/index.ts)
  label: string; // human-readable, e.g. "Band 7.0", "B2", "76", "Merit"
  value: number | string;
  isEstimate: true;
}
