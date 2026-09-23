"use client";

import { useEffect, useState } from "react";
import { PRACTICE_MODES, DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/practice-taxonomy";

const QUESTION_TYPES = ["MULTIPLE_CHOICE", "READING_COMPREHENSION", "LISTENING_COMPREHENSION", "SHORT_ANSWER"] as const;

interface QuestionRow {
  id: string;
  category: string;
  difficulty: string;
  type: string;
  prompt: string;
  source: string;
  isActive: boolean;
  createdAt: string;
}

interface QuestionDetail {
  id: string;
  category: string;
  difficulty: string;
  type: string;
  prompt: string;
  passage: string | null;
  options: string[] | null;
  correctAnswer: string | null;
  expectedAnswer: string | null;
  explanation: string | null;
  scoringCriteria: string | null;
  timeLimitSeconds: number;
  isActive: boolean;
}

interface Coverage {
  category: string;
  difficulty: string;
  count: number;
}

interface ImportResult {
  inserted: number;
  duplicateCount: number;
  errorCount: number;
  duplicates: { index: number; prompt: string; matchedExisting?: string; matchedInBatch?: number }[];
  errors: { index: number; error: string }[];
}

export default function AdminQuestionsPage() {
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState(""); // "" | "true" | "false"
  const [questions, setQuestions] = useState<QuestionRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [totalCoverage, setTotalCoverage] = useState<Coverage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [editing, setEditing] = useState<QuestionDetail | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState<QuestionDetail>({
    id: "",
    category: PRACTICE_MODES[0].category,
    difficulty: "BEGINNER",
    type: "MULTIPLE_CHOICE",
    prompt: "",
    passage: null,
    options: [],
    correctAnswer: null,
    expectedAnswer: null,
    explanation: null,
    scoringCriteria: null,
    timeLimitSeconds: 30,
    isActive: true,
  });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addResult, setAddResult] = useState<ImportResult | null>(null);

  async function submitNewQuestion() {
    setAddSaving(true);
    setAddError(null);
    setAddResult(null);
    try {
      const { id: _id, ...payload } = newQuestion;
      void _id;
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: [payload] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? "Couldn't save this question.");
        return;
      }
      setAddResult(data);
      if (data.inserted > 0) {
        setNewQuestion({
          id: "",
          category: newQuestion.category,
          difficulty: newQuestion.difficulty,
          type: newQuestion.type,
          prompt: "",
          passage: null,
          options: [],
          correctAnswer: null,
          expectedAnswer: null,
          explanation: null,
          scoringCriteria: null,
          timeLimitSeconds: newQuestion.timeLimitSeconds,
          isActive: true,
        });
        load();
      }
    } catch {
      setAddError("Couldn't save this question.");
    } finally {
      setAddSaving(false);
    }
  }

  const newQuestionNeedsOptions =
    newQuestion.type === "MULTIPLE_CHOICE" || newQuestion.type === "READING_COMPREHENSION" || newQuestion.type === "LISTENING_COMPREHENSION";

  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  async function bulkSetActive(isActive: boolean) {
    setBulkBusy(true);
    setBulkError(null);
    setBulkMessage(null);
    try {
      const res = await fetch("/api/admin/questions/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, difficulty, isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkError(data.error ?? "Bulk update failed.");
        return;
      }
      setBulkMessage(`${isActive ? "Enabled" : "Disabled"} ${data.updated} question${data.updated === 1 ? "" : "s"}.`);
      load();
    } catch {
      setBulkError("Bulk update failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  function load() {
    setError(null);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (difficulty) params.set("difficulty", difficulty);
    if (search) params.set("search", search);
    if (activeFilter) params.set("active", activeFilter);
    fetch(`/api/admin/questions?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setQuestions(data.questions);
          setTotal(data.total);
          setCoverage(data.coverage);
          setTotalCoverage(data.totalCoverage);
        }
      })
      .catch(() => setError("Couldn't load questions."));
  }

  useEffect(load, [category, difficulty, search, activeFilter]);

  async function deleteQuestion(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't delete the question.");
        return;
      }
      load();
    } catch {
      setError("Couldn't delete the question.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(q: QuestionRow) {
    setBusyId(q.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/questions/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !q.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't update the question.");
        return;
      }
      load();
    } catch {
      setError("Couldn't update the question.");
    } finally {
      setBusyId(null);
    }
  }

  async function duplicateQuestion(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/questions/${id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't duplicate the question.");
        return;
      }
      load();
    } catch {
      setError("Couldn't duplicate the question.");
    } finally {
      setBusyId(null);
    }
  }

  async function openEdit(id: string) {
    setEditError(null);
    setEditing(null);
    const res = await fetch(`/api/admin/questions/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't load this question.");
      return;
    }
    setEditing(data);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/questions/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "Couldn't save changes.");
        return;
      }
      setEditing(null);
      load();
    } catch {
      setEditError("Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function runImport() {
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(importText);
      } catch {
        setImportError("That's not valid JSON.");
        return;
      }
      const questionsArray = Array.isArray(parsed) ? parsed : (parsed as { questions?: unknown[] })?.questions;
      if (!Array.isArray(questionsArray)) {
        setImportError("Paste either a JSON array of questions, or an object with a 'questions' array.");
        return;
      }
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: questionsArray }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Import failed.");
        return;
      }
      setImportResult(data);
      if (data.inserted > 0) load();
    } catch {
      setImportError("Import failed.");
    } finally {
      setImporting(false);
    }
  }

  function coverageFor(cat: string, diff: string): number {
    return coverage.find((c) => c.category === cat && c.difficulty === diff)?.count ?? 0;
  }

  function totalCoverageFor(cat: string, diff: string): number {
    return totalCoverage.find((c) => c.category === cat && c.difficulty === diff)?.count ?? 0;
  }

  const needsOptions = editing && (editing.type === "MULTIPLE_CHOICE" || editing.type === "READING_COMPREHENSION" || editing.type === "LISTENING_COMPREHENSION");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink-950">Question Bank</h1>
      <p className="mt-1 text-sm text-slate-600">
        Browse, filter, edit, duplicate, enable/disable, and bulk-import practice questions. {total} question{total === 1 ? "" : "s"} match the current filters.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="card mt-6 p-5">
        <h2 className="font-display font-bold text-ink-900">Coverage by category &amp; difficulty</h2>
        <p className="mt-1 text-xs text-slate-500">
          Each cell shows <strong>active / total</strong>. Active is what candidates can actually be served - low
          active numbers mean repeated questions, not a randomization bug. Total includes disabled questions (e.g.
          an imported batch pending review) that aren&apos;t reachable by candidates yet.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="pb-1 pr-4">Category</th>
                {DIFFICULTIES.map((d) => (
                  <th key={d} className="pb-1 pr-4">{DIFFICULTY_LABELS[d]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRACTICE_MODES.map((m) => (
                <tr key={m.category} className="border-t border-slate-100">
                  <td className="py-1.5 pr-4 font-medium text-ink-900">{m.label}</td>
                  {DIFFICULTIES.map((d) => {
                    const n = coverageFor(m.category, d);
                    const t = totalCoverageFor(m.category, d);
                    return (
                      <td key={d} className={`py-1.5 pr-4 font-mono ${n < 10 ? "text-amber-600" : "text-slate-600"}`}>
                        {n}
                        {t > n && <span className="text-slate-400"> / {t}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <h2 className="font-display font-bold text-ink-900">Bulk import</h2>
        <p className="mt-1 text-xs text-slate-500">
          Paste a JSON array of questions (or {"{ \"questions\": [...] }"}). Each needs category, difficulty, type,
          prompt, and timeLimitSeconds at minimum. Every question is checked against the existing bank and the rest
          of the batch for near-duplicates before anything is saved.
        </p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={8}
          placeholder='[{"category":"GRAMMAR","difficulty":"BEGINNER","type":"MULTIPLE_CHOICE","prompt":"...","options":["..."],"correctAnswer":"...","timeLimitSeconds":30}]'
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs focus:border-brand-500 focus:outline-none"
        />
        <button onClick={runImport} disabled={importing || !importText.trim()} className="btn-primary mt-3 text-sm disabled:opacity-60">
          {importing ? "Importing..." : "Import"}
        </button>

        {importError && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{importError}</p>
        )}
        {importResult && (
          <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p>
              Inserted <strong>{importResult.inserted}</strong>, skipped <strong>{importResult.duplicateCount}</strong> near-duplicate
              {importResult.duplicateCount === 1 ? "" : "s"}, <strong>{importResult.errorCount}</strong> error
              {importResult.errorCount === 1 ? "" : "s"}.
            </p>
            {importResult.duplicates.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                {importResult.duplicates.slice(0, 10).map((d) => (
                  <li key={d.index}>Skipped #{d.index}: &quot;{d.prompt.slice(0, 60)}&quot; - too similar to an existing question.</li>
                ))}
              </ul>
            )}
            {importResult.errors.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-red-600">
                {importResult.errors.slice(0, 10).map((e) => (
                  <li key={e.index}>#{e.index}: {e.error}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="card mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-ink-900">Add a question manually</h2>
          <button onClick={() => setShowAddForm((v) => !v)} className="text-xs font-medium text-brand-600 hover:underline">
            {showAddForm ? "Hide" : "Show"}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Write one question by hand instead of pasting JSON - same fields as editing, saved through the same
          bulk-import endpoint (as a batch of one), so it goes through the same validation and duplicate check.
        </p>

        {showAddForm && (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col text-xs text-slate-600">
                Category
                <select
                  value={newQuestion.category}
                  onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                  className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {PRACTICE_MODES.map((m) => (
                    <option key={m.category} value={m.category}>{m.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Difficulty
                <select
                  value={newQuestion.difficulty}
                  onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                  className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Type
                <select
                  value={newQuestion.type}
                  onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                  className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-3 flex flex-col text-xs text-slate-600">
              Prompt
              <textarea
                value={newQuestion.prompt}
                onChange={(e) => setNewQuestion({ ...newQuestion, prompt: e.target.value })}
                rows={2}
                className="input-field mt-1"
                placeholder={'e.g. Complete the sentence: "I eat ___ apple every day."'}
              />
            </label>

            <label className="mt-3 flex flex-col text-xs text-slate-600">
              Passage / instructions (optional)
              <textarea
                value={newQuestion.passage ?? ""}
                onChange={(e) => setNewQuestion({ ...newQuestion, passage: e.target.value || null })}
                rows={3}
                className="input-field mt-1"
              />
            </label>

            {newQuestionNeedsOptions && (
              <>
                <label className="mt-3 flex flex-col text-xs text-slate-600">
                  Options (one per line)
                  <textarea
                    value={(newQuestion.options ?? []).join("\n")}
                    onChange={(e) => setNewQuestion({ ...newQuestion, options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                    rows={4}
                    className="input-field mt-1 font-mono"
                  />
                </label>
                <label className="mt-3 flex flex-col text-xs text-slate-600">
                  Correct answer (must match one option exactly)
                  <input
                    type="text"
                    value={newQuestion.correctAnswer ?? ""}
                    onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value || null })}
                    className="input-field mt-1"
                  />
                </label>
              </>
            )}

            <label className="mt-3 flex flex-col text-xs text-slate-600">
              Expected / reference answer (optional)
              <textarea
                value={newQuestion.expectedAnswer ?? ""}
                onChange={(e) => setNewQuestion({ ...newQuestion, expectedAnswer: e.target.value || null })}
                rows={2}
                className="input-field mt-1"
              />
            </label>

            <label className="mt-3 flex flex-col text-xs text-slate-600">
              Explanation shown after answering (optional)
              <textarea
                value={newQuestion.explanation ?? ""}
                onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value || null })}
                rows={2}
                className="input-field mt-1"
              />
            </label>

            <label className="mt-3 flex flex-col text-xs text-slate-600">
              Scoring criteria (optional)
              <textarea
                value={newQuestion.scoringCriteria ?? ""}
                onChange={(e) => setNewQuestion({ ...newQuestion, scoringCriteria: e.target.value || null })}
                rows={2}
                className="input-field mt-1"
              />
            </label>

            <div className="mt-3 flex items-end gap-4">
              <label className="flex flex-col text-xs text-slate-600">
                Time limit (seconds)
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={newQuestion.timeLimitSeconds}
                  onChange={(e) => setNewQuestion({ ...newQuestion, timeLimitSeconds: Number(e.target.value) })}
                  className="input-field mt-1 w-28"
                />
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm text-ink-900">
                <input
                  type="checkbox"
                  checked={newQuestion.isActive}
                  onChange={(e) => setNewQuestion({ ...newQuestion, isActive: e.target.checked })}
                />
                Active (servable to candidates)
              </label>
            </div>

            {addError && (
              <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{addError}</p>
            )}
            {addResult && (
              <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {addResult.inserted > 0
                  ? "Question saved."
                  : addResult.duplicateCount > 0
                    ? "Skipped - too similar to an existing question."
                    : addResult.errors[0]?.error ?? "Nothing was saved."}
              </p>
            )}

            <button onClick={submitNewQuestion} disabled={addSaving || !newQuestion.prompt.trim()} className="btn-primary mt-4 text-sm disabled:opacity-60">
              {addSaving ? "Saving..." : "Save question"}
            </button>
          </>
        )}
      </div>

      {editing && (
        <div className="card mt-6 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-ink-900">Edit question</h2>
            <button onClick={() => setEditing(null)} className="text-xs font-medium text-slate-500 hover:text-ink-900">
              Close
            </button>
          </div>

          {editError && (
            <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col text-xs text-slate-600">
              Category
              <select
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                {PRACTICE_MODES.map((m) => (
                  <option key={m.category} value={m.category}>{m.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-xs text-slate-600">
              Difficulty
              <select
                value={editing.difficulty}
                onChange={(e) => setEditing({ ...editing, difficulty: e.target.value })}
                className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-xs text-slate-600">
              Type
              <select
                value={editing.type}
                onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 flex flex-col text-xs text-slate-600">
            Prompt
            <textarea
              value={editing.prompt}
              onChange={(e) => setEditing({ ...editing, prompt: e.target.value })}
              rows={2}
              className="input-field mt-1"
            />
          </label>

          <label className="mt-3 flex flex-col text-xs text-slate-600">
            Passage / instructions (optional)
            <textarea
              value={editing.passage ?? ""}
              onChange={(e) => setEditing({ ...editing, passage: e.target.value || null })}
              rows={3}
              className="input-field mt-1"
            />
          </label>

          {needsOptions && (
            <>
              <label className="mt-3 flex flex-col text-xs text-slate-600">
                Options (one per line)
                <textarea
                  value={(editing.options ?? []).join("\n")}
                  onChange={(e) => setEditing({ ...editing, options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                  rows={4}
                  className="input-field mt-1 font-mono"
                />
              </label>
              <label className="mt-3 flex flex-col text-xs text-slate-600">
                Correct answer (must match one option exactly)
                <input
                  type="text"
                  value={editing.correctAnswer ?? ""}
                  onChange={(e) => setEditing({ ...editing, correctAnswer: e.target.value || null })}
                  className="input-field mt-1"
                />
              </label>
            </>
          )}

          <label className="mt-3 flex flex-col text-xs text-slate-600">
            Expected / reference answer (optional)
            <textarea
              value={editing.expectedAnswer ?? ""}
              onChange={(e) => setEditing({ ...editing, expectedAnswer: e.target.value || null })}
              rows={2}
              className="input-field mt-1"
            />
          </label>

          <label className="mt-3 flex flex-col text-xs text-slate-600">
            Explanation shown after answering (optional)
            <textarea
              value={editing.explanation ?? ""}
              onChange={(e) => setEditing({ ...editing, explanation: e.target.value || null })}
              rows={2}
              className="input-field mt-1"
            />
          </label>

          <label className="mt-3 flex flex-col text-xs text-slate-600">
            Scoring criteria (optional)
            <textarea
              value={editing.scoringCriteria ?? ""}
              onChange={(e) => setEditing({ ...editing, scoringCriteria: e.target.value || null })}
              rows={2}
              className="input-field mt-1"
            />
          </label>

          <div className="mt-3 flex items-end gap-4">
            <label className="flex flex-col text-xs text-slate-600">
              Time limit (seconds)
              <input
                type="number"
                min={5}
                max={300}
                value={editing.timeLimitSeconds}
                onChange={(e) => setEditing({ ...editing, timeLimitSeconds: Number(e.target.value) })}
                className="input-field mt-1 w-28"
              />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm text-ink-900">
              <input
                type="checkbox"
                checked={editing.isActive}
                onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
              />
              Active (servable to candidates)
            </label>
          </div>

          <button onClick={saveEdit} disabled={saving} className="btn-primary mt-4 disabled:opacity-60">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      )}

      <div className="card mt-6 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs text-slate-600">
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">All</option>
              {PRACTICE_MODES.map((m) => (
                <option key={m.category} value={m.category}>{m.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            Difficulty
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">All</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            Status
            <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Disabled</option>
            </select>
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            Search prompt
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="e.g. refund"
            />
          </label>
        </div>

        {category && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-600">
              Bulk action for <strong>{PRACTICE_MODES.find((m) => m.category === category)?.label}</strong>
              {difficulty ? (
                <>
                  {" "}
                  / <strong>{DIFFICULTY_LABELS[difficulty as keyof typeof DIFFICULTY_LABELS]}</strong>
                </>
              ) : (
                <> / <strong>all difficulties</strong></>
              )}
              :
            </span>
            <button onClick={() => bulkSetActive(true)} disabled={bulkBusy} className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-60">
              Enable all disabled
            </button>
            <button onClick={() => bulkSetActive(false)} disabled={bulkBusy} className="text-xs font-medium text-amber-700 hover:underline disabled:opacity-60">
              Disable all active
            </button>
            {bulkMessage && <span className="text-xs text-slate-600">{bulkMessage}</span>}
            {bulkError && <span className="text-xs text-red-600">{bulkError}</span>}
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="pb-2 pr-4">Prompt</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 pr-4">Difficulty</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {questions?.map((q) => (
                <tr key={q.id} className={q.isActive ? "" : "opacity-60"}>
                  <td className="py-2 pr-4 text-ink-900">{q.prompt.slice(0, 70)}{q.prompt.length > 70 ? "..." : ""}</td>
                  <td className="py-2 pr-4 text-slate-600">{q.category}</td>
                  <td className="py-2 pr-4 text-slate-600">{q.difficulty}</td>
                  <td className="py-2 pr-4 text-slate-600">{q.type}</td>
                  <td className="py-2 pr-4">
                    <span className={`badge ${q.isActive ? "badge-skill" : "badge-neutral"}`}>
                      {q.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2.5 text-xs font-medium">
                      <button onClick={() => openEdit(q.id)} className="text-brand-600 hover:underline">
                        Edit
                      </button>
                      <button onClick={() => duplicateQuestion(q.id)} disabled={busyId === q.id} className="text-slate-600 hover:underline disabled:opacity-60">
                        Duplicate
                      </button>
                      <button onClick={() => toggleActive(q)} disabled={busyId === q.id} className="text-amber-700 hover:underline disabled:opacity-60">
                        {q.isActive ? "Disable" : "Enable"}
                      </button>
                      <button onClick={() => deleteQuestion(q.id)} disabled={busyId === q.id} className="text-red-600 hover:underline disabled:opacity-60">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {questions?.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-500">No questions match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
