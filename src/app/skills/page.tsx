import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight, Mic, Search, Target } from "lucide-react";
import { Icon, IconBadge } from "@/components/ui/Icon";
import { MasteryBadge, MasteryBar } from "@/components/skills/MasteryBadge";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { drillableCountsByNode, VOICE_CATEGORY_PRACTICE, visibleSkillWhere } from "@/lib/skills/drills";
import { MIN_ATTEMPTS_FOR_BAND, type Band, type MasteryResult } from "@/lib/skills/mastery";
import { reconcileUserMastery } from "@/lib/skills/mastery-store";
import { CATEGORY_SHORT_NAMES, displayName } from "@/lib/skills/taxonomy";

export const metadata = { title: "My Skills - VocalisAi" };

type Node = { id: string; name: string; depth: number; parentId: string | null; categoryCode: string };

const UNRATED: MasteryResult = { score: 0, band: "UNRATED", attempts: 0, correct: 0, levelsSeen: [], lastAttemptAt: null };

export default async function SkillsDashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [nodes, mastery, drillable] = await Promise.all([
    db.skill.findMany({
      where: await visibleSkillWhere(),
      orderBy: [{ depth: "asc" }, { sortOrder: "asc" }],
      select: { id: true, name: true, depth: true, parentId: true, categoryCode: true },
    }),
    reconcileUserMastery(userId),
    drillableCountsByNode(userId),
  ]);

  const byId = new Map<string, Node>(nodes.map((n) => [n.id, n]));
  const categories = nodes.filter((n) => n.depth === 1);
  const childrenOf = (id: string) => nodes.filter((n) => n.parentId === id);
  const m = (id: string) => mastery.get(id) ?? UNRATED;

  // Weakest rated skills/subcategories that have drill questions.
  const recommended = [...mastery.entries()]
    .filter(([id, r]) => byId.get(id) && byId.get(id)!.depth >= 2 && (r.band === "WEAK" || r.band === "DEVELOPING") && (drillable.get(id) ?? 0) > 0)
    .sort((a, b) => a[1].score - b[1].score)
    // Don't recommend both a subcategory and a skill inside it.
    .filter(([id], i, all) => !all.slice(0, i).some(([other]) => id.startsWith(`${other}.`) || other.startsWith(`${id}.`)))
    .slice(0, 3);

  const totalAnswers = [...mastery.entries()].filter(([id]) => byId.get(id)?.depth === 1).reduce((s, [, r]) => s + r.attempts, 0);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink-950">My Skills</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        How strong you are in each area, worked out from every answer you give - recent answers and harder questions count more. A skill gets a
        rating after {MIN_ATTEMPTS_FOR_BAND} answers.
      </p>
      <BandLegend />

      <section className="card mt-6 p-5">
        <div className="flex items-start gap-4">
          <IconBadge as={Search} />
          <div className="min-w-0">
            <h2 className="font-display font-bold text-ink-950">I&apos;m weak in&hellip;</h2>
            <p className="mt-0.5 text-sm text-slate-600">Pick an area for a short check. We&apos;ll show you exactly which parts need work and the drills that fix them.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link key={c.id} href={`/skills/diagnostic/${c.id.toLowerCase()}`} className="btn-secondary btn-sm">
                  {VOICE_CATEGORY_PRACTICE[c.id] && <Icon as={Mic} />}
                  {displayName(c)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {recommended.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold text-ink-950">Recommended drills</h2>
          <p className="mt-0.5 text-sm text-slate-600">Your weakest areas right now. Each drill is 5-10 questions with instant feedback.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {recommended.map(([id, r]) => (
              <Link key={id} href={`/skills/drill/${encodeURIComponent(id)}`} className="card block p-4 transition hover:border-brand-300 hover:shadow-md">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{CATEGORY_SHORT_NAMES[byId.get(id)!.categoryCode]}</p>
                <p className="mt-0.5 font-semibold text-ink-900">{byId.get(id)!.name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <MasteryBadge band={r.band} score={r.score} />
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                  Start drill <Icon as={ArrowRight} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {totalAnswers === 0 && (
        <p className="mt-6 rounded-md bg-brand-50 px-4 py-3 text-sm text-brand-800">
          No answers yet - start with &ldquo;I&apos;m weak in&hellip;&rdquo; above, or any drill below, and your scores will appear here.
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {categories.map((cat) => {
          const cm = m(cat.id);
          const subs = childrenOf(cat.id);
          const shown = subs.filter((s) => (drillable.get(s.id) ?? 0) > 0 || m(s.id).attempts > 0);
          const hidden = subs.length - shown.length;
          const voice = VOICE_CATEGORY_PRACTICE[cat.id];
          return (
            <section key={cat.id} className="card min-w-0 p-5" aria-labelledby={`cat-${cat.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id={`cat-${cat.id}`} className="font-display font-bold text-ink-950">
                    {displayName(cat)}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">{cat.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {cm.attempts === 0 ? "No answers yet" : `${cm.attempts} answer${cm.attempts === 1 ? "" : "s"} counted`}
                  </p>
                </div>
                <MasteryBadge band={cm.band} score={cm.score} />
              </div>
              <div className="mt-3">
                <MasteryBar band={cm.band} score={cm.score} />
              </div>

              {shown.length > 0 && (
                <ul className="mt-4 divide-y divide-slate-100">
                  {shown.map((s) => (
                    <SubRow key={s.id} node={s} result={m(s.id)} drillable={(drillable.get(s.id) ?? 0) > 0} />
                  ))}
                </ul>
              )}
              {hidden > 0 && <p className="mt-2 text-xs text-slate-400">+{hidden} more area{hidden === 1 ? "" : "s"} coming soon</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                {voice ? (
                  <Link href={voice.href} className="btn-secondary btn-sm">
                    <Icon as={Mic} />
                    {voice.label}
                  </Link>
                ) : (
                  (drillable.get(cat.id) ?? 0) > 0 && (
                    <Link href={`/skills/diagnostic/${cat.id.toLowerCase()}`} className="btn-secondary btn-sm">
                      <Icon as={Target} />
                      Check my level
                    </Link>
                  )
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SubRow({ node, result, drillable }: { node: Node; result: MasteryResult; drillable: boolean }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className="min-w-0 text-sm font-medium text-ink-900">{node.name}</p>
          <MasteryBadge band={result.band as Band} score={result.score} />
        </div>
        <div className="mt-1.5">
          <MasteryBar band={result.band as Band} score={result.score} />
        </div>
      </div>
      {drillable && (
        <Link href={`/skills/drill/${encodeURIComponent(node.id)}`} className="btn-ghost btn-sm flex-none" aria-label={`Drill ${node.name}`}>
          Drill
          <Icon as={ArrowRight} />
        </Link>
      )}
    </li>
  );
}

function BandLegend() {
  const items: { band: Band; text: string }[] = [
    { band: "WEAK", text: "under 50" },
    { band: "DEVELOPING", text: "50-74" },
    { band: "PROFICIENT", text: "75-89" },
    { band: "MASTERED", text: "90+" },
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
      {items.map((i) => (
        <span key={i.band} className="inline-flex items-center gap-1">
          <MasteryBadge band={i.band} />
          {i.text}
        </span>
      ))}
    </div>
  );
}
