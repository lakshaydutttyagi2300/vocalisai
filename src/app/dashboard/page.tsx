import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getModeBySlug, PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { computeCoachProfile } from "@/lib/coach-profile";
import { CATEGORY_LABELS } from "@/lib/scoring-engine";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { AudioLines, BookOpen, Bot, ClipboardCheck, Target, type LucideIcon } from "lucide-react";
import { IconBadge } from "@/components/ui/Icon";
import { listMockExams, listSpeechAnalyses } from "@/lib/candidate-history";
import { listMockTestOptions } from "@/lib/mock-test-options";

function categoryToSlug(category: string): string {
  return PRACTICE_MODES.find((m) => m.category === category)?.slug ?? "practice";
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const firstName = session?.user.name?.split(" ")[0] ?? "there";
  const userId = session!.user.id;

  const [recentAttempts, totalAttempts, coach, exams, analyses, options] = await Promise.all([
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
    listMockTestOptions(),
  ]);
  const examChoices = options.length;

  const focusCategory = coach.weakest[0]?.category ?? null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink-950">
        {greeting()}, {firstName}
      </h1>
      <p className="mt-1 text-sm text-slate-600">Here&apos;s your English and interview readiness at a glance.</p>

      {/* Readiness */}
      {coach.sessionsCompleted === 0 ? (
        <div className="card mt-6 flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
          <IconBadge as={Target} size="lg" />
          <div className="flex-1">
            <h2 className="font-display text-lg font-bold text-ink-950">Your progress starts here</h2>
            <p className="mt-1 text-sm text-slate-600">
              Complete your first Voice &amp; Accent assessment to discover your Interview Readiness
              score, your strengths, and exactly what to improve.
            </p>
          </div>
          <Link href="/mock-tests" className="btn-primary flex-none">
            Start Assessment
          </Link>
        </div>
      ) : (
        <div className="card mt-6 grid gap-8 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex flex-col items-center gap-2">
            <ScoreRing value={coach.averageOverallScore} label="Readiness" />
            <span className="badge badge-skill">
              Based on {coach.sessionsCompleted} assessment{coach.sessionsCompleted === 1 ? "" : "s"}
            </span>
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink-900">Improvement areas</h2>
            <div className="mt-3 space-y-3">
              {coach.weakest.length === 0 ? (
                <p className="text-sm text-slate-500">Not enough data yet to identify focus areas.</p>
              ) : (
                coach.weakest.map((w) => (
                  <div key={w.category}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-ink-900">{CATEGORY_LABELS[w.category]}</span>
                      <span className="font-mono text-slate-500">{w.average}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${w.average < 60 ? "bg-red-500" : "bg-amber-500"}`}
                        style={{ width: `${w.average}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            {focusCategory && (
              <Link
                href={`/practice/${categoryToSlug(focusCategory)}`}
                className="mt-4 inline-flex text-sm font-semibold text-brand-600 hover:underline"
              >
                Practice {CATEGORY_LABELS[focusCategory]} &rarr;
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          title="Practice"
          description={
            focusCategory
              ? `Pick up ${CATEGORY_LABELS[focusCategory]} - your current focus area.`
              : "Grammar, speaking, pronunciation, writing and interviews."
          }
          href={focusCategory ? `/practice/${categoryToSlug(focusCategory)}` : "/practice"}
          cta="Start practicing"
          icon={BookOpen}
        />
        <ActionCard
          title="Mock Exams"
          description={exams.some((e) => e.kind === "exam") || examChoices > 1 ? "Proctored assessments and full exam-style practice tests." : "A full, timed, proctored assessment."}
          href="/mock-tests"
          cta="Take a mock exam"
          icon={ClipboardCheck}
        />
        <ActionCard
          title="Speech Analysis"
          description={
            analyses.length > 0
              ? `${analyses.length} recording${analyses.length === 1 ? "" : "s"} analysed - pace, fillers, pronunciation.`
              : "Record an answer and get a full pronunciation and fluency breakdown."
          }
          href="/speech-analysis"
          cta="See my analyses"
          icon={AudioLines}
        />
        <ActionCard title="AI Coach" description="Ask for advice based on your real results." href="/coach" cta="Talk to my coach" icon={Bot} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-ink-900">Recent mock exams</h2>
            <Link href="/mock-tests/history" className="text-xs font-semibold text-brand-600 hover:underline">
              All results &rarr;
            </Link>
          </div>
          {exams.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No mock exams yet. Your results will appear here.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {exams.slice(0, 4).map((e) => (
                <li key={e.sessionId}>
                  <Link href={e.href} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-brand-700">
                    <span className="min-w-0 truncate font-medium text-ink-900">{e.name}</span>
                    <span className="flex-none text-slate-600">
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
            </ul>
          )}
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-ink-900">Latest speech analyses</h2>
            <Link href="/speech-analysis" className="text-xs font-semibold text-brand-600 hover:underline">
              All analyses &rarr;
            </Link>
          </div>
          {analyses.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No recordings analysed yet. Try a speaking practice mode.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {analyses.slice(0, 4).map((a) => (
                <li key={a.attemptId}>
                  <Link href={`/practice/results/${a.attemptId}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-brand-700">
                    <span className="min-w-0 truncate font-medium text-ink-900">{a.modeLabel}</span>
                    <span className="flex-none text-slate-600">
                      {a.wpm} wpm · {a.fillerCount} filler{a.fillerCount === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card mt-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-ink-900">Recent attempts</h2>
          <Link href="/progress" className="text-xs font-semibold text-brand-600 hover:underline">
            View progress &rarr;
          </Link>
        </div>
        {recentAttempts.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-10 text-center">
            <p className="text-sm font-medium text-ink-900">No attempts yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Once you complete a practice exercise or mock test, it will show up here.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {recentAttempts.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <span className="font-medium text-ink-900">
                    {getModeBySlug(categoryToSlug(a.category))?.label ?? a.category}
                  </span>
                  <span className="ml-2 text-slate-500">{a.difficulty}</span>
                </div>
                {/* Voice/open answers have a 0-100 score but no right/wrong
                    (isCorrect null) - show the score, never "Incorrect". */}
                <span
                  className={
                    a.score === null
                      ? "text-slate-500"
                      : a.isCorrect === null
                        ? "font-medium text-ink-900"
                        : a.isCorrect
                          ? "font-medium text-green-700"
                          : "font-medium text-red-700"
                  }
                >
                  {a.score === null ? "Saved" : a.isCorrect === null ? `Score ${a.score}` : a.isCorrect ? "Correct" : "Incorrect"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        {totalAttempts} practice attempt{totalAttempts === 1 ? "" : "s"} so far - every number above
        is calculated from your real recordings and answers, never estimated.
      </p>
    </div>
  );
}

function ActionCard({ title, description, href, cta, icon }: { title: string; description: string; href: string; cta: string; icon: LucideIcon }) {
  return (
    <Link href={href} className="card group flex flex-col p-5 transition hover:border-brand-300 hover:shadow-md">
      <IconBadge as={icon} className="mb-3" />
      <h2 className="font-display font-bold text-ink-900">{title}</h2>
      <p className="mt-1 flex-1 text-sm text-slate-600">{description}</p>
      <span className="mt-3 text-sm font-semibold text-brand-600 group-hover:underline">{cta} &rarr;</span>
    </Link>
  );
}
