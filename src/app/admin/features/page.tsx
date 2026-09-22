"use client";

import { useEffect, useState } from "react";

interface FlagRow {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  updatedAt: string | null;
}

const SUBSYSTEM_KEYS = new Set(["MOCK_TEST", "INTERVIEW_SIMULATION", "AI_SPEECH_ANALYSIS", "PROGRESS_DASHBOARD"]);

export default function AdminFeaturesPage() {
  const [flags, setFlags] = useState<FlagRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  function load() {
    setError(null);
    fetch("/api/admin/features")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setFlags(data.flags);
      })
      .catch(() => setError("Couldn't load feature flags."));
  }

  useEffect(load, []);

  async function toggle(key: string, next: boolean) {
    setPendingKey(key);
    setError(null);
    // Optimistic update, rolled back on failure - the toggle should feel
    // instant, but the backend is still the source of truth.
    setFlags((prev) => prev && prev.map((f) => (f.key === key ? { ...f, enabled: next } : f)));
    try {
      const res = await fetch("/api/admin/features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't update this feature.");
        load();
        return;
      }
    } catch {
      setError("Couldn't update this feature.");
      load();
    } finally {
      setPendingKey(null);
    }
  }

  const subsystems = flags?.filter((f) => SUBSYSTEM_KEYS.has(f.key)) ?? [];
  const categories = flags?.filter((f) => !SUBSYSTEM_KEYS.has(f.key)) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink-950">Features</h1>
      <p className="mt-1 text-sm text-slate-600">
        Turn features off server-side - a disabled feature is actually blocked at the API, not just hidden.
        Candidates already mid-flow will get a clear error the next time they try to use it.
      </p>

      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {flags === null && !error && <p className="mt-6 text-sm text-slate-500">Loading...</p>}

      {subsystems.length > 0 && (
        <div className="card mt-6 p-5">
          <h2 className="font-display font-bold text-ink-900">Subsystems</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {subsystems.map((f) => (
              <FlagRowItem key={f.key} flag={f} pending={pendingKey === f.key} onToggle={toggle} />
            ))}
          </ul>
        </div>
      )}

      {categories.length > 0 && (
        <div className="card mt-4 p-5">
          <h2 className="font-display font-bold text-ink-900">Practice categories</h2>
          <p className="mt-1 text-xs text-slate-500">
            Disabling a category blocks it in both solo practice and mock tests, since both pull questions from the
            same backend selection.
          </p>
          <ul className="mt-3 divide-y divide-slate-100">
            {categories.map((f) => (
              <FlagRowItem key={f.key} flag={f} pending={pendingKey === f.key} onToggle={toggle} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FlagRowItem({
  flag,
  pending,
  onToggle,
}: {
  flag: FlagRow;
  pending: boolean;
  onToggle: (key: string, next: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-ink-900">{flag.label}</p>
        <p className="text-xs text-slate-500">{flag.description}</p>
      </div>
      <button
        role="switch"
        aria-checked={flag.enabled}
        disabled={pending}
        onClick={() => onToggle(flag.key, !flag.enabled)}
        className={`relative h-6 w-11 flex-none rounded-full transition-colors disabled:opacity-60 ${
          flag.enabled ? "bg-brand-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            flag.enabled ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </li>
  );
}
