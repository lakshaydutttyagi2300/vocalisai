"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ListChecks, RotateCcw } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { ScoreRing } from "@/components/ui/ScoreRing";
import type { SupportResult } from "@/lib/support-assessment/scoring";
import { verdict } from "@/lib/support-assessment/scoring";

// The Customer Support Assessment's result, kept brief on purpose: the score
// out of 100, its six parts, strengths, weaknesses and three things to
// practise. Marking (speech-to-text + one AI rating call) runs the first
// time this page opens; later visits show the stored result.
export function SupportAssessmentResults({ sessionId, initial, freePlan = false }: { sessionId: string; initial: SupportResult | null; freePlan?: boolean }) {
  const [result, setResult] = useState<SupportResult | null>(initial);
  const [error, setError] = useState<string | null>(null);

  const mark = useCallback(async () => {
    setError(null);
    for (let i = 0; i < 40; i++) {
      const res = await fetch(`/api/exam-sessions/${sessionId}/mark`, { method: "POST" }).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (res?.ok && data?.status === "done") {
        setResult(data.result);
        return;
      }
      if (!res?.ok || data?.status !== "marking") {
        setError(data?.error ?? "We couldn't mark your answers. Please try again in a minute.");
        return;
      }
      await new Promise((r) => setTimeout(r, 4000)); // another tab is marking it
    }
    setError("Marking is taking longer than usual. Please refresh this page in a minute.");
  }, [sessionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts marking once on first view; state updates arrive after the request
    if (!initial) void mark();
  }, [initial, mark]);

  if (!result) {
    return (
      <div className="card mt-8 p-6 text-center">
        {error ? (
          <>
            <p role="alert" className="text-sm text-danger-strong">{error}</p>
            <button onClick={() => void mark()} className="btn-primary mt-4">
              <Icon as={RotateCcw} />
              Try again
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-4 font-semibold text-ink-900">Marking your answers...</p>
            <p className="mt-1 text-sm text-slate-600">Listening to your spoken answers takes up to a minute.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="card flex flex-col items-center gap-5 p-6 sm:flex-row">
        <ScoreRing value={result.overall} label="out of 100" />
        <div className="min-w-0 text-center sm:text-left">
          <p className="font-display text-lg font-bold text-ink-900">{result.overall === null ? "Score pending" : verdict(result.overall)}</p>
          <p className="mt-1 text-sm text-slate-600">
            We score how clearly you are understood, not your accent. A clear Indian accent is never marked down.
          </p>
        </div>
      </section>

      <section className="card p-6" aria-labelledby="parts-title">
        <h2 id="parts-title" className="font-display font-bold text-ink-900">Your score by skill</h2>
        <ul className="mt-4 space-y-3">
          {result.components.map((c) => (
            <li key={c.key}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-ink-900">{c.label}</span>
                <span className="num font-semibold text-ink-900">
                  {c.pending ? "-" : c.points} / {c.max}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(c.points / c.max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-display font-bold text-ink-900">Strengths</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {result.strengths.length ? result.strengths.map((s) => <li key={s}>{s}</li>) : <li>No clear strength yet. Your priority areas below are the quickest wins.</li>}
          </ul>
        </section>
        <section className="card p-6">
          <h2 className="font-display font-bold text-ink-900">Weaknesses</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {result.weaknesses.length ? result.weaknesses.map((s) => <li key={s}>{s}</li>) : <li>No major weakness. Keep practising at the hardest level.</li>}
          </ul>
        </section>
      </div>

      {result.priorities.length > 0 && (
        <section className="card p-6" aria-labelledby="priorities-title">
          <h2 id="priorities-title" className="font-display font-bold text-ink-900">Practise these first</h2>
          <ol className="mt-4 space-y-4">
            {result.priorities.map((p, i) => (
              <li key={p.label} className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-900">
                    {i + 1}. {p.label}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">{p.tip}</p>
                </div>
                <Link href={p.href} className="btn-secondary btn-sm">
                  Practise
                  <Icon as={ArrowRight} />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {freePlan && (
        <section className="card border-accent p-6" aria-labelledby="upgrade-title">
          <h2 id="upgrade-title" className="font-display font-bold text-ink-900">Want to take it again after practising?</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your free plan includes one Customer Support Assessment. Upgrade to retake it with new questions, unlock every mock exam and get AI feedback on your practice.
          </p>
          <Link href="/pricing" className="btn-primary mt-4">
            See plans and pricing
            <Icon as={ArrowRight} />
          </Link>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="btn-primary">
          Back to dashboard
        </Link>
        <Link href="/mock-tests/history" className="btn-secondary">
          <Icon as={ListChecks} />
          All my results
        </Link>
      </div>
    </div>
  );
}
