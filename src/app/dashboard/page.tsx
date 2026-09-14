import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getModeBySlug, PRACTICE_MODES } from "@/lib/practice-taxonomy";

function categoryToSlug(category: string): string {
  return PRACTICE_MODES.find((m) => m.category === category)?.slug ?? "practice";
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const firstName = session?.user.name?.split(" ")[0] ?? "there";
  const userId = session!.user.id;

  const [latestScored, recentAttempts, scoredAttempts, totalAttempts] = await Promise.all([
    db.practiceAttempt.findFirst({
      where: { userId, score: { not: null } },
      orderBy: { createdAt: "desc" },
    }),
    db.practiceAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.practiceAttempt.findMany({
      where: { userId, score: { not: null } },
      select: { category: true, score: true },
    }),
    db.practiceAttempt.count({ where: { userId } }),
  ]);

  // Weakest skill = lowest average score among categories with at least one scored attempt.
  const byCategory = new Map<string, { total: number; count: number }>();
  for (const a of scoredAttempts) {
    const entry = byCategory.get(a.category) ?? { total: 0, count: 0 };
    entry.total += a.score!;
    entry.count += 1;
    byCategory.set(a.category, entry);
  }
  let weakest: { category: string; avg: number } | null = null;
  for (const [category, { total, count }] of byCategory) {
    const avg = total / count;
    if (!weakest || avg < weakest.avg) weakest = { category, avg };
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-ink-950">Welcome back, {firstName}</h1>
      <p className="mt-1 text-sm text-slate-600">
        Here&apos;s where your practice and assessment tools will live.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <ActionCard
          title="Start Practice"
          description="Pronunciation, grammar, fluency and more."
          href="/practice"
        />
        <ActionCard
          title="Start Mock Assessment"
          description="A full proctored practice test."
          href="/mock-tests"
        />
        <ActionCard
          title="Continue Practice"
          description={
            weakest
              ? `Pick up ${getModeBySlug(categoryToSlug(weakest.category))?.label ?? weakest.category} where you left off.`
              : "Pick up your last exercise where you left off."
          }
          href={weakest ? `/practice/${categoryToSlug(weakest.category)}` : "/practice"}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Latest score"
          value={latestScored ? `${latestScored.score}% - ${latestScored.category}` : "No attempts yet"}
        />
        <StatCard
          title="Weakest skill"
          value={
            weakest
              ? `${getModeBySlug(categoryToSlug(weakest.category))?.label ?? weakest.category} (${Math.round(weakest.avg)}% avg)`
              : "Not enough data yet"
          }
        />
        <StatCard
          title="Recommended exercise"
          value={weakest ? getModeBySlug(categoryToSlug(weakest.category))?.label ?? "Practice" : "Complete an attempt to get one"}
          href={weakest ? `/practice/${categoryToSlug(weakest.category)}` : undefined}
        />
        <StatCard title="Progress" value={`${totalAttempts} attempt${totalAttempts === 1 ? "" : "s"} so far`} href="/progress" />
      </div>

      <div className="card mt-4 p-6">
        <h2 className="text-sm font-medium text-slate-500">Recent attempts</h2>
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

      <p className="mt-6 text-xs text-slate-400">
        Mock assessments and AI-scored speaking practice are built in later
        phases of this project - this dashboard reflects real data only.
      </p>
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
  disabled,
}: {
  title: string;
  description: string;
  href: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="card p-5 opacity-60">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink-900">{title}</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            Coming soon
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
    );
  }

  return (
    <Link href={href} className="card group block p-5 transition hover:border-brand-300 hover:shadow-md">
      <h2 className="font-semibold text-ink-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </Link>
  );
}

function StatCard({ title, value, href }: { title: string; value: string; href?: string }) {
  const content = (
    <>
      <h2 className="text-sm font-medium text-slate-500">{title}</h2>
      <p className="mt-1 text-base font-semibold text-ink-900">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card block p-5 transition hover:border-brand-300">
        {content}
      </Link>
    );
  }

  return <div className="card p-5">{content}</div>;
}
