// Small, reusable "this is an estimate" marker for any score computed by a
// score-scale conversion (src/lib/score-scales/*) rather than measured
// directly - e.g. an IELTS-style band estimated from a raw score. Not used
// on the existing Readiness score (that's already its own real, disclosed
// rule-based number, not a conversion against an external scale), only on
// new exam-family pages that map onto an external scoring scale.
export function EstimatedScoreLabel({ className }: { className?: string }) {
  return (
    <span className={`badge badge-neutral ${className ?? ""}`.trim()}>
      Estimated score
    </span>
  );
}
