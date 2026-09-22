"use client";

import { useEffect, useState } from "react";

interface WeightRow {
  category: string;
  label: string;
  weight: number;
  updatedAt: string | null;
}

export default function AdminScoringPage() {
  const [weights, setWeights] = useState<WeightRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function load() {
    setError(null);
    fetch("/api/admin/scoring-weights")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setWeights(data.weights);
          setDrafts(Object.fromEntries(data.weights.map((w: WeightRow) => [w.category, String(w.weight)])));
        }
      })
      .catch(() => setError("Couldn't load scoring weights."));
  }

  useEffect(load, []);

  async function save(category: string) {
    const raw = drafts[category];
    const weight = Number(raw);
    if (!Number.isFinite(weight) || weight < 0 || weight > 5) {
      setError("Weight must be a number between 0 and 5.");
      return;
    }
    setSavingCategory(category);
    setError(null);
    try {
      const res = await fetch("/api/admin/scoring-weights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, weight }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save this weight.");
        return;
      }
      load();
    } catch {
      setError("Couldn't save this weight.");
    } finally {
      setSavingCategory(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink-950">Scoring weights</h1>
      <p className="mt-1 text-sm text-slate-600">
        Each category&apos;s own score is calculated the same way regardless of these settings - this only controls
        how much each one counts toward a mock test&apos;s overall Readiness score. Default is 1 (equal weight,
        today&apos;s behavior). 0 excludes a category entirely; 2 counts it twice as heavily as a default one.
      </p>

      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {weights === null && !error && <div className="mt-6 h-64 animate-pulse rounded-lg bg-slate-200" />}

      {weights && (
        <div className="card mt-6 p-5">
          <ul className="divide-y divide-slate-100">
            {weights.map((w) => (
              <li key={w.category} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">{w.label}</p>
                  {w.weight !== 1 && <p className="text-xs text-amber-600">Currently weighted at {w.weight}x, not the default.</p>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={drafts[w.category] ?? String(w.weight)}
                    onChange={(e) => setDrafts({ ...drafts, [w.category]: e.target.value })}
                    className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => save(w.category)}
                    disabled={savingCategory === w.category || drafts[w.category] === String(w.weight)}
                    className="btn-secondary text-xs disabled:opacity-60"
                  >
                    {savingCategory === w.category ? "Saving..." : "Save"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
