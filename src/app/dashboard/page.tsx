import { getServerSession } from "next-auth";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BookOpen,
  Briefcase,
  Calculator,
  Headphones,
  Headset,
  Mic,
  PenLine,
  Puzzle,
  Users,
  Bookmark,
  Bot,
  Check,
  ClipboardCheck,
  Clock,
  Compass,
  Flame,
  Gauge,
  History,
  Lock,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getModeBySlug, PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { computeCoachProfile, type CoachProfile } from "@/lib/coach-profile";
import { CATEGORY_LABELS } from "@/lib/scoring-engine";
import { Icon } from "@/components/ui/Icon";
import { listMockExams, listSpeechAnalyses, type SpeechAnalysisRow } from "@/lib/candidate-history";
import { buildTrackPlan, getUserTrack, practiceLinkFor } from "@/lib/goal-tracks";
import { listMockTestOptions } from "@/lib/mock-test-options";
import { visibleSkillWhere } from "@/lib/skills/drills";
import { BAND_LABELS, MIN_ATTEMPTS_FOR_BAND, type Band } from "@/lib/skills/mastery";
import { displayName } from "@/lib/skills/taxonomy";
import { achievements, currentStreak, lastDays, longestStreak, weeklySeries, type DayActivity } from "@/lib/dashboard-stats";
import { MediaHero } from "@/components/ui/MediaHero";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { MasteryBadge } from "@/components/skills/MasteryBadge";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import { LearningResources } from "@/components/dashboard/LearningResources";
import { HEROES } from "@/config/heroMedia";
import { Waveform } from "@/components/cine/Waveform";

export const metadata = { title: "Dashboard - VocalisAi" };

function categoryToSlug(category: string): string {
  return PRACTICE_MODES.find((m) => m.category === category)?.slug ?? "practice";
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Where to work on a skill category: its own practice mode, or a short check that finds the weak parts. */
function improveLink(categoryId: string): { href: string; label: string } {
  const p = practiceLinkFor(categoryId);
  return p.href !== "/practice" ? p : { href: `/skills/diagnostic/${categoryId.toLowerCase()}`, label: "Short skill check" };
}

/** The icon on a practice card's header: what kind of practice it is at a glance. */
function practiceIcon(href: string): LucideIcon {
  if (/speaking|pronunciation|fluency|reading$|#speaking|conversation/.test(href)) return Mic;
  if (/listening/.test(href)) return Headphones;
  if (/interview/.test(href)) return Briefcase;
  if (/customer|supervisor/.test(href)) return Headset;
  if (/numerical|quant|QNT|calc/i.test(href)) return Calculator;
  if (/logical|reasoning|\/rea$/i.test(href)) return Puzzle;
  if (/situational|SJT|judgement/i.test(href)) return Users;
  if (/writing/.test(href)) return PenLine;
  return BookOpen;
}

// Answers per UTC day (all time - one row per active day).
async function dailyActivity(userId: string): Promise<DayActivity[]> {
  const rows = await db.$queryRaw<{ day: string; answers: number; marked: number; correct: number; seconds: number }[]>`
    SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
           count(*)::int AS answers,
           (count(*) FILTER (WHERE "isCorrect" IS NOT NULL))::int AS marked,
           (count(*) FILTER (WHERE "isCorrect"))::int AS correct,
           coalesce(sum("timeTakenSeconds"), 0)::int AS seconds
    FROM "PracticeAttempt"
    WHERE "userId" = ${userId}
    GROUP BY 1
    ORDER BY 1`;
  return rows;
}

// The dashboard answers, in order: what should I do next, how am I doing,
// what should I improve, what's worth doing, and what have I done. Every
// number comes from the candidate's own stored answers, tests and reports.
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const firstName = session?.user.name?.split(" ")[0] ?? "there";
  const userId = session!.user.id;

  // Everything is fetched in one parallel round; the plan and skill areas start as soon as
  // the goal and the visible-skill rule are known, and the standard mock exam list only
  // for candidates without a goal (whose plan would otherwise supply the exams).
  const trackP = getUserTrack(userId);
  const [track, recentAttempts, totalAttempts, coach, exams, analyses, analysedCount, plan, days, categories, mastery, openTest, practiceTestsFinished, mockExamsFinished, standardExams] = await Promise.all([
    trackP,
    db.practiceAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, category: true, difficulty: true, score: true, isCorrect: true },
    }),
    db.practiceAttempt.count({ where: { userId } }),
    computeCoachProfile(userId),
    listMockExams(userId, 5),
    listSpeechAnalyses(userId, 5),
    db.practiceAttempt.count({ where: { userId, analysis: { isNot: null } } }),
    trackP.then((t) => (t ? buildTrackPlan(userId, t) : null)),
    dailyActivity(userId),
    visibleSkillWhere().then((where) => db.skill.findMany({ where: { AND: [where, { depth: 1 }] }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } })),
    db.userSkillMastery.findMany({ where: { userId, skill: { depth: 1 } }, select: { skillId: true, score: true, band: true, attempts: true } }),
    db.practiceTest.findFirst({
      where: { userId, status: "IN_PROGRESS" },
      orderBy: { startedAt: "desc" },
      select: { id: true, exam: { select: { name: true } }, subject: { select: { name: true } }, catalogSkill: { select: { name: true } } },
    }),
    db.practiceTest.count({ where: { userId, status: "SUBMITTED" } }),
    db.mockTestSession.count({ where: { userId, OR: [{ endedAt: { not: null } }, { examSessionState: { status: "COMPLETED" } }] } }),
    trackP.then((t) => (t ? null : listMockTestOptions().catch(() => []))),
  ]);

  // Mock exams to suggest: the goal's own exams, else the standard list.
  const suggestedExams: { name: string; detail: string; meta: string[]; href: string }[] = plan?.exams.length
    ? plan.exams.slice(0, 3).map((e) => ({ name: e.name, detail: e.description, meta: [e.kind === "interview" ? "Live AI interview" : "Proctored"], href: e.href }))
    : (standardExams ?? (await listMockTestOptions().catch(() => [])))
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
        .slice(0, 3)
        .map((o) => ({
          name: o.name,
          detail: o.description ?? o.typeName,
          meta: [...(o.totalMinutes ? [`${o.totalMinutes} min`] : []), `${o.questionCount} questions`, ...(o.levels.length ? [o.levels.join(" to ")] : [])],
          href: `/mock-tests?template=${encodeURIComponent(o.templateId)}`,
        }));

  const streak = currentStreak(days);
  const bestStreak = longestStreak(days);
  const today = lastDays(days, 1);
  const week = lastDays(days, 7);
  const month = lastDays(days, 30);
  const weeks = weeklySeries(days, 8);

  const masteryById = new Map(mastery.map((m) => [m.skillId, { ...m, band: m.band as Band }]));
  const skillRows = categories.map((c) => ({ id: c.id, name: displayName(c), m: masteryById.get(c.id) ?? null }));
  const toImprove = skillRows
    .filter((r) => r.m && (r.m.band === "WEAK" || r.m.band === "DEVELOPING"))
    .sort((a, b) => a.m!.score - b.m!.score)
    .slice(0, 3);
  const anyRated = skillRows.some((r) => r.m && r.m.band !== "UNRATED");

  const focusCategory = coach.weakest[0]?.category ?? null;
  const focusHref = focusCategory ? `/practice/${categoryToSlug(focusCategory)}` : "/practice";
  const next = plan?.nextSteps[0] ?? null;
  const openTestName = openTest ? [openTest.exam?.name, openTest.subject?.name, openTest.catalogSkill?.name].filter(Boolean).join(" · ") || "Your test" : null;
  const continueHref = openTest ? `/practice-tests/${openTest.id}` : (next?.action.href ?? focusHref);

  const badges = achievements({
    totalAnswers: totalAttempts,
    bestStreak,
    practiceTestsFinished,
    mockExamsFinished,
    speechAnalyses: analysedCount,
    hasGoal: !!track,
  });

  return (
    <div className="pb-20">
      {/* 1. Hero */}
      <MediaHero
        {...HEROES.dashboard}
        eyebrow={plan ? `My goal · ${plan.track.name}` : HEROES.dashboard.eyebrow}
        title={`${greeting()}, ${firstName}`}
        subtitle={
          openTestName
            ? `You have a test in progress: ${openTestName}. Pick up where you left off.`
            : next
              ? `Next up: ${next.name}, one of the skills that matters most for your goal.`
              : HEROES.dashboard.subtitle
        }
        cta={{ label: "Continue practice", href: continueHref }}
        secondary={plan ? { label: "Open my plan", href: "/goal" } : { label: "Choose my goal", href: "/goal/choose" }}
        stats={[...(streak > 0 ? [`${streak}-day streak`] : []), `${totalAttempts} answer${totalAttempts === 1 ? "" : "s"} so far`]}
        side={<ReadinessCard plan={plan ? { name: plan.track.name, readiness: plan.readiness, coverage: plan.coverage } : null} />}
      />

      <div className="page-container mt-10 grid grid-cols-1 gap-10">
        {/* 2. Stats */}
        <section aria-label="Your numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <Stat icon={Flame} label="Day streak" value={String(streak)} unit={streak === 1 ? "day" : "days"} note={bestStreak > 0 ? `Best: ${bestStreak} day${bestStreak === 1 ? "" : "s"}` : "Answer a question today to start one"} />
          <Stat icon={Clock} label="This week" value={String(week.answers)} unit={week.answers === 1 ? "answer" : "answers"} note={`${Math.round(week.seconds / 60)} min practised`} />
          <Stat
            icon={Target}
            label="Accuracy, last 30 days"
            value={month.accuracy === null ? "—" : String(month.accuracy)}
            unit={month.accuracy === null ? "" : "%"}
            note={month.marked ? `Over ${month.marked} marked answer${month.marked === 1 ? "" : "s"}` : "Shows once you answer marked questions"}
          />
          <Stat
            icon={ClipboardCheck}
            label="Mock exams finished"
            value={String(mockExamsFinished)}
            unit=""
            note={coach.averageOverallScore !== null ? `Average score ${coach.averageOverallScore}/100` : "Timed and proctored"}
          />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* 3. Today's plan */}
          <section aria-labelledby="today-heading" className="card p-6 sm:p-7 lg:col-span-5">
            <SectionHead id="today-heading" title="Today's plan" />
            <p className="mt-1 text-sm text-fg-muted">
              Today so far: <span className="num font-semibold text-fg">{today.answers}</span> answer{today.answers === 1 ? "" : "s"}
              {today.seconds >= 60 && <>, {Math.round(today.seconds / 60)} min</>}
            </p>
            <ol className="mt-5 grid grid-cols-1 gap-3">
              {(plan
                ? plan.nextSteps.slice(0, 3).map((s) => ({
                    key: s.id,
                    title: s.name,
                    detail: s.mastery && s.mastery.band !== "UNRATED" ? `${BAND_LABELS[s.mastery.band]} · ${Math.round(s.mastery.score)}/100` : "Not tried yet",
                    href: s.action.href,
                    label: s.action.label,
                  }))
                : [
                    { key: "goal", title: "Choose your goal", detail: "Get a plan built around the test or job you're preparing for", href: "/goal/choose", label: "Choose" },
                    {
                      key: "focus",
                      title: focusCategory ? `Practise ${CATEGORY_LABELS[focusCategory]}` : "Answer 10 practice questions",
                      detail: focusCategory ? "Your lowest area in mock exams" : "Any skill, at the level that suits you",
                      href: focusHref,
                      label: "Practise",
                    },
                    { key: "speak", title: "Record one speaking answer", detail: "Get pace, filler words and pronunciation feedback", href: "/practice/speaking", label: "Record" },
                  ]
              ).map((item, n) => (
                <li key={item.key} className="flex min-w-0 items-center gap-4 rounded-xl border border-line bg-surface p-4">
                  <span className="num flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-strong">{n + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-fg">{item.title}</span>
                    <span className="block text-sm text-fg-muted">{item.detail}</span>
                  </span>
                  <Link href={item.href} className="btn-secondary btn-sm flex-none">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ol>
            {plan && plan.nextSteps.length === 0 && <p className="mt-4 text-sm text-fg-muted">Every skill for your goal is mastered. Take a full mock exam to confirm it.</p>}
          </section>

          {/* 4. Skill breakdown + what to improve */}
          <section aria-labelledby="skills-heading" className="card p-6 sm:p-7 lg:col-span-7">
            <SectionHead id="skills-heading" title="Skill breakdown" href="/skills" link="My skills" />
            {skillRows.length === 0 ? (
              <p className="mt-4 text-sm text-fg-muted">Skill ratings will appear here once skill areas are switched on.</p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <ul className="grid gap-4" aria-label="Rating by skill area">
                  {skillRows.map((r) => {
                    const rated = r.m && r.m.band !== "UNRATED";
                    return (
                      <li key={r.id}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate font-medium text-fg">{r.name}</span>
                          {rated ? (
                            <span className="num flex-none text-fg-muted">{Math.round(r.m!.score)}</span>
                          ) : (
                            <span className="flex-none text-xs text-fg-subtle">
                              {Math.min(r.m?.attempts ?? 0, MIN_ATTEMPTS_FOR_BAND)}/{MIN_ATTEMPTS_FOR_BAND} answers to rate
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                          {rated && <div className={`h-full rounded-full ${r.m!.band === "WEAK" ? "bg-warning" : r.m!.band === "MASTERED" ? "bg-success" : "bg-accent"}`} style={{ width: `${Math.max(3, Math.min(100, r.m!.score))}%` }} />}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="rounded-xl bg-surface-muted p-5">
                  <h3 className="text-sm font-semibold text-fg">What to improve</h3>
                  {toImprove.length > 0 ? (
                    <ul className="mt-3 grid gap-3">
                      {toImprove.map((r) => {
                        const link = improveLink(r.id);
                        return (
                          <li key={r.id}>
                            <Link href={link.href} className="group block rounded-lg border border-line bg-surface p-3 transition-colors hover:border-accent-line">
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-semibold text-fg">{r.name}</span>
                                <MasteryBadge band={r.m!.band} score={r.m!.score} />
                              </span>
                              <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-accent-strong">
                                {link.label}
                                <Icon as={ArrowRight} size="xs" className="transition-transform group-hover:translate-x-0.5" />
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <>
                      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                        {anyRated
                          ? "Nothing is rated weak right now. Keep practising to hold your level, or try a harder level."
                          : `Answer ${MIN_ATTEMPTS_FOR_BAND} questions in an area to get its first rating. Your weakest areas then show here, with a link to work on each.`}
                      </p>
                      <Link href="/skills" className="btn-secondary btn-sm mt-4">
                        {anyRated ? "See all my skills" : "Take a short skill check"}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* 5. Progress chart */}
          <section aria-labelledby="progress-heading" className="card p-6 sm:p-7 lg:col-span-8">
            <SectionHead id="progress-heading" title="Your last 8 weeks" href="/progress" link="Progress" />
            {weeks.some((w) => w.answers > 0) ? (
              <div className="mt-5">
                <WeeklyChart weeks={weeks} />
              </div>
            ) : (
              <EmptyState icon={Gauge} text="Your weekly answers and accuracy draw here as you practise. Answer a few questions to start the chart." href="/practice" label="Start practising" />
            )}
          </section>

          {/* 9. AI coach tip (beside the chart on wide screens) */}
          <CoachTip coach={coach} analyses={analyses} weakest={toImprove[0] ?? null} />
        </div>

        {/* 6. Recommended practice */}
        <section aria-labelledby="recommended-heading">
          <SectionHead id="recommended-heading" title="Recommended practice" href="/practice" link="Practice library" />
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommendations(toImprove, coach).map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="card lift group flex h-full flex-col overflow-hidden">
                  <span aria-hidden="true" className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-[radial-gradient(18rem_10rem_at_80%_0%,var(--accent-soft),transparent_70%),var(--surface-muted)]">
                    <Waveform bars={22} className="absolute inset-x-6 bottom-4 h-8 opacity-30" />
                    <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-accent-strong shadow-[var(--shadow-md)] transition-transform duration-500 group-hover:scale-105">
                      <Icon as={practiceIcon(r.href)} size="xl" />
                    </span>
                  </span>
                  <span className="flex flex-1 flex-col p-5">
                    <span className="badge badge-skill self-start">{r.reason}</span>
                    <span className="mt-3 block font-semibold text-fg">{r.title}</span>
                    <span className="mt-auto flex items-center gap-1 pt-3 text-sm font-semibold text-accent-strong">
                      Start
                      <Icon as={ArrowRight} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* 7. Quick access */}
        <nav aria-label="Quick access" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile href="/practice" icon={BookOpen} title="Practice library" />
          <Tile href="/explore" icon={Compass} title="Explore exams" />
          <Tile href="/mock-tests" icon={ClipboardCheck} title="Mock exams" />
          <Tile href="/speech-analysis" icon={AudioLines} title="Speech analysis" />
          <Tile href="/coach" icon={Bot} title="AI coach" />
          <Tile href="/skills" icon={Target} title="My skills" />
          <Tile href="/bookmarks" icon={Bookmark} title="Bookmarks" />
          <Tile href="/practice-tests" icon={History} title="Test history" />
        </nav>

        {/* 8. Suggested mock exams */}
        <section aria-labelledby="mock-heading">
          <SectionHead id="mock-heading" title={plan?.exams.length ? "Mock exams for your goal" : "Suggested mock exams"} href="/mock-tests" link="All mock exams" />
          {suggestedExams.length === 0 ? (
            <div className="card mt-4">
              <EmptyState icon={ClipboardCheck} text="No mock exams are available right now. Practice tests by company and skill are in Explore." href="/explore" label="Explore exams" />
            </div>
          ) : (
            <ul className={`mt-4 grid grid-cols-1 gap-4 ${suggestedExams.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
              {suggestedExams.map((e) => (
                <li key={e.href}>
                  <Link href={e.href} className="card lift group flex h-full flex-col p-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                      <Icon as={ClipboardCheck} size="md" />
                    </span>
                    <span className="mt-4 block font-semibold text-fg">{e.name}</span>
                    <span className="mt-1 line-clamp-2 text-sm text-fg-muted">{e.detail}</span>
                    <span className="mt-4 flex flex-wrap gap-1.5">
                      {e.meta.map((m) => (
                        <span key={m} className="badge badge-neutral">
                          {m}
                        </span>
                      ))}
                    </span>
                    <span className="mt-auto flex items-center gap-1 pt-5 text-sm font-semibold text-accent-strong">
                      Get ready
                      <Icon as={ArrowRight} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 10. Recent activity */}
        <section aria-labelledby="recent-heading">
          <SectionHead id="recent-heading" title="Recent activity" />
          <div className="card mt-4 grid lg:grid-cols-3">
            <ActivityColumn title="Mock exams" href="/mock-tests/history" linkLabel="All results" empty="No mock exams yet.">
              {exams.slice(0, 4).map((e) => (
                <li key={e.sessionId}>
                  <Link href={e.href} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-accent-strong">
                    <span className="min-w-0 truncate font-medium text-fg">{e.name}</span>
                    <span className="num flex-none text-xs text-fg-muted">
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
                  <Link href={`/practice/results/${a.attemptId}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-accent-strong">
                    <span className="min-w-0 truncate font-medium text-fg">{a.modeLabel}</span>
                    <span className="num flex-none text-xs text-fg-muted">
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
                    <span className="font-medium text-fg">{getModeBySlug(categoryToSlug(a.category))?.label ?? a.category}</span>
                    <span className="ml-2 text-xs text-fg-muted">{a.difficulty.charAt(0) + a.difficulty.slice(1).toLowerCase()}</span>
                  </span>
                  {/* Voice/open answers have a 0-100 score but no right/wrong (isCorrect null): show the score, never "Incorrect". */}
                  <span
                    className={`flex-none text-xs font-semibold ${
                      a.score === null ? "text-fg-muted" : a.isCorrect === null ? "text-fg" : a.isCorrect ? "text-success-strong" : "text-warning-strong"
                    }`}
                  >
                    {a.score === null ? "Saved" : a.isCorrect === null ? `Score ${a.score}` : a.isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </li>
              ))}
            </ActivityColumn>
          </div>
        </section>

        {/* 11. Achievements */}
        <section aria-labelledby="achievements-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="achievements-heading" className="headline text-xl text-fg">
              Achievements
            </h2>
            <p className="text-sm text-fg-muted">
              <span className="num font-semibold text-fg">{badges.filter((b) => b.earned).length}</span> of {badges.length} earned
            </p>
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((b) => (
              <li key={b.id} data-earned={b.earned} className={`flex items-start gap-3 rounded-xl border p-4 ${b.earned ? "border-accent-line bg-accent-softer" : "border-line bg-surface"}`}>
                <span
                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${b.earned ? "bg-accent text-on-ink" : "bg-surface-muted text-fg-subtle"}`}
                  aria-hidden="true"
                >
                  <Icon as={b.earned ? Check : Lock} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${b.earned ? "text-fg" : "text-fg-muted"}`}>
                    {b.title}
                    <span className="sr-only">{b.earned ? " (earned)" : " (not earned yet)"}</span>
                  </span>
                  <span className="block text-xs text-fg-muted">{b.detail}</span>
                  {b.progress && (
                    <span className="mt-2 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round((b.progress.value / b.progress.target) * 100)}%` }} />
                      </span>
                      <span className="num text-xs text-fg-subtle">
                        {b.progress.value}/{b.progress.target}
                      </span>
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* 12. Learning resources (each opens a short guide) */}
        <section aria-labelledby="resources-heading">
          <SectionHead id="resources-heading" title="Learning resources" />
          <div className="mt-4">
            <LearningResources />
          </div>
        </section>
      </div>
    </div>
  );
}

/** Up to four things worth practising: weak skills first, then mock-exam weak spots, then good starting points. */
function recommendations(toImprove: { id: string; name: string }[], coach: CoachProfile): { href: string; title: string; reason: string }[] {
  const list: { href: string; title: string; reason: string }[] = [
    ...toImprove.map((r) => ({ href: improveLink(r.id).href, title: r.name, reason: "Your lowest-rated skill" })),
    ...coach.weakest.map((w) => ({ href: `/practice/${categoryToSlug(w.category)}`, title: CATEGORY_LABELS[w.category], reason: "Low in your mock exams" })),
    ...["speaking", "grammar", "numerical-aptitude", "interview", "logical-reasoning"].map((slug) => ({
      href: `/practice/${slug}`,
      title: getModeBySlug(slug)?.label ?? slug,
      reason: "A good place to start",
    })),
  ];
  const seen = new Set<string>();
  return list.filter((r) => !seen.has(r.href) && seen.add(r.href)).slice(0, 4);
}

function ReadinessCard({ plan }: { plan: { name: string; readiness: number | null; coverage: number } | null }) {
  return (
    <div className="glass flex items-center gap-5 rounded-2xl p-5">
      <ScoreRing value={plan?.readiness ?? null} label="Readiness" size={104} />
      <div className="min-w-0 text-sm">
        {plan ? (
          <>
            <p className="font-semibold text-fg">{plan.name}</p>
            <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(plan.coverage * 100)}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-fg-muted">{Math.round(plan.coverage * 100)}% of your goal&apos;s skills rated</p>
          </>
        ) : (
          <>
            <p className="font-semibold text-fg">No goal yet</p>
            <p className="mt-1 text-xs text-fg-muted">Choose a goal to see how ready you are for it.</p>
          </>
        )}
      </div>
    </div>
  );
}

function CoachTip({ coach, analyses, weakest }: { coach: CoachProfile; analyses: SpeechAnalysisRow[]; weakest: { id: string; name: string; m: { score: number } | null } | null }) {
  let tip: string;
  let action: { href: string; label: string };
  const recent = analyses.slice(0, 5);
  const wpm = recent.length ? Math.round(recent.reduce((s, a) => s + a.wpm, 0) / recent.length) : null;
  const fillers = recent.length ? recent.reduce((s, a) => s + a.fillerCount, 0) / recent.length : null;
  const n = recent.length;

  if (wpm !== null && wpm > 160) {
    tip = `Your last ${n === 1 ? "recording was" : `${n} recordings averaged`} ${wpm} words a minute. Slowing to 110-160 makes you easier to follow, especially on a call.`;
    action = { href: "/practice/speaking", label: "Practise your pace" };
  } else if (wpm !== null && wpm < 110) {
    tip = `Your last ${n === 1 ? "recording was" : `${n} recordings averaged`} ${wpm} words a minute, a little slow. Plan your first sentence, then keep going: aim for 110-160.`;
    action = { href: "/practice/fluency", label: "Practise fluency" };
  } else if (fillers !== null && fillers >= 3) {
    tip = `You used about ${Math.round(fillers)} filler words per answer in your last ${n === 1 ? "recording" : `${n} recordings`}. A short, silent pause sounds calmer than "um".`;
    action = { href: "/practice/speaking", label: "Record another answer" };
  } else if (weakest?.m) {
    tip = `${weakest.name} is your lowest-rated skill at ${Math.round(weakest.m.score)}/100. A few short drills there each day is the quickest way to move it up.`;
    action = improveLink(weakest.id);
  } else if (coach.weakest[0]) {
    const w = coach.weakest[0];
    tip = `${CATEGORY_LABELS[w.category]} was your lowest mock exam area, averaging ${w.average}/100. Practise it before your next mock exam.`;
    action = { href: `/practice/${categoryToSlug(w.category)}`, label: `Practise ${CATEGORY_LABELS[w.category]}` };
  } else {
    tip = "Start with a short skill check in the area you feel least sure about. It shows exactly which parts to work on.";
    action = { href: "/skills", label: "Take a skill check" };
  }

  return (
    <section aria-labelledby="coach-heading" className="panel-ink flex flex-col rounded-xl p-6 sm:p-7 lg:col-span-4">
      <p className="eyebrow">
        <Icon as={Sparkles} size="xs" className="mr-1 inline" />
        AI coach tip
      </p>
      <h2 id="coach-heading" className="sr-only">
        AI coach tip
      </h2>
      <p className="mt-4 text-base leading-relaxed text-fg">{tip}</p>
      <p className="mt-2 text-xs text-fg-muted">Based on your own results.</p>
      <div className="mt-auto flex flex-wrap gap-3 pt-6">
        <Link href={action.href} className="btn-primary btn-sm">
          {action.label}
        </Link>
        <Link href="/coach" className="btn-secondary btn-sm">
          Ask the coach
        </Link>
      </div>
    </section>
  );
}

function SectionHead({ id, title, href, link }: { id: string; title: string; href?: string; link?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h2 id={id} className="headline text-xl text-fg">
        {title}
      </h2>
      {href && link && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-accent-strong hover:underline">
          {link}
          <Icon as={ArrowRight} size="xs" />
        </Link>
      )}
    </div>
  );
}

function Stat({ icon, label, value, unit, note }: { icon: LucideIcon; label: string; value: string; unit: string; note: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-fg-muted">{label}</p>
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent-soft text-accent-strong">
          <Icon as={icon} />
        </span>
      </div>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="num text-3xl font-semibold text-fg">{value}</span>
        {unit && <span className="text-sm text-fg-muted">{unit}</span>}
      </p>
      <p className="mt-1 truncate text-xs text-fg-subtle">{note}</p>
    </div>
  );
}

function Tile({ href, icon, title }: { href: string; icon: LucideIcon; title: string }) {
  return (
    <Link href={href} className="card lift group flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
        <Icon as={icon} size="md" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{title}</span>
      <Icon as={ArrowUpRight} className="flex-none text-fg-subtle transition-colors group-hover:text-accent-strong" />
    </Link>
  );
}

function EmptyState({ icon, text, href, label }: { icon: LucideIcon; text: string; href: string; label: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
        <Icon as={icon} size="lg" />
      </span>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-fg-muted">{text}</p>
      <Link href={href} className="btn-secondary btn-sm mt-4">
        {label}
      </Link>
    </div>
  );
}

function ActivityColumn({ title, href, linkLabel, empty, children }: { title: string; href: string; linkLabel: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div className="min-w-0 border-line p-6 [&:not(:first-child)]:border-t lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:border-t-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <Link href={href} className="text-xs font-semibold text-accent-strong hover:underline">
          {linkLabel} &rarr;
        </Link>
      </div>
      {children.length === 0 ? <p className="mt-4 text-sm text-fg-muted">{empty}</p> : <ul className="mt-2 divide-y divide-line">{children}</ul>}
    </div>
  );
}
