"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Overview {
  totalUsers: number;
  totalCandidates: number;
  totalAdmins: number;
  mockSessionsCompleted: number;
  totalPracticeAttempts: number;
  estimatedCostUsd: {
    transcriptionAndAnalysis: number;
    resultsReports: number;
    coachChat: number;
    generatedScenarios: number;
    improvedAnswers: number;
    total: number;
  };
}

function fmtUsd(n: number) {
  return `$${n.toFixed(4)}`;
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          {icon}
        </span>
        <h2 className="text-sm font-medium text-slate-500">{label}</h2>
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-ink-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setOverview(data);
      })
      .catch(() => setError("Couldn't load admin overview."));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink-950">Overview</h1>
      <p className="mt-1 text-sm text-slate-600">Platform-wide real data - users, activity, and estimated AI spend.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Users"
          value={String(overview.totalUsers)}
          sub={`${overview.totalCandidates} candidates, ${overview.totalAdmins} admins`}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
        />
        <StatCard
          label="Mock sessions completed"
          value={String(overview.mockSessionsCompleted)}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>}
        />
        <StatCard
          label="Practice attempts"
          value={String(overview.totalPracticeAttempts)}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>}
        />
        <StatCard
          label="Estimated AI spend"
          value={fmtUsd(overview.estimatedCostUsd.total)}
          sub={`Analysis ${fmtUsd(overview.estimatedCostUsd.transcriptionAndAnalysis)} - Reports ${fmtUsd(overview.estimatedCostUsd.resultsReports)} - Coach ${fmtUsd(overview.estimatedCostUsd.coachChat)} - Scenarios ${fmtUsd(overview.estimatedCostUsd.generatedScenarios)} - Rewrites ${fmtUsd(overview.estimatedCostUsd.improvedAnswers)}`}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/admin/candidates" className="card group block p-5 transition hover:border-brand-300 hover:shadow-md">
          <h2 className="font-display font-bold text-ink-900">Candidates</h2>
          <p className="mt-1 text-sm text-slate-600">View every candidate's real scores, sessions and activity.</p>
        </Link>
        <Link href="/admin/templates" className="card group block p-5 transition hover:border-brand-300 hover:shadow-md">
          <h2 className="font-display font-bold text-ink-900">Mock Test Templates</h2>
          <p className="mt-1 text-sm text-slate-600">Manage the sections and difficulty of proctored assessments.</p>
        </Link>
      </div>
    </div>
  );
}
