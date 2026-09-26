import { BAND_LABELS, type Band } from "@/lib/skills/mastery";

export const BAND_STYLE: Record<Band, { pill: string; bar: string }> = {
  UNRATED: { pill: "bg-slate-100 text-slate-600", bar: "bg-slate-300" },
  WEAK: { pill: "bg-red-50 text-red-700", bar: "bg-red-500" },
  DEVELOPING: { pill: "bg-amber-50 text-amber-800", bar: "bg-amber-500" },
  PROFICIENT: { pill: "bg-sky-50 text-sky-800", bar: "bg-sky-500" },
  MASTERED: { pill: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
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
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" role="presentation">
      <div className={`h-full rounded-full ${BAND_STYLE[band].bar}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
