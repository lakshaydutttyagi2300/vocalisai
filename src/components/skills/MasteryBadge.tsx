import { BAND_LABELS, type Band } from "@/lib/skills/mastery";

export const BAND_STYLE: Record<Band, { pill: string; bar: string }> = {
  UNRATED: { pill: "bg-surface-muted text-fg-muted", bar: "bg-line-strong" },
  WEAK: { pill: "bg-warning-soft text-warning-strong", bar: "bg-warning" },
  DEVELOPING: { pill: "bg-accent-softer text-accent-strong", bar: "bg-accent" },
  PROFICIENT: { pill: "bg-accent-soft text-accent-strong", bar: "bg-accent" },
  MASTERED: { pill: "bg-success-soft text-success-strong", bar: "bg-success" },
};

export function MasteryBadge({ band, score }: { band: Band; score?: number | null }) {
  return (
    <span className={`inline-flex flex-none items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${BAND_STYLE[band].pill}`}>
      {BAND_LABELS[band]}
      {band !== "UNRATED" && score !== null && score !== undefined && <span className="tabular-nums">· {Math.round(score)}</span>}
    </span>
  );
}

export function MasteryBar({ band, score }: { band: Band; score: number | null }) {
  const pct = band === "UNRATED" || score === null ? 0 : Math.max(2, Math.min(100, score));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted" role="presentation">
      <div className={`h-full rounded-full ${BAND_STYLE[band].bar}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
