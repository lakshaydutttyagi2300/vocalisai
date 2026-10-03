import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";

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

  const finished = tests.filter((t) => t.status === "SUBMITTED");
  const average = finished.length ? Math.round(finished.reduce((n, t) => n + (t.scorePercent ?? 0), 0) / finished.length) : null;

  return (
    <div className="pb-20">
      <MediaHero
        {...HEROES.testHistory}
        title="Test history"
        cta={{ label: "New test", href: "/explore" }}
        secondary={{ label: "Performance", href: "/performance" }}
        stats={[`${tests.length} test${tests.length === 1 ? "" : "s"}`, `${finished.length} finished`, ...(average === null ? [] : [`${average}% average score`])]}
      />
      <div className="page-container mt-10">
      {tests.length === 0 ? (
        <div className="sheet p-6 text-sm text-slate-600">
          No tests yet.{" "}
          <Link href="/explore" className="font-semibold text-brand-700 hover:underline">
            Choose an exam to start
          </Link>
          .
        </div>
      ) : (
        <ul aria-label="Tests" className="sheet divide-y divide-slate-100 overflow-hidden">
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
    </div>
  );
}
