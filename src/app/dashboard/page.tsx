import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getModeBySlug, PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { computeCoachProfile } from "@/lib/coach-profile";
import { CATEGORY_LABELS } from "@/lib/scoring-engine";
import { ScoreRing } from "@/components/ui/ScoreRing";

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

  const [recentAttempts, totalAttempts, coach] = await Promise.all([
    db.practiceAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.practiceAttempt.count({ where: { userId } }),
    computeCoachProfile(userId),
  ]);

  const focusCategory = coach.weakest[0]?.category ?? null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Hero */}
      <div className="hero-banner animate-fade-up p-8 sm:p-12">
        <WaveformDecoration />
        <div className="relative z-10">
          <span className="glass-badge">Voice &amp; Accent Readiness</span>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {greeting()}, <span className="text-gradient-warm">{firstName}</span>
          </h1>
          <p className="mt-2 text-sm text-white/60">Here&apos;s your Voice &amp; Accent readiness.</p>
        </div>
      </div>

      {/* Readiness */}
      {coach.sessionsCompleted === 0 ? (
        <div
          className="card-elevated animate-fade-up mt-6 flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left"
          style={{ animationDelay: "80ms" }}
        >
          <div className="icon-badge h-16 w-16 flex-none text-white">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
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
        <div
          className="card-elevated animate-fade-up mt-6 grid gap-8 p-6 sm:grid-cols-[auto_1fr] sm:items-center"
          style={{ animationDelay: "80ms" }}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="glow-halo">
              <ScoreRing value={coach.averageOverallScore} label="Readiness" />
            </div>
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
                        className={`h-full rounded-full bg-gradient-to-r ${
                          w.average < 60 ? "from-red-400 to-red-600" : "from-amber-400 to-amber-600"
                        }`}
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

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <ActionCard
          title="Start Practicing"
          description="Pronunciation, grammar, fluency and more."
          href="/practice"
          icon={<MicIcon />}
          delay="140ms"
        />
        <ActionCard
          title="Start Mock Assessment"
          description="A full proctored practice test."
          href="/mock-tests"
          icon={<ShieldIcon />}
          tone="amber"
          delay="200ms"
        />
        <ActionCard
          title="Continue Practice"
          description={
            focusCategory
              ? `Pick up ${CATEGORY_LABELS[focusCategory]} where you left off.`
              : "Pick up your last exercise where you left off."
          }
          href={focusCategory ? `/practice/${categoryToSlug(focusCategory)}` : "/practice"}
          icon={<ArrowRightIcon />}
          delay="260ms"
        />
      </div>

      <div className="card-elevated animate-fade-up mt-4 p-6" style={{ animationDelay: "320ms" }}>
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
              <li key={a.id} className="group flex items-center justify-between rounded-lg px-2 py-3 text-sm transition hover:bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-1.5 w-1.5 flex-none rounded-full ${
                      a.score === null ? "bg-slate-300" : a.isCorrect ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="font-medium text-ink-900">
                    {getModeBySlug(categoryToSlug(a.category))?.label ?? a.category}
                  </span>
                  <span className="text-slate-500">{a.difficulty}</span>
                </div>
                <span
                  className={
                    a.score === null
                      ? "text-slate-500"
                      : a.isCorrect
                        ? "font-medium text-green-700"
                        : "font-medium text-red-700"
                  }
                >
                  {a.score === null ? "Saved" : a.isCorrect ? "Correct" : "Incorrect"}
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

function ActionCard({
  title,
  description,
  href,
  icon,
  tone = "brand",
  delay,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  tone?: "brand" | "amber";
  delay: string;
}) {
  return (
    <Link
      href={href}
      className="card-elevated animate-fade-up group block p-5"
      style={{ animationDelay: delay }}
    >
      <div className={`icon-badge ${tone === "amber" ? "icon-badge-amber" : ""} h-11 w-11 text-white transition-transform group-hover:scale-105`}>
        {icon}
      </div>
      <h2 className="mt-4 font-display font-bold text-ink-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </Link>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 2a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z" fill="currentColor" fillOpacity={0.95} />
      <path d="M6 11v1a6 6 0 0 0 12 0v-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 19v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 12h16m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Purely decorative, audio-waveform bars behind the hero greeting - ties
// the visual language back to "voice" without competing with the text
// (aria-hidden, absolutely positioned, low opacity).
function WaveformDecoration() {
  const heights = [14, 26, 18, 34, 22, 40, 16, 30, 20, 12];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden items-center gap-1.5 pr-10 opacity-40 sm:flex">
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-white"
          style={{ height: `${h * 2}px` }}
        />
      ))}
    </div>
  );
}
