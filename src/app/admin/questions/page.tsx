"use client";

import { useEffect, useState } from "react";
import { PRACTICE_MODES, DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/practice-taxonomy";

interface QuestionRow {
  id: string;
  category: string;
  difficulty: string;
  type: string;
  prompt: string;
  source: string;
  createdAt: string;
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
  const [questions, setQuestions] = useState<QuestionRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function load() {
    setError(null);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (difficulty) params.set("difficulty", difficulty);
    if (search) params.set("search", search);
    fetch(`/api/admin/questions?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setQuestions(data.questions);
          setTotal(data.total);
          setCoverage(data.coverage);
        }
      })
      .catch(() => setError("Couldn't load questions."));
  }

  useEffect(load, [category, difficulty, search]);

  async function deleteQuestion(id: string) {
    setDeletingId(id);
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
      setDeletingId(null);
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

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink-950">Question Bank</h1>
      <p className="mt-1 text-sm text-slate-600">
        Browse, filter, delete, and bulk-import practice questions. {total} question{total === 1 ? "" : "s"} match the current filters.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="card mt-6 p-5">
        <h2 className="font-display font-bold text-ink-900">Coverage by category &amp; difficulty</h2>
        <p className="mt-1 text-xs text-slate-500">
          Low numbers mean candidates will see the same questions repeated often - that's the actual cause of
          repetition, not a randomization bug.
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
                    return (
                      <td key={d} className={`py-1.5 pr-4 font-mono ${n < 10 ? "text-amber-600" : "text-slate-600"}`}>
                        {n}
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

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="pb-2 pr-4">Prompt</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 pr-4">Difficulty</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {questions?.map((q) => (
                <tr key={q.id}>
                  <td className="py-2 pr-4 text-ink-900">{q.prompt.slice(0, 90)}{q.prompt.length > 90 ? "..." : ""}</td>
                  <td className="py-2 pr-4 text-slate-600">{q.category}</td>
                  <td className="py-2 pr-4 text-slate-600">{q.difficulty}</td>
                  <td className="py-2 pr-4 text-slate-600">{q.type}</td>
                  <td className="py-2">
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      disabled={deletingId === q.id}
                      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                    >
                      {deletingId === q.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
              {questions?.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-slate-500">No questions match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
