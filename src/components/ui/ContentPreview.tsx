import { Mic } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { Waveform } from "@/components/cine/Waveform";
import type { PracticeModeDef } from "@/lib/practice-taxonomy";

// Previews of a template page's own content, shown in its hero instead of a
// photo: every company test, skill area and practice mode gets a picture of
// what's actually inside it, so no two pages share a visual. Counts are the
// real number of questions available; nothing here is made up.

const frame = "relative overflow-hidden rounded-[1.25rem] border border-line bg-[radial-gradient(40rem_20rem_at_100%_0%,var(--accent-soft),transparent_70%),var(--surface)] p-5 shadow-[var(--shadow-lg)] sm:p-6";

function plural(n: number, word: string) {
  return `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;
}

/** A test or skill area: its sections (or skills) and how many questions each level has. */
export function CatalogPreview({
  kicker,
  title,
  rows,
  levels,
}: {
  kicker: string;
  title: string;
  rows: { name: string; detail: string }[];
  levels: { label: string; count: number }[];
}) {
  const total = levels.reduce((n, l) => n + l.count, 0);
  const shown = rows.slice(0, 5);
  return (
    <figure className={frame} aria-label={`What ${title} covers`}>
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-accent-strong">{kicker}</p>
      <p className="mt-1 font-display text-lg font-semibold text-fg">{title}</p>
      <ul className="mt-4 divide-y divide-line">
        {shown.map((r, i) => (
          <li key={r.name} className="flex items-center gap-3 py-2">
            <span className="num flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-accent-soft text-xs font-semibold text-accent-strong">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{r.name}</span>
            <span className="flex-none text-xs text-fg-subtle">{r.detail}</span>
          </li>
        ))}
        {rows.length > shown.length && <li className="py-2 text-xs text-fg-subtle">and {rows.length - shown.length} more</li>}
      </ul>
      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-line pt-4">
        {levels.map((l) => (
          <div key={l.label} className="rounded-lg bg-surface-muted px-2 py-2 text-center">
            <p className="num text-sm font-semibold text-fg">{l.count.toLocaleString("en-US")}</p>
            <p className="text-[0.65rem] text-fg-subtle">{l.label}</p>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-xs text-fg-muted">{total > 0 ? `${plural(total, "question")} ready to practise` : "Questions are being added"}</figcaption>
    </figure>
  );
}

/** A practice mode: what one question looks like, labelled as an example. */
export function ModePreview({ mode }: { mode: PracticeModeDef }) {
  return (
    <figure className={frame} aria-label={`What a ${mode.label} question looks like`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-accent-strong">{mode.label} · Example question</p>
        <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[0.68rem] font-medium text-fg-muted">Example</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-fg">{mode.description}</p>
      {mode.requiresVoice ? (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-accent text-on-ink">
            <Icon as={Mic} />
          </span>
          <Waveform bars={28} className="h-9 flex-1" />
          <span className="num text-xs text-fg-muted">0:24</span>
        </div>
      ) : (
        <ul className="mt-5 grid gap-2" aria-hidden="true">
          {["A", "B", "C", "D"].map((letter, i) => (
            <li key={letter} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${i === 1 ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}>
              <span className="num text-xs font-semibold text-fg-muted">{letter}</span>
              <span className="h-2 rounded-full bg-line-strong/60" style={{ width: `${[62, 48, 70, 54][i]}%` }} />
            </li>
          ))}
        </ul>
      )}
      <figcaption className="mt-4 text-xs text-fg-muted">{mode.requiresVoice ? "Record, then get feedback on how you sounded." : "Answer, then see the right answer and why."}</figcaption>
    </figure>
  );
}
