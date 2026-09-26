import { getServerSession } from "next-auth";
import { Mic } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { countUnanalysedRecordings, listSpeechAnalyses, type SpeechAnalysisRow } from "@/lib/candidate-history";
import type { Rating } from "@/lib/providers/gemini-analysis-provider";

export const metadata = { title: "Speech Analysis - VocalisAi" };

const RATING: Record<Rating, { label: string; cls: string }> = {
  strong: { label: "Strong", cls: "bg-emerald-50 text-emerald-700" },
  adequate: { label: "Adequate", cls: "bg-amber-50 text-amber-700" },
  weak: { label: "Needs work", cls: "bg-red-50 text-red-700" },
};

function RatingPill({ label, rating }: { label: string; rating: Rating | null }) {
  if (!rating) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RATING[rating].cls}`}>
      {label}: {RATING[rating].label}
    </span>
  );
}

function average(nums: number[]): number | null {
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
}

export default async function SpeechAnalysisPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const [rows, unanalysed] = await Promise.all([listSpeechAnalyses(userId), countUnanalysedRecordings(userId)]);

  const recent = rows.slice(0, 10);
  const avgWpm = average(recent.map((r) => r.wpm));
  const avgFillers = average(recent.map((r) => r.fillerCount));
  const strongPron = recent.filter((r) => r.ratings.pronunciation === "strong").length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Speech Analysis</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Every recording you&apos;ve had analysed - pronunciation, fluency, grammar, pace and filler words - in one place. Open any one for
            the full breakdown and an improved model answer.
          </p>
        </div>
        <Link href="/practice#speaking" className="btn-primary">
          <Icon as={Mic} />
          Record a new answer
        </Link>
      </div>

      {rows.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Average speaking pace" value={avgWpm === null ? "-" : `${avgWpm} wpm`} hint="Across your last 10 analyses. Around 120-160 wpm is comfortable to follow." />
          <Stat label="Average filler words" value={avgFillers === null ? "-" : `${avgFillers} per answer`} hint={'"um", "uh", "like", "you know" and similar.'} />
          <Stat label="Strong pronunciation" value={`${strongPron} of ${recent.length}`} hint="Recent answers rated strong for pronunciation." />
        </div>
      )}

      {unanalysed > 0 && (
        <p className="mt-4 rounded-md bg-brand-50 px-4 py-3 text-sm text-brand-800">
          You have {unanalysed} recording{unanalysed === 1 ? "" : "s"} that {unanalysed === 1 ? "hasn't" : "haven't"} been analysed yet. Open it from
          your practice results to run the analysis.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center p-10 text-center">
          <p className="font-display text-lg font-bold text-ink-900">No speech analyses yet</p>
          <p className="mt-1 max-w-md text-sm text-slate-600">
            Record an answer in any speaking practice mode (Read Aloud, Fluency, Speaking, Pronunciation) and your analysis will appear here.
          </p>
          <Link href="/practice#speaking" className="btn-primary mt-5">
          <Icon as={Mic} />
            Go to speaking practice
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3" aria-label="Speech analyses">
          {rows.map((r) => (
            <AnalysisCard key={r.attemptId} row={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-ink-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function AnalysisCard({ row }: { row: SpeechAnalysisRow }) {
  return (
    <li>
      <Link href={`/practice/results/${row.attemptId}`} className="card block p-5 transition hover:border-brand-300 hover:shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-ink-900">
              {row.modeLabel} <span className="font-normal text-slate-500">· {row.difficulty.toLowerCase()}</span>
              {row.fromMockTest && <span className="badge badge-skill ml-2">Mock exam</span>}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {row.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {row.durationSeconds}s ·{" "}
              {row.wpm} wpm ({row.pace.toLowerCase().replace(/_/g, " ")}) · {row.fillerCount} filler{row.fillerCount === 1 ? "" : "s"}
            </p>
          </div>
          {row.score !== null && <span className="font-display text-xl font-bold text-ink-950">{row.score}</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <RatingPill label="Pronunciation" rating={row.ratings.pronunciation} />
          <RatingPill label="Fluency" rating={row.ratings.fluency} />
          <RatingPill label="Grammar" rating={row.ratings.grammar} />
        </div>
      </Link>
    </li>
  );
}
