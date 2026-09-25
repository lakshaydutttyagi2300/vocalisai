"use client";

import { useEffect, useState } from "react";
import { PRACTICE_MODES, DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/practice-taxonomy";

interface Section {
  id?: string;
  order: number;
  category: string;
  difficulty: string;
  questionCount: number;
  examPartId?: string | null; // P1-G: optional link to an exam part
}

interface Template {
  id: string;
  name: string;
  isDefault?: boolean;
  createdAt?: string;
  sessionsUsingIt?: number;
  examVariantId?: string | null; // P1-G: optional exam format
  sections: Section[];
}

// Flattened from /api/admin/exam-catalogue for the pickers below.
interface VariantOption {
  id: string;
  label: string;
  parts: { id: string; label: string }[];
}

function emptySection(): Section {
  return { order: 0, category: PRACTICE_MODES[0].category, difficulty: "INTERMEDIATE", questionCount: 2 };
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Template | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);

  function load() {
    setError(null);
    fetch("/api/admin/templates")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setTemplates(data.templates);
      })
      .catch(() => setError("Couldn't load templates."));
  }

  useEffect(load, []);

  // P1-G: exam formats and their parts, for the optional link pickers.
  useEffect(() => {
    fetch("/api/admin/exam-catalogue")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data.families)) return;
        const options: VariantOption[] = [];
        for (const f of data.families) {
          for (const v of f.variants) {
            options.push({
              id: v.id,
              label: `${f.name} · ${v.name}`,
              parts: v.papers.flatMap((paper: { name: string; parts: { id: string; name: string }[] }) =>
                paper.parts.map((part) => ({ id: part.id, label: `${paper.name} › ${part.name}` }))
              ),
            });
          }
        }
        setVariantOptions(options);
      })
      .catch(() => {});
  }, []);

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
        body: JSON.stringify({ name: editing.name, examVariantId: editing.examVariantId ?? null, sections: editing.sections }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Couldn't save the template.");
        return;
      }
      setEditing(null);
      load();
    } catch {
      setFormError("Couldn't save the template.");
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(t: Template) {
    setSettingDefaultId(t.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/templates/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: t.name, sections: t.sections, isDefault: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't set this template as default.");
        return;
      }
      load();
    } catch {
      setError("Couldn't set this template as default.");
    } finally {
      setSettingDefaultId(null);
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
      load();
    } catch {
      setError("Couldn't delete the template.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink-950">Mock Test Templates</h1>
      <p className="mt-1 text-sm text-slate-600">
        Manage the sections and difficulty of every proctored assessment. The template marked{" "}
        <strong>Default</strong> is the one new mock tests actually use - editing it, or switching the default,
        takes effect immediately for every new session.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {!templates && !error && <div className="mt-6 h-40 animate-pulse rounded-lg bg-slate-200" />}

      {templates && (
        <div className="card mt-6 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-ink-900">Templates</h2>
            <button type="button" onClick={startNewTemplate} className="btn-primary text-sm">
              New template
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink-900">{t.name}</p>
                      {t.isDefault && <span className="badge badge-skill">Default</span>}
                      {t.examVariantId && (
                        <span className="badge badge-ai">
                          {variantOptions.find((v) => v.id === t.examVariantId)?.label ?? "Exam format"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {t.sections.length} section{t.sections.length === 1 ? "" : "s"} - used by {t.sessionsUsingIt} session
                      {t.sessionsUsingIt === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!t.isDefault && (
                      <button
                        type="button"
                        onClick={() => setDefault(t)}
                        disabled={settingDefaultId === t.id}
                        className="btn-secondary text-xs disabled:opacity-60"
                      >
                        {settingDefaultId === t.id ? "Setting..." : "Set as default"}
                      </button>
                    )}
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
            <h2 className="font-display font-bold text-ink-900">{editing.id ? "Edit template" : "New template"}</h2>

            <label className="mt-4 block text-sm">
              <span className="text-slate-600">Name</span>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>

            <label className="mt-4 block text-sm">
              <span className="text-slate-600">Exam format (optional)</span>
              <select
                value={editing.examVariantId ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    examVariantId: e.target.value || null,
                    // Parts belong to one format - switching formats clears them.
                    sections: editing.sections.map((sec) => ({ ...sec, examPartId: null })),
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="">None - standard mock test</option>
                {variantOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                Linking a format lets the new exam screen run this template (only while the &quot;Exam Runner v2&quot; feature is on).
                Link each section to the part it fills.
              </span>
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
                  {editing.examVariantId && (
                    <select
                      aria-label={`Section ${i + 1} exam part`}
                      value={s.examPartId ?? ""}
                      onChange={(e) => updateSection(i, { examPartId: e.target.value || null })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="">No exam part</option>
                      {(variantOptions.find((v) => v.id === editing.examVariantId)?.parts ?? []).map((part) => (
                        <option key={part.id} value={part.id}>
                          {part.label}
                        </option>
                      ))}
                    </select>
                  )}
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
