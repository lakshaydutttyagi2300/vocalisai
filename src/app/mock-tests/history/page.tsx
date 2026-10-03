import { getServerSession } from "next-auth";
import { Play } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { listMockExams, type MockExamRow } from "@/lib/candidate-history";
import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";

export const metadata = { title: "My mock exam results - VocalisAi" };

const STATUS: Record<MockExamRow["status"], { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700" },
  in_progress: { label: "In progress", cls: "bg-amber-50 text-amber-700" },
  ended: { label: "Ended early", cls: "bg-slate-100 text-slate-600" },
};

function Result({ row }: { row: MockExamRow }) {
  if (row.kind === "exam") {
    if (row.marked === null || row.marked === 0) return <span className="text-sm text-slate-500">-</span>;
    return (
      <span className="text-sm font-semibold text-ink-900">
        {row.correct} / {row.marked} correct
      </span>
    );
  }
  return row.overallScore === null ? (
    <span className="text-sm text-slate-500">Not scored yet</span>
  ) : (
    <span className="text-sm font-semibold text-ink-900">{row.overallScore} / 100</span>
  );
}

export default async function MockExamHistoryPage() {
  const session = await getServerSession(authOptions);
  const rows = await listMockExams(session!.user.id);

  return (
    <div className="pb-20">
      <MediaHero {...HEROES.mockHistory} title="My mock exam results" subtitle="Every mock assessment and exam-style practice test you've started, newest first." cta={{ label: "Take a mock exam", href: "/mock-tests" }} stats={[`${rows.length} started`]} />
    <div className="page-container mt-10 max-w-5xl">
      {rows.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center p-10 text-center">
          <p className="font-display text-lg font-bold text-ink-900">No mock exams yet</p>
          <p className="mt-1 max-w-md text-sm text-slate-600">
            Take a timed, proctored mock exam to see your results and track them over time here.
          </p>
          <Link href="/mock-tests" className="btn-primary mt-5">
          <Icon as={Play} />
            Start your first mock exam
          </Link>
        </div>
      ) : (
        <ul className="card mt-8 divide-y divide-slate-100" aria-label="Mock exam results">
          {rows.map((r) => (
            <li key={r.sessionId}>
              <Link href={r.href} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">{r.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {r.kind === "exam" ? "Exam-style practice test" : "Standard assessment"} ·{" "}
                    {r.startedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Result row={r} />
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                  <span aria-hidden="true" className="text-slate-400">
                    &rarr;
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
    </div>
  );
}
