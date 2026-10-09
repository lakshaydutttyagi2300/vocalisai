import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight, ClipboardCheck, Clock, Target } from "lucide-react";
import { Icon, IconBadge } from "@/components/ui/Icon";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";
import { authOptions } from "@/lib/auth";
import { MIN_COVERAGE, ASSESSMENT_FRESH_DAYS, type AreaResult } from "@/lib/readiness/international";
import { loadInternationalReadiness, supportAssessmentTemplateId } from "@/lib/readiness/international-loader";

export const metadata = { title: "International Process readiness - VocalisAi" };

const COMING_SOON = ["Ticket handling"];

const dateText = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function sourceText(a: AreaResult): string {
  if (!a.source) return "No score yet";
  if (a.source.kind === "assessment") return `From your assessment on ${dateText(a.source.at)}`;
  if (a.source.kind === "chat") return `From your last ${a.source.chats === 1 ? "marked chat" : `${a.source.chats} marked chats`}`;
  if (a.source.kind === "email") return `From your last ${a.source.emails === 1 ? "marked email" : `${a.source.emails} marked emails`}`;
  if (a.source.kind === "typing") return `From your last ${a.source.tests === 1 ? "typing test" : `${a.source.tests} typing tests`}`;
  return `From your practice (${a.source.attempts} answers)`;
}

export default async function ReadinessPage() {
  const session = await getServerSession(authOptions);
  const [r, templateId] = await Promise.all([loadInternationalReadiness(session!.user.id), supportAssessmentTemplateId()]);
  const assessmentHref = templateId ? `/mock-tests?template=${encodeURIComponent(templateId)}` : "/mock-tests";
  const fromAssessment = r.areas.some((a) => a.source?.kind === "assessment");

  return (
    <div className="pb-20">
      <MediaHero
        {...HEROES.goal}
        eyebrow="International Process Ready"
        title="Your readiness score"
        subtitle="How ready you are for international voice, chat and email roles, from your test and practice results."
      />
      <div className="page-container mt-10">
        <section className="card grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex flex-col items-center gap-2">
            {r.overall === null ? (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-dashed border-slate-200 text-center text-xs font-semibold text-slate-500">Not rated yet</div>
            ) : (
              <ScoreRing value={r.overall} label="Ready" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-ink-900">
              {r.overall === null ? "Let's find your starting point" : `You are ${r.overall}% International Process Ready`}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {r.overall === null
                ? `Your score appears once areas worth ${MIN_COVERAGE}% of it have a result (now ${r.coverage}%). The quickest way: take the Customer Support English Assessment, which covers six of the nine areas in one test.`
                : `${r.verdict} Based on areas worth ${r.coverage}% of the score${r.coverage < 100 ? "; practise the areas with no score to complete it" : ""}.`}
            </p>
            {!fromAssessment && (
              <Link href={assessmentHref} className="btn-primary mt-4 w-full whitespace-normal text-center sm:w-auto">
                <Icon as={ClipboardCheck} />
                Take the Customer Support English Assessment
              </Link>
            )}
            {!fromAssessment && <p className="mt-2 text-xs text-slate-500">Free accounts get one free try. Results count towards this score for {ASSESSMENT_FRESH_DAYS} days.</p>}
          </div>
        </section>

        {r.nextSteps.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-lg font-bold text-ink-950">Your next steps</h2>
            <p className="mt-0.5 text-sm text-slate-600">Where a little practice will move your score most.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {r.nextSteps.map((a) => (
                <Link key={a.key} href={a.practice.href} className="card flex flex-col p-4 transition hover:border-brand-300 hover:shadow-md">
                  <span className="flex items-center gap-2">
                    <Icon as={Target} className="text-brand-600" />
                    <span className="font-semibold text-ink-900">{a.label}</span>
                  </span>
                  <span className="mt-2 text-xs text-slate-500">{a.score === null ? "No score yet" : `${a.score} / 100`}</span>
                  <span className="mt-auto pt-3 text-sm font-semibold text-brand-600">{a.practice.label} &rarr;</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="font-display text-lg font-bold text-ink-950">What the score is made of</h2>
          <p className="mt-0.5 text-sm text-slate-600">The skills international process hiring rounds check, weighted by how much they matter.</p>
          <ul className="card mt-3 divide-y divide-slate-100">
            {r.areas.map((a) => (
              <li key={a.key} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-ink-900">
                      {a.label} <span className="text-xs font-normal text-slate-500">· {a.weight}% of the score</span>
                    </span>
                    <span className="num text-sm font-semibold text-ink-900">{a.score === null ? "-" : `${a.score} / 100`}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${a.score ?? 0}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{sourceText(a)}</p>
                </div>
                <Link href={a.practice.href} className="btn-ghost btn-sm flex-none">
                  Practise
                  <Icon as={ArrowRight} />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-lg font-bold text-ink-950">Coming soon</h2>
          <ul className="mt-3 grid gap-3">
            {COMING_SOON.map((c) => (
              <li key={c} className="card flex items-center gap-3 p-4 text-sm text-slate-600">
                <IconBadge as={Clock} />
                {c}
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-10 text-xs text-slate-500">
          This is VocalisAi&apos;s own practice estimate. It is not an official Versant, SVAR or employer score, and VocalisAi is not affiliated with any employer or test provider.
        </p>
      </div>
    </div>
  );
}
