import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { candidatePerformance, type AreaStats } from "@/lib/performance";
import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";

export const metadata = { title: "Performance - VocalisAi" };

function AreaTable({ title, rows, empty }: { title: string; rows: AreaStats[]; empty: string }) {
  return (
    <section aria-label={title} className="sheet overflow-hidden">
      <h2 className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-ink-950">{title}</h2>
      {rows.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.key} className="px-5 py-3">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-ink-950">
                  {r.name}
                  {r.detail && <span className="ml-2 text-xs font-normal text-slate-400">{r.detail}</span>}
                </span>
                <span className="num flex-none text-xs text-slate-500">
                  {r.accuracy}% · {r.attempts} answered · {r.avgSeconds}s avg
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${r.accuracy < 50 ? "bg-warning" : r.accuracy < 85 ? "bg-accent" : "bg-success"}`} style={{ width: `${r.accuracy}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Score, accuracy and speed across catalogue tests: by subject, skill and level.
export default async function PerformancePage() {
  const session = await getServerSession(authOptions);
  const perf = await candidatePerformance(session!.user.id);
  const stats: [string, string][] = [
    ["Tests completed", String(perf.totals.tests)],
    ["Questions answered", String(perf.totals.attempts)],
    ["Accuracy", perf.totals.accuracy === null ? "—" : `${perf.totals.accuracy}%`],
    ["Avg. time per question", perf.totals.avgSeconds === null ? "—" : `${perf.totals.avgSeconds}s`],
  ];

  return (
    <div className="pb-20">
      <MediaHero {...HEROES.performance} title="How you're doing" subtitle="From every exam practice test you've taken. Accuracy counts answered questions." />
    <div className="page-container mt-2">
      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-white p-5">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="num mt-1 text-2xl font-semibold text-ink-950">{value}</dd>
          </div>
        ))}
      </dl>

      {perf.recentTests.length > 0 && (
        <section aria-labelledby="scores-heading" className="sheet mt-6 p-5">
          <h2 id="scores-heading" className="text-sm font-semibold text-ink-950">
            Recent scores
          </h2>
          <ol className="mt-4 flex h-32 items-end gap-2">
            {perf.recentTests.map((t) => (
              <li key={t.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span className="num text-[10px] text-slate-500">{t.scorePercent ?? 0}%</span>
                <Link href={`/practice-tests/${t.id}`} title={`${t.exam?.name ?? t.subject?.name ?? "Test"} · ${t.submittedAt?.toLocaleDateString("en-GB")}`} className="w-full rounded-t bg-brand-500 hover:bg-brand-700" style={{ height: `${Math.max(4, t.scorePercent ?? 0)}%` }}>
                  <span className="sr-only">
                    {t.exam?.name ?? t.subject?.name ?? "Test"}: {t.scorePercent ?? 0}%
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <AreaTable title="By subject" rows={perf.subjects} empty="Take a practice test to see your subjects here." />
        <div className="grid gap-6">
          <AreaTable title="By level" rows={perf.levels} empty="Your results at each level appear here." />
          <AreaTable title="By skill" rows={perf.skills.slice(0, 15)} empty="Skill results appear once you answer skill-tagged questions." />
        </div>
      </div>

      <p className="mt-8 text-sm">
        <Link href="/practice-tests" className="font-semibold text-brand-700 hover:underline">
          See all your tests &rarr;
        </Link>
      </p>
    </div>
    </div>
  );
}
