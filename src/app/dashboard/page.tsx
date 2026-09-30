import { getServerSession } from "next-auth";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, AudioLines, BookOpen, Bot, ClipboardCheck, type LucideIcon } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getModeBySlug, PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { computeCoachProfile } from "@/lib/coach-profile";
import { CATEGORY_LABELS } from "@/lib/scoring-engine";
import { Icon } from "@/components/ui/Icon";
import { listMockExams, listSpeechAnalyses } from "@/lib/candidate-history";
import { buildTrackPlan, getUserTrack, type TrackPlan } from "@/lib/goal-tracks";

function categoryToSlug(category: string): string {
  return PRACTICE_MODES.find((m) => m.category === category)?.slug ?? "practice";
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// The dashboard answers four questions, in this order: what should I do
// next, how am I doing, what should I improve, what have I done recently.
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const firstName = session?.user.name?.split(" ")[0] ?? "there";
  const userId = session!.user.id;

  const track = await getUserTrack(userId);
  const [recentAttempts, totalAttempts, coach, exams, analyses, plan] = await Promise.all([
    db.practiceAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, category: true, difficulty: true, score: true, isCorrect: true },
    }),
    db.practiceAttempt.count({ where: { userId } }),
    computeCoachProfile(userId),
    listMockExams(userId, 5),
    listSpeechAnalyses(userId, 20),
    track ? buildTrackPlan(userId, track) : Promise.resolve(null),
  ]);

  const focusCategory = coach.weakest[0]?.category ?? null;
  const focusHref = focusCategory ? `/practice/${categoryToSlug(focusCategory)}` : "/practice";

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-6 sm:pt-10">
      <h1 className="headline text-2xl text-ink-950 sm:text-3xl">
        {greeting()}, {firstName}
      </h1>

      {/* 1. What should I do next? */}
      <NextStep plan={plan} firstAssessmentDone={coach.sessionsCompleted > 0} />

      {/* 2. How am I doing? 3. What should I improve? */}
      <section aria-labelledby="performance-heading" className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="sheet flex flex-col justify-between p-7">
          <div>
            <h2 id="performance-heading" className="text-sm font-semibold text-slate-500">
              Assessment score
            </h2>
            {coach.sessionsCompleted === 0 || coach.averageOverallScore === null ? (
              <>
                <p className="headline mt-4 text-2xl text-ink-950">Not rated yet</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">Your score appears after your first mock assessment.</p>
              </>
            ) : (
              <>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="num text-6xl font-semibold text-ink-950">{coach.averageOverallScore}</span>
                  <span className="num text-lg text-slate-400">/100</span>
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Average of {coach.sessionsCompleted} assessment{coach.sessionsCompleted === 1 ? "" : "s"}
                </p>
              </>
            )}
          </div>
          <Link href={coach.sessionsCompleted === 0 ? "/mock-tests" : "/progress"} className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
            {coach.sessionsCompleted === 0 ? "Take an assessment" : "See my progress"}
            <Icon as={ArrowRight} />
          </Link>
        </div>

        <div className="sheet p-7">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-semibold text-slate-500">What to improve</h2>
            {focusCategory && (
              <Link href={focusHref} className="text-sm font-semibold text-brand-700 hover:underline">
                Practise {CATEGORY_LABELS[focusCategory]} &rarr;
              </Link>
            )}
          </div>
          {coach.weakest.length === 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <p className="max-w-md text-sm leading-relaxed text-slate-600">
                After an assessment, the categories that most need work appear here, weakest first, each with a link to practise it.
              </p>
              <Link href="/practice" className="btn-secondary flex-none">
                Browse practice
              </Link>
            </div>
          ) : (
            <ul className="mt-6 grid gap-5">
              {coach.weakest.map((w) => (
                <li key={w.category}>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <Link href={`/practice/${categoryToSlug(w.category)}`} className="font-semibold text-ink-900 hover:text-brand-700">
                      {CATEGORY_LABELS[w.category]}
                    </Link>
                    <span className="num text-slate-500">{w.average}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${w.average < 60 ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${w.average}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <nav aria-label="Shortcuts" className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
        <Shortcut href={focusHref} icon={BookOpen} title="Practice" hint={focusCategory ? `Focus: ${CATEGORY_LABELS[focusCategory]}` : "Grammar to role-play"} />
        <Shortcut href="/mock-tests" icon={ClipboardCheck} title="Mock exams" hint="Timed and proctored" />
        <Shortcut href="/speech-analysis" icon={AudioLines} title="Speech analysis" hint={analyses.length > 0 ? `${analyses.length} analysed` : "Pace, fillers, pronunciation"} />
        <Shortcut href="/coach" icon={Bot} title="AI coach" hint="Advice from your results" />
      </nav>

      {/* 4. What have I done recently? */}
      <section aria-labelledby="recent-heading" className="mt-10">
        <h2 id="recent-heading" className="headline text-xl text-ink-950">
          Recent activity
        </h2>
        <div className="sheet mt-4 grid lg:grid-cols-3">
          <ActivityColumn title="Mock exams" href="/mock-tests/history" linkLabel="All results" empty="No mock exams yet.">
            {exams.slice(0, 4).map((e) => (
              <li key={e.sessionId}>
                <Link href={e.href} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-brand-700">
                  <span className="min-w-0 truncate font-medium text-ink-900">{e.name}</span>
                  <span className="num flex-none text-xs text-slate-500">
                    {e.kind === "exam"
                      ? e.status === "completed"
                        ? `${e.correct ?? 0} / ${e.marked ?? 0} correct`
                        : "In progress"
                      : e.overallScore !== null
                        ? `${e.overallScore} / 100`
                        : e.startedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </Link>
              </li>
            ))}
          </ActivityColumn>
          <ActivityColumn title="Speech analyses" href="/speech-analysis" linkLabel="All analyses" empty="No recordings analysed yet.">
            {analyses.slice(0, 4).map((a) => (
              <li key={a.attemptId}>
                <Link href={`/practice/results/${a.attemptId}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-brand-700">
                  <span className="min-w-0 truncate font-medium text-ink-900">{a.modeLabel}</span>
                  <span className="num flex-none text-xs text-slate-500">
                    {a.wpm} wpm · {a.fillerCount} filler{a.fillerCount === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ActivityColumn>
          <ActivityColumn title="Practice answers" href="/progress" linkLabel="Progress" empty="No practice answers yet.">
            {recentAttempts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium text-ink-900">{getModeBySlug(categoryToSlug(a.category))?.label ?? a.category}</span>
                  <span className="ml-2 text-xs text-slate-500">{a.difficulty.charAt(0) + a.difficulty.slice(1).toLowerCase()}</span>
                </span>
                {/* Voice/open answers have a 0-100 score but no right/wrong (isCorrect null): show the score, never "Incorrect". */}
                <span
                  className={`flex-none text-xs font-semibold ${
                    a.score === null ? "text-slate-500" : a.isCorrect === null ? "text-ink-900" : a.isCorrect ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {a.score === null ? "Saved" : a.isCorrect === null ? `Score ${a.score}` : a.isCorrect ? "Correct" : "Incorrect"}
                </span>
              </li>
            ))}
          </ActivityColumn>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          {totalAttempts} practice attempt{totalAttempts === 1 ? "" : "s"} so far. Every number here comes from your real recordings and answers.
        </p>
      </section>
    </div>
  );
}

function NextStep({ plan, firstAssessmentDone }: { plan: TrackPlan | null; firstAssessmentDone: boolean }) {
  const next = plan?.nextSteps[0];
  return (
    <section aria-label="Your next step" className="panel-ink mt-4 overflow-hidden rounded-[1.5rem]">
      <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        {!plan ? (
          <div className="min-w-0">
            <p className="eyebrow eyebrow-on-ink">Start here</p>
            <h2 className="display mt-4 text-3xl text-white sm:text-5xl">What are you preparing for?</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
              Choose a goal and get a plan built around it: the skills that matter for it, in the order to practise them.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/goal/choose" className="btn-primary btn-lg">
                Choose my goal
                <Icon as={ArrowRight} />
              </Link>
              {!firstAssessmentDone && (
                <Link href="/mock-tests" className="btn-dark btn-lg">
                  Take an assessment first
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="eyebrow eyebrow-on-ink">My goal · {plan.track.name}</p>
            <h2 className="display mt-4 text-3xl text-white sm:text-5xl">{next ? next.name : "You're on track"}</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
              {next ? "Your next step, chosen from the skills that matter most for your goal." : "Keep practising to hold your level, or take a full assessment."}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {next && (
                <Link href={next.action.href} className="btn-primary btn-lg">
                  {next.action.label}
                  <Icon as={ArrowRight} />
                </Link>
              )}
              <Link href="/goal" className={next ? "btn-dark btn-lg" : "btn-primary btn-lg"}>
                Open my plan
              </Link>
            </div>
          </div>
        )}
        {plan && (
          <div className="grid gap-5 border-t border-white/10 pt-6 sm:grid-cols-2 lg:w-72 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <div>
              <p className="text-sm text-slate-400">Goal readiness</p>
              {plan.readiness === null ? (
                <p className="mt-1 text-2xl font-semibold text-white">Not rated yet</p>
              ) : (
                <p className="num mt-1 text-5xl font-semibold text-white">{plan.readiness}%</p>
              )}
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.round(plan.coverage * 100)}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-400">{Math.round(plan.coverage * 100)}% of your goal’s skills rated so far</p>
            </div>
            {plan.nextSteps.length > 1 && (
              <div>
                <p className="text-sm text-slate-400">Then</p>
                <ol className="mt-2 grid gap-1.5">
                  {plan.nextSteps.slice(1, 3).map((s) => (
                    <li key={s.id}>
                      <Link href={s.action.href} className="text-sm font-medium text-slate-200 hover:text-white hover:underline">
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Shortcut({ href, icon, title, hint }: { href: string; icon: LucideIcon; title: string; hint: string }) {
  return (
    <Link href={href} className="group flex items-center gap-4 bg-white px-5 py-4 transition-colors hover:bg-slate-50">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <Icon as={icon} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink-900">{title}</span>
        <span className="block truncate text-xs text-slate-500">{hint}</span>
      </span>
      <Icon as={ArrowUpRight} className="ml-auto text-slate-300 transition-colors group-hover:text-brand-600" />
    </Link>
  );
}

function ActivityColumn({ title, href, linkLabel, empty, children }: { title: string; href: string; linkLabel: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div className="min-w-0 border-slate-100 p-6 [&:not(:first-child)]:border-t lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:border-t-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink-950">{title}</h3>
        <Link href={href} className="text-xs font-semibold text-brand-700 hover:underline">
          {linkLabel} &rarr;
        </Link>
      </div>
      {children.length === 0 ? <p className="mt-4 text-sm text-slate-500">{empty}</p> : <ul className="mt-2 divide-y divide-slate-100">{children}</ul>}
    </div>
  );
}
