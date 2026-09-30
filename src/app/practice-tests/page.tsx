import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Test history - VocalisAi" };

const MODE_LABELS: Record<string, string> = { PRACTICE: "Practice", WEAK_AREAS: "Weak areas", REVISION: "Revision", BOOKMARKS: "Bookmarks", FULL_MOCK: "Full mock" };
const LEVEL_LABELS: Record<string, string> = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced", EXPERT: "Expert" };

// Every catalogue test the candidate has started, newest first.
export default async function PracticeTestHistoryPage() {
  const session = await getServerSession(authOptions);
  const tests = await db.practiceTest.findMany({
    where: { userId: session!.user.id },
    orderBy: { startedAt: "desc" },
    take: 100,
    select: {
      id: true,
      mode: true,
      timed: true,
      difficulty: true,
      status: true,
      startedAt: true,
      totalCount: true,
      answeredCount: true,
      correctCount: true,
      scorePercent: true,
      totalTimeSeconds: true,
      exam: { select: { name: true } },
      subject: { select: { name: true } },
      catalogSkill: { select: { name: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:px-6 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your tests</p>
          <h1 className="headline mt-3 text-3xl text-ink-950 sm:text-4xl">Test history</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/performance" className="btn-secondary btn-sm">
            Performance
          </Link>
          <Link href="/explore" className="btn-primary btn-sm">
            New test
            <Icon as={ArrowRight} />
          </Link>
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="sheet mt-8 p-6 text-sm text-slate-600">
          No tests yet.{" "}
          <Link href="/explore" className="font-semibold text-brand-700 hover:underline">
            Choose an exam to start
          </Link>
          .
        </div>
      ) : (
        <ul aria-label="Tests" className="sheet mt-8 divide-y divide-slate-100 overflow-hidden">
          {tests.map((t) => {
            const done = t.status === "SUBMITTED";
            const accuracy = done && t.answeredCount ? Math.round(((t.correctCount ?? 0) / t.answeredCount) * 100) : null;
            return (
              <li key={t.id}>
                <Link href={`/practice-tests/${t.id}`} className="group flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 hover:bg-slate-50">
                  <span className="min-w-0 flex-1 basis-64">
                    <span className="block truncate font-semibold text-ink-950 group-hover:text-brand-700">
                      {[t.exam?.name, t.subject?.name, t.catalogSkill?.name].filter(Boolean).join(" · ") || MODE_LABELS[t.mode]}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {t.startedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {t.mode === "BOOKMARKS" ? "Mixed levels" : (LEVEL_LABELS[t.difficulty] ?? t.difficulty)} · {MODE_LABELS[t.mode]}
                      {t.timed ? " · Timed" : ""}
                    </span>
                  </span>
                  {done ? (
                    <span className="num flex gap-5 text-sm text-slate-600">
                      <span>
                        <span className="font-semibold text-ink-950">{t.scorePercent}%</span> score
                      </span>
                      <span>
                        {t.correctCount}/{t.totalCount}
                      </span>
                      <span>{accuracy ?? 0}% acc.</span>
                      <span>{Math.round((t.totalTimeSeconds ?? 0) / 60)} min</span>
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">In progress · continue</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
