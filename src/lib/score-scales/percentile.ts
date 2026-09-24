// PERCENTILE: a stub in the sense the original P1-F spec meant - genuinely
// implemented and pure, but not wired into any real data source yet,
// since this platform has no real population of other candidates' exam
// scores to compare against (no real exam content is live, per P1's own
// scope). Never called with fabricated/empty data by anything today;
// ready for a real caller once P1-H's demo or a later real exam produces
// actual population data to pass in.
import type { ScaleResult } from "./types";

// Standard "percentage of the population this score is at or above" rank,
// computed from a real array of other scores - never estimated, never
// invented. An empty population has no meaningful percentile, so this
// returns null rather than a fabricated number, the same discipline as
// scoring-engine.ts's null-when-no-data categories.
export function computePercentile(score: number, population: number[]): number | null {
  if (population.length === 0) return null;
  const atOrBelow = population.filter((p) => p <= score).length;
  return Math.round((atOrBelow / population.length) * 100);
}

export function toScaleResult(percentile: number | null): ScaleResult | null {
  if (percentile === null) return null;
  return { scale: "PERCENTILE", label: `${percentile}th percentile`, value: percentile, isEstimate: true };
}
