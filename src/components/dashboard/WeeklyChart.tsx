import type { WeekPoint } from "@/lib/dashboard-stats";

// Weekly progress: bars for how many answers, a line for accuracy (0-100%).
// Plain SVG on one scale per mark, coloured from the theme tokens.

const W = 640;
const H = 230;
const LEFT = 40;
const RIGHT = 12;
const TOP = 22;
const BOTTOM = 30;

function shortDate(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function WeeklyChart({ weeks }: { weeks: WeekPoint[] }) {
  const plotW = W - LEFT - RIGHT;
  const plotH = H - TOP - BOTTOM;
  const step = plotW / weeks.length;
  const barW = Math.min(36, step * 0.5);
  const maxAnswers = Math.max(1, ...weeks.map((w) => w.answers));
  const x = (i: number) => LEFT + step * i + step / 2;
  const yPct = (p: number) => TOP + plotH - (p / 100) * plotH;

  // The accuracy line breaks over weeks with nothing marked.
  const segments: string[] = [];
  let current = "";
  weeks.forEach((w, i) => {
    if (w.accuracy === null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    current += `${current ? "L" : "M"}${x(i).toFixed(1)} ${yPct(w.accuracy).toFixed(1)}`;
  });
  if (current) segments.push(current);

  const summary = weeks
    .map((w) => `Week of ${shortDate(w.start)}: ${w.answers} answers${w.accuracy === null ? "" : `, ${w.accuracy}% correct`}`)
    .join(". ");

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Answers and accuracy for the last ${weeks.length} weeks. ${summary}.`} data-chart="weekly">
        {[0, 50, 100].map((p) => (
          <g key={p}>
            <line x1={LEFT} x2={W - RIGHT} y1={yPct(p)} y2={yPct(p)} className="stroke-line" strokeWidth={1} strokeDasharray={p === 0 ? undefined : "3 4"} />
            <text x={LEFT - 8} y={yPct(p) + 4} textAnchor="end" className="fill-fg-subtle" fontSize={11}>
              {p}%
            </text>
          </g>
        ))}
        {weeks.map((w, i) => {
          const h = (w.answers / maxAnswers) * plotH * 0.8;
          return (
            <g key={w.start}>
              {w.answers > 0 && (
                <>
                  <rect x={x(i) - barW / 2} y={TOP + plotH - h} width={barW} height={h} rx={4} className="fill-accent-soft stroke-accent-line" strokeWidth={1} />
                  <text x={x(i)} y={TOP + plotH - h - 6} textAnchor="middle" className="fill-fg-muted" fontSize={11}>
                    {w.answers}
                  </text>
                </>
              )}
              <text x={x(i)} y={H - 10} textAnchor="middle" className="fill-fg-subtle" fontSize={11}>
                {i === weeks.length - 1 ? "This week" : shortDate(w.start)}
              </text>
            </g>
          );
        })}
        {segments.map((d) => (
          <path key={d} d={d} fill="none" className="stroke-accent" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {weeks.map((w, i) =>
          w.accuracy === null ? null : <circle key={w.start} cx={x(i)} cy={yPct(w.accuracy)} r={4} className="fill-surface stroke-accent" strokeWidth={2.5} />
        )}
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-fg-muted">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-sm border border-accent-line bg-accent-soft" />
          Answers that week
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-accent" />
          Share correct (questions with a right answer)
        </span>
      </figcaption>
    </figure>
  );
}
