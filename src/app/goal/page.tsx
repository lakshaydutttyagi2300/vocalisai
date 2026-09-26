import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowRight, ClipboardCheck, Mic, Target } from "lucide-react";
import { Icon, IconBadge } from "@/components/ui/Icon";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { MasteryBadge, MasteryBar } from "@/components/skills/MasteryBadge";
import { authOptions } from "@/lib/auth";
import { buildTrackPlan, getUserTrack, type PlanArea } from "@/lib/goal-tracks";
import { MIN_ATTEMPTS_FOR_BAND } from "@/lib/skills/mastery";

export const metadata = { title: "My goal plan - VocalisAi" };

export default async function GoalPlanPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const track = await getUserTrack(userId);
  if (!track) redirect("/goal/choose");
  const plan = await buildTrackPlan(userId, track);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">My goal</p>
          <h1 className="font-display text-2xl font-bold text-ink-950">{track.name}</h1>
          {track.description && <p className="mt-1 max-w-2xl text-sm text-slate-600">{track.description}</p>}
        </div>
        <Link href="/goal/choose" className="btn-secondary btn-sm">
          Change goal
        </Link>
      </div>

      <section className="card mt-6 grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex flex-col items-center gap-2">
          {plan.readiness === null ? (
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-dashed border-slate-200 text-center text-xs font-semibold text-slate-500">
              Not rated yet
            </div>
          ) : (
            <ScoreRing value={plan.readiness} label="Readiness" />
          )}
        </div>
        <div>
          <h2 className="font-display text-base font-bold text-ink-900">
            {plan.readiness === null ? "Let's find your starting point" : "Your readiness for this goal"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {plan.readiness === null
              ? `Do any drill or practice below - each area gets a rating after ${MIN_ATTEMPTS_FOR_BAND} answers, and your readiness appears here.`
              : `Weighted by what matters most for ${track.name}. Based on ${Math.round(plan.coverage * 100)}% of this goal's skills so far - try the unrated areas to complete the picture.`}
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold text-ink-950">Your next steps</h2>
        <p className="mt-0.5 text-sm text-slate-600">Where a little practice will move your readiness most.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {plan.nextSteps.map((a) => (
            <StepCard key={a.id} area={a} />
          ))}
        </div>
      </section>

      {plan.exams.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold text-ink-950">Your goal&apos;s exams</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {plan.exams.map((e) => (
              <Link key={e.href} href={e.href} className="card flex items-start gap-4 p-5 transition hover:border-brand-300 hover:shadow-md">
                <IconBadge as={e.kind === "interview" ? Mic : ClipboardCheck} />
                <span>
                  <span className="block font-display font-bold text-ink-900">{e.name}</span>
                  <span className="mt-1 block text-sm text-slate-600">{e.description}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                    {e.kind === "interview" ? "Start interview" : "Start exam"} <Icon as={ArrowRight} />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold text-ink-950">Everything in this goal</h2>
        <ul className="card mt-3 divide-y divide-slate-100">
          {plan.areas.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink-900">{a.name}</span>
                  <MasteryBadge band={a.mastery?.band ?? "UNRATED"} score={a.mastery?.score} />
                </div>
                <div className="mt-1.5">
                  <MasteryBar band={a.mastery?.band ?? "UNRATED"} score={a.mastery?.score ?? null} />
                </div>
              </div>
              <Link href={a.action.href} className="btn-ghost btn-sm flex-none">
                {a.action.label}
                <Icon as={ArrowRight} />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          <Link href="/skills" className="hover:underline">
            See every skill on My Skills &rarr;
          </Link>
        </p>
      </section>
    </div>
  );
}

function StepCard({ area }: { area: PlanArea }) {
  const untried = !area.mastery || area.mastery.band === "UNRATED";
  return (
    <Link href={area.action.href} className="card flex flex-col p-4 transition hover:border-brand-300 hover:shadow-md">
      <span className="flex items-center gap-2">
        <Icon as={Target} className="text-brand-600" />
        <span className="font-semibold text-ink-900">{area.name}</span>
      </span>
      <span className="mt-2">
        {untried ? <span className="text-xs font-medium text-slate-500">Not started yet</span> : <MasteryBadge band={area.mastery!.band} score={area.mastery!.score} />}
      </span>
      <span className="mt-auto pt-3 text-sm font-semibold text-brand-600">
        {area.action.label} &rarr;
      </span>
    </Link>
  );
}
