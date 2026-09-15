"use client";

import { useEffect, useState } from "react";
import { PRACTICE_MODES, DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/practice-taxonomy";

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

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  mockSessionsCompleted: number;
  averageOverallScore: number | null;
  totalPracticeAttempts: number;
}

interface Section {
  id?: string;
  order: number;
  category: string;
  difficulty: string;
  questionCount: number;
}

interface Template {
  id: string;
  name: string;
  createdAt?: string;
  sessionsUsingIt?: number;
  sections: Section[];
}

function emptySection(): Section {
  return { order: 0, category: PRACTICE_MODES[0].category, difficulty: "INTERMEDIATE", questionCount: 2 };
}

function fmtUsd(n: number) {
  return `$${n.toFixed(4)}`;
}

export default function AdminPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Template | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function loadAll() {
    setError(null);
    Promise.all([
      fetch("/api/admin/overview").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/templates").then((r) => r.json()),
    ])
      .then(([o, u, t]) => {
        if (o.error || u.error || t.error) {
          setError(o.error ?? u.error ?? t.error);
          return;
        }
        setOverview(o);
        setUsers(u.users);
        setTemplates(t.templates);
      })
      .catch(() => setError("Couldn't load admin data."))
      .finally(() => setLoaded(true));
  }

  useEffect(loadAll, []);

  useEffect(() => {
    if (!editing) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setEditing(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editing]);

  function startNewTemplate() {
    setFormError(null);
    setEditing({ id: "", name: "", sections: [emptySection()] });
  }

  function startEditTemplate(t: Template) {
    setFormError(null);
    setEditing({ ...t, sections: t.sections.map((s) => ({ ...s })) });
  }

  function updateSection(index: number, patch: Partial<Section>) {
    if (!editing) return;
    const sections = editing.sections.map((s, i) => (i === index ? { ...s, ...patch } : s));
    setEditing({ ...editing, sections });
  }

  function addSection() {
    if (!editing) return;
    setEditing({ ...editing, sections: [...editing.sections, emptySection()] });
  }

  function removeSection(index: number) {
    if (!editing) return;
    setEditing({ ...editing, sections: editing.sections.filter((_, i) => i !== index) });
  }

  async function saveTemplate() {
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    const isNew = !editing.id;
    const url = isNew ? "/api/admin/templates" : `/api/admin/templates/${editing.id}`;
    try {
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editing.name, sections: editing.sections }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Couldn't save the template.");
        return;
      }
      setEditing(null);
      loadAll();
    } catch {
      setFormError("Couldn't save the template.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't delete the template.");
        return;
      }
      loadAll();
    } catch {
      setError("Couldn't delete the template.");
    } finally {
      setDeletingId(null);
    }
  }

  if (!loaded) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-slate-200" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-ink-950">Admin</h1>
      <p className="mt-1 text-sm text-slate-600">Platform-wide real data - users, activity, and estimated AI spend.</p>

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {overview && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-5">
              <h2 className="text-sm font-medium text-slate-500">Users</h2>
              <p className="mt-1 text-xl font-semibold text-ink-900">{overview.totalUsers}</p>
              <p className="text-xs text-slate-500">{overview.totalCandidates} candidates, {overview.totalAdmins} admins</p>
            </div>
            <div className="card p-5">
              <h2 className="text-sm font-medium text-slate-500">Mock sessions completed</h2>
              <p className="mt-1 text-xl font-semibold text-ink-900">{overview.mockSessionsCompleted}</p>
            </div>
            <div className="card p-5">
              <h2 className="text-sm font-medium text-slate-500">Practice attempts</h2>
              <p className="mt-1 text-xl font-semibold text-ink-900">{overview.totalPracticeAttempts}</p>
            </div>
            <div className="card p-5">
              <h2 className="text-sm font-medium text-slate-500">Estimated AI spend</h2>
              <p className="mt-1 text-xl font-semibold text-ink-900">{fmtUsd(overview.estimatedCostUsd.total)}</p>
              <p className="text-xs text-slate-500">
                Analysis {fmtUsd(overview.estimatedCostUsd.transcriptionAndAnalysis)} - Reports{" "}
                {fmtUsd(overview.estimatedCostUsd.resultsReports)} - Coach {fmtUsd(overview.estimatedCostUsd.coachChat)} - Scenarios{" "}
                {fmtUsd(overview.estimatedCostUsd.generatedScenarios)} - Rewrites{" "}
                {fmtUsd(overview.estimatedCostUsd.improvedAnswers)}
              </p>
            </div>
          </div>

          <div className="card mt-6 overflow-x-auto p-5">
            <h2 className="font-semibold text-ink-900">Users</h2>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Sessions</th>
                  <th className="pb-2 pr-4">Avg score</th>
                  <th className="pb-2 pr-4">Attempts</th>
                  <th className="pb-2">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2 pr-4 font-medium text-ink-900">{u.name}</td>
                    <td className="py-2 pr-4 text-slate-600">{u.email}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.role === "ADMIN" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{u.mockSessionsCompleted}</td>
                    <td className="py-2 pr-4 text-slate-600">{u.averageOverallScore ?? "N/A"}</td>
                    <td className="py-2 pr-4 text-slate-600">{u.totalPracticeAttempts}</td>
                    <td className="py-2 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card mt-6 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink-900">Mock test templates</h2>
              <button type="button" onClick={startNewTemplate} className="btn-primary text-sm">
                New template
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{t.name}</p>
                      <p className="text-xs text-slate-500">
                        {t.sections.length} section{t.sections.length === 1 ? "" : "s"} - used by {t.sessionsUsingIt} session
                        {t.sessionsUsingIt === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEditTemplate(t)} className="btn-secondary text-xs">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTemplate(t.id)}
                        disabled={deletingId === t.id}
                        className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingId === t.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {t.sections.map((s) => (
                      <li key={s.id ?? s.order} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {PRACTICE_MODES.find((m) => m.category === s.category)?.label ?? s.category} ({DIFFICULTY_LABELS[s.difficulty as keyof typeof DIFFICULTY_LABELS] ?? s.difficulty}) x{s.questionCount}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {templates.length === 0 && <p className="text-sm text-slate-500">No templates yet.</p>}
            </div>
          </div>
        </>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label={editing.id ? "Edit template" : "New template"}
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
            <h2 className="font-semibold text-ink-900">{editing.id ? "Edit template" : "New template"}</h2>

            <label className="mt-4 block text-sm">
              <span className="text-slate-600">Name</span>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>

            <div className="mt-4 space-y-2">
              {editing.sections.map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 p-2">
                  <select
                    aria-label={`Section ${i + 1} category`}
                    value={s.category}
                    onChange={(e) => updateSection(i, { category: e.target.value })}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  >
                    {PRACTICE_MODES.map((m) => (
                      <option key={m.category} value={m.category}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={`Section ${i + 1} difficulty`}
                    value={s.difficulty}
                    onChange={(e) => updateSection(i, { difficulty: e.target.value })}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {DIFFICULTY_LABELS[d]}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={`Section ${i + 1} question count`}
                    type="number"
                    min={1}
                    max={20}
                    value={s.questionCount}
                    onChange={(e) => updateSection(i, { questionCount: Number(e.target.value) })}
                    className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeSection(i)}
                    disabled={editing.sections.length === 1}
                    className="ml-auto text-xs text-red-600 hover:underline disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={addSection} className="btn-secondary mt-3 text-sm">
              Add section
            </button>

            {formError && (
              <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary text-sm">
                Cancel
              </button>
              <button type="button" onClick={saveTemplate} disabled={saving} className="btn-primary text-sm disabled:opacity-60">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
