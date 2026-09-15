import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getProgressData, type OverallTrendPoint } from "@/lib/progress";
import { SCORE_CATEGORIES, CATEGORY_LABELS } from "@/lib/scoring-engine";

function TrendChart({ points }: { points: OverallTrendPoint[] }) {
  const scored = points.filter((p) => p.overallScore !== null) as { sessionId: string; date: string; overallScore: number }[];
  if (scored.length < 2) {
    return (
      <p className="text-sm text-slate-500">
        Complete at least 2 mock tests to see a trend line here. ({scored.length} so far.)
      </p>
    );
  }

  const width = 600;
  const height = 160;
  const padding = 10;
  const stepX = (width - padding * 2) / (scored.length - 1);
  const toY = (score: number) => padding + (100 - score) * ((height - padding * 2) / 100);

  const pathD = scored.map((p, i) => `${i === 0 ? "M" : "L"} ${padding + i * stepX} ${toY(p.overallScore)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <line x1={padding} y1={toY(0)} x2={width - padding} y2={toY(0)} stroke="#e2ded3" strokeWidth={1} />
      <line x1={padding} y1={toY(100)} x2={width - padding} y2={toY(100)} stroke="#e2ded3" strokeWidth={1} />
      <path d={pathD} fill="none" stroke="#106e64" strokeWidth={2} />
      {scored.map((p, i) => (
        <circle key={p.sessionId} cx={padding + i * stepX} cy={toY(p.overallScore)} r={3} fill="#106e64" />
      ))}
    </svg>
  );
}

export default async function ProgressPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const data = await getProgressData(userId);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-ink-950">Progress</h1>
      <p className="mt-1 text-sm text-slate-600">
        Your real history across mock tests and practice - nothing here is estimated or inferred.
      </p>

      <div className="card mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink-900">Overall score over time</h2>
          <span className="text-sm text-slate-500">
            {data.mockSessionsCompleted} mock test{data.mockSessionsCompleted === 1 ? "" : "s"} completed
          </span>
        </div>
        <div className="mt-4">
          <TrendChart points={data.overallTrend} />
        </div>
        {data.overallTrend.length === 0 && (
          <p className="mt-2 text-sm text-slate-500">
            No completed mock tests yet.{" "}
            <Link href="/mock-tests" className="text-brand-600 hover:underline">
              Start one
            </Link>{" "}
            to begin tracking your score.
          </p>
        )}
      </div>

      <div className="card mt-4 p-6">
        <h2 className="font-semibold text-ink-900">Category breakdown</h2>
        <p className="mt-1 text-xs text-slate-500">
          Average and most recent score across all completed mock tests, per category.
        </p>
        {data.mockSessionsCompleted === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No completed mock tests yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SCORE_CATEGORIES.map((cat) => {
              const c = data.categories[cat];
              if (c.sessionsWithData === 0) return null;
              return (
                <div key={cat} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink-900">{CATEGORY_LABELS[cat]}</span>
                    <span className="flex items-center gap-1 text-sm">
                      <span className="font-semibold text-ink-900">{c.average}</span>
                      {c.trend === "up" && <span className="text-green-600">&uarr;</span>}
                      {c.trend === "down" && <span className="text-red-600">&darr;</span>}
                      {c.trend === "flat" && <span className="text-slate-400">&rarr;</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-brand-500" style={{ width: `${c.average}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Latest: {c.latest} - across {c.sessionsWithData} session{c.sessionsWithData === 1 ? "" : "s"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card mt-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink-900">Practice activity</h2>
          <span className="text-sm text-slate-500">
            {data.totalPracticeAttempts} attempt{data.totalPracticeAttempts === 1 ? "" : "s"} total
          </span>
        </div>
        {data.practiceByCategory.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No practice attempts yet.{" "}
            <Link href="/practice" className="text-brand-600 hover:underline">
              Start practicing
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {data.practiceByCategory.map((c) => (
              <li key={c.category} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium text-ink-900">{c.label}</span>
                <span className="text-slate-600">
                  {c.attemptCount} attempt{c.attemptCount === 1 ? "" : "s"}
                  {c.correctRate !== null && ` - ${c.correctRate}% correct`}
                  {c.voiceAnalyzedCount !== null && ` - ${c.voiceAnalyzedCount} analyzed`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {data.mockSessionsCompleted > 0 && (data.weakest.length > 0 || data.strongest.length > 0) && (
        <p className="mt-4 text-xs text-slate-400">
          Want tailored advice on these numbers?{" "}
          <Link href="/coach" className="text-brand-600 hover:underline">
            Ask your Personal AI Coach
          </Link>
          .
        </p>
      )}
    </div>
  );
}
