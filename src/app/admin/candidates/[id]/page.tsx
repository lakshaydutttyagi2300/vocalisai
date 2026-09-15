"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CATEGORY_LABELS, type ScoreCategory } from "@/lib/scoring-engine";
import { ScoreRing } from "@/components/ui/ScoreRing";

interface CategoryTrend {
  average: number | null;
  latest: number | null;
  trend: "up" | "down" | "flat" | null;
  sessionsWithData: number;
}

interface UsageSummary {
  plan: string;
  periodEnd: string | null;
  features: { feature: string; label: string; pluralLabel: string; limit: number; used: number }[];
}

interface CandidateDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  targetRole: string | null;
  coachProfile: {
    sessionsCompleted: number;
    averageOverallScore: number | null;
    latestOverallScore: number | null;
    categories: Record<ScoreCategory, CategoryTrend>;
    weakest: { category: ScoreCategory; average: number }[];
    strongest: { category: ScoreCategory; average: number }[];
  };
  usage: UsageSummary;
  recentSessions: { id: string; startedAt: string; endedAt: string | null; overallScore: number | null; templateName: string | null }[];
}

const PLAN_OPTIONS = ["FREE", "STARTER", "PROFESSIONAL", "PREMIUM"];

export default function AdminCandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<CandidateDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("FREE");
  const [savingPlan, setSavingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  function load() {
    fetch(`/api/admin/candidates/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setDetail(data);
          setSelectedPlan(data.usage.plan);
        }
      })
      .catch(() => setError("Couldn't load this candidate."));
  }

  useEffect(load, [params.id]);

  async function savePlan() {
    setSavingPlan(true);
    setPlanError(null);
    try {
      const res = await fetch(`/api/admin/candidates/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlanError(data.error ?? "Couldn't update the plan.");
        return;
      }
      setDetail(data);
    } catch {
      setPlanError("Couldn't update the plan.");
    } finally {
      setSavingPlan(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-slate-200" />
      </div>
    );
  }

  const { coachProfile: cp } = detail;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin/candidates" className="text-sm text-slate-500 hover:text-ink-900">
        &larr; Back to Candidates
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">{detail.name}</h1>
          <p className="mt-1 text-sm text-slate-600">{detail.email}</p>
          {detail.targetRole && <p className="mt-0.5 text-xs text-slate-500">Target role: {detail.targetRole}</p>}
        </div>
        <span className="text-xs text-slate-500">
          Joined {new Date(detail.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="card mt-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</p>
            <p className="mt-1 font-display text-lg font-bold text-ink-900">{detail.usage.plan}</p>
            {detail.usage.periodEnd && (
              <p className="mt-0.5 text-xs text-slate-500">
                Renews or expires {new Date(detail.usage.periodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex items-end gap-2">
            <label className="flex flex-col text-xs text-slate-600">
              Assign plan
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                {PLAN_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={savePlan} disabled={savingPlan} className="btn-primary text-sm disabled:opacity-60">
              {savingPlan ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
        {planError && (
          <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{planError}</p>
        )}
        <p className="mt-3 text-xs text-slate-400">
          No payment processor is connected yet - this manually sets what the candidate can use, the
          same way a future billing webhook will.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {detail.usage.features.map((f) => (
            <div key={f.feature} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
              <span className="text-ink-900">{f.pluralLabel}</span>
              <span className="font-mono text-slate-600">
                {f.used} / {f.limit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {cp.sessionsCompleted === 0 ? (
        <div className="card mt-6 p-6 text-center">
          <p className="text-sm text-slate-600">This candidate hasn&apos;t completed a mock test yet.</p>
        </div>
      ) : (
        <div className="card mt-6 grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex justify-center">
            <ScoreRing value={cp.averageOverallScore} label="Readiness" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {cp.strongest.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Strengths</p>
                <ul className="mt-1.5 space-y-1 text-sm text-ink-900">
                  {cp.strongest.map((c) => (
                    <li key={c.category}>{CATEGORY_LABELS[c.category]} - {c.average}</li>
                  ))}
                </ul>
              </div>
            )}
            {cp.weakest.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Focus areas</p>
                <ul className="mt-1.5 space-y-1 text-sm text-ink-900">
                  {cp.weakest.map((c) => (
                    <li key={c.category}>{CATEGORY_LABELS[c.category]} - {c.average}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card mt-4 p-6">
        <h2 className="font-display font-bold text-ink-900">Recent mock test sessions</h2>
        {detail.recentSessions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No mock test sessions yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {detail.recentSessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <span className="font-medium text-ink-900">{s.templateName ?? "Assessment"}</span>
                  <span className="ml-2 text-slate-500">{new Date(s.startedAt).toLocaleString()}</span>
                  {!s.endedAt && <span className="ml-2 text-xs font-semibold text-amber-700">In progress</span>}
                </div>
                <span className="font-mono font-semibold text-ink-900">{s.overallScore ?? "N/A"}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-slate-400">
          Session scores only - individual recordings and transcripts remain private to the
          candidate.
        </p>
      </div>
    </div>
  );
}
