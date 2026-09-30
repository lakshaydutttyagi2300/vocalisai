"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Trash2, X } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/practice-taxonomy";
import { CatalogueQuestionImport } from "@/components/admin/CatalogueQuestionImport";

const TYPES = ["MULTIPLE_CHOICE", "READING_COMPREHENSION", "TRUE_FALSE_NOT_GIVEN", "YES_NO_NOT_GIVEN", "MULTI_SELECT", "GAP_FILL", "ORDERING", "NUMERIC_ENTRY", "MATCHING", "LISTENING_COMPREHENSION"];
const TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  READING_COMPREHENSION: "Reading comprehension",
  TRUE_FALSE_NOT_GIVEN: "True / False / Not given",
  YES_NO_NOT_GIVEN: "Yes / No / Not given",
  MULTI_SELECT: "Multiple answers",
  GAP_FILL: "Gap fill",
  ORDERING: "Ordering",
  NUMERIC_ENTRY: "Numeric answer",
  MATCHING: "Matching",
  LISTENING_COMPREHENSION: "Listening",
};
const STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
const OPTION_TYPES = new Set(["MULTIPLE_CHOICE", "READING_COMPREHENSION", "LISTENING_COMPREHENSION", "MATCHING", "MULTI_SELECT", "ORDERING"]);

interface Stats {
  timesServed: number;
  candidates: number;
  attempts: number;
  correct: number;
  accuracy: number | null;
  avgSeconds: number | null;
}
interface Row {
  id: string;
  prompt: string;
  type: string;
  difficulty: string;
  tags: string[];
  status: string;
  subject: { name: string } | null;
  catalogSkill: { name: string } | null;
  exams: string[];
  stats?: Stats;
}
interface Catalog {
  categories: { id: string; name: string; exams: { id: string; name: string }[] }[];
  subjects: { id: string; name: string; slug: string; skills: { id: string; name: string; slug: string }[] }[];
}
interface Draft {
  subjectId: string;
  skillId: string;
  examIds: string[];
  difficulty: string;
  type: string;
  prompt: string;
  passage: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  tags: string;
  status: string;
  timeLimitSeconds: number;
}

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink-950 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

const STATUS_STYLE: Record<string, string> = { ACTIVE: "bg-green-50 text-green-800", INACTIVE: "bg-slate-100 text-slate-600", ARCHIVED: "bg-amber-50 text-amber-800" };

function emptyDraft(subjectId = ""): Draft {
  return { subjectId, skillId: "", examIds: [], difficulty: "BEGINNER", type: "MULTIPLE_CHOICE", prompt: "", passage: "", options: ["", "", "", ""], correctAnswer: "", explanation: "", tags: "", status: "ACTIVE", timeLimitSeconds: 60 };
}

export default function AdminCatalogueQuestionsPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [filters, setFilters] = useState({ examId: "", subjectId: "", skillId: "", difficulty: "", status: "", q: "", page: 1 });
  const [list, setList] = useState<{ total: number; pageSize: number; questions: Row[] } | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft; stats?: Stats; attempts?: { id: string; createdAt: string; isCorrect: boolean | null; timeTakenSeconds: number; user: { name: string | null; email: string } }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetch("/api/admin/catalogue")
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => setError("Couldn't load the catalogue."));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(Object.entries(filters).map(([k, v]) => [k, String(v)]));
    fetch(`/api/admin/catalogue/questions?${params}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Couldn't load questions.");
        return body;
      })
      .then((body) => !cancelled && setList(body))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [filters, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const exams = useMemo(() => catalog?.categories.flatMap((c) => c.exams.map((e) => ({ ...e, category: c.name }))) ?? [], [catalog]);
  const filterSubject = catalog?.subjects.find((s) => s.id === filters.subjectId);

  async function open(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/catalogue/questions/${id}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setError(body.error ?? "Couldn't open that question.");
    const q = body.question;
    const draft: Draft = {
      subjectId: q.subjectId,
      skillId: q.skillId ?? "",
      examIds: q.examIds,
      difficulty: q.difficulty,
      type: q.type,
      prompt: q.prompt,
      passage: q.passage ?? "",
      options: q.options ?? ["", ""],
      correctAnswer: q.correctAnswer ?? "",
      explanation: q.explanation ?? "",
      tags: q.tags.join("; "),
      status: q.status,
      timeLimitSeconds: q.timeLimitSeconds,
    };
    setEditing({ id, draft, stats: body.stats, attempts: body.attempts });
  }

  async function save() {
    if (!editing) return;
    setError(null);
    setNotice(null);
    const d = editing.draft;
    const body = {
      subjectId: d.subjectId,
      skillId: d.skillId || null,
      examIds: d.examIds,
      difficulty: d.difficulty,
      type: d.type,
      prompt: d.prompt,
      passage: d.passage || null,
      options: OPTION_TYPES.has(d.type) ? d.options.map((o) => o.trim()).filter(Boolean) : null,
      correctAnswer: d.correctAnswer,
      explanation: d.explanation || null,
      tags: d.tags.split(/[;,]/).map((t) => t.trim()).filter(Boolean),
      status: d.status,
      timeLimitSeconds: d.timeLimitSeconds,
    };
    const res = await fetch(editing.id ? `/api/admin/catalogue/questions/${editing.id}` : "/api/admin/catalogue/questions", {
      method: editing.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error ?? "Couldn't save the question.");
    setNotice(editing.id ? "Question saved." : "Question added.");
    if (!editing.id) setEditing({ id: null, draft: { ...emptyDraft(d.subjectId), skillId: d.skillId, examIds: d.examIds, difficulty: d.difficulty, type: d.type } });
    reload();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/catalogue/questions/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error ?? "Couldn't remove the question.");
    setNotice(data.outcome === "archived" ? "This question has answers, so it was archived instead of deleted." : "Question deleted.");
    setEditing(null);
    reload();
  }

  const set = (patch: Partial<Draft>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));
  const draftSubject = catalog?.subjects.find((s) => s.id === editing?.draft.subjectId);
  const pages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-6">
      <Link href="/admin/catalogue" className="btn-ghost btn-sm -ml-3">
        <Icon as={ArrowLeft} />
        Exam catalogue
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="headline text-3xl text-ink-950">Catalogue questions</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Each question has one subject, optional skill, one level, and optional exams (none means every exam with that subject).</p>
        </div>
        <button onClick={() => setEditing({ id: null, draft: emptyDraft(filters.subjectId) })} className="btn-primary btn-sm">
          <Icon as={Plus} />
          New question
        </button>
      </div>

      {(error || notice) && (
        <p role={error ? "alert" : "status"} className={`mt-4 rounded-md px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>
          {error ?? notice}
        </p>
      )}

      <div className="mt-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-6" role="search" aria-label="Filter questions">
        <select aria-label="Exam" className={input} value={filters.examId} onChange={(e) => setFilters({ ...filters, examId: e.target.value, page: 1 })}>
          <option value="">All exams</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select aria-label="Subject" className={input} value={filters.subjectId} onChange={(e) => setFilters({ ...filters, subjectId: e.target.value, skillId: "", page: 1 })}>
          <option value="">All subjects</option>
          {catalog?.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select aria-label="Skill" className={input} value={filters.skillId} disabled={!filterSubject} onChange={(e) => setFilters({ ...filters, skillId: e.target.value, page: 1 })}>
          <option value="">All skills</option>
          {filterSubject?.skills.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
        <select aria-label="Level" className={input} value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value, page: 1 })}>
          <option value="">All levels</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]}
            </option>
          ))}
        </select>
        <select aria-label="Status" className={input} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <label className="relative">
          <span className="sr-only">Search question text, tag or ID</span>
          <Icon as={Search} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${input} pl-9`} placeholder="Text, tag or ID" defaultValue={filters.q} onKeyDown={(e) => e.key === "Enter" && setFilters({ ...filters, q: (e.target as HTMLInputElement).value, page: 1 })} />
        </label>
      </div>

      <div className="mt-4 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_30rem]">
        <div className="min-w-0">
          <div className="sheet overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Questions</caption>
              <thead className="border-b border-slate-100 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Question</th>
                  <th className="px-3 py-3 font-semibold">Subject / skill</th>
                  <th className="px-3 py-3 font-semibold">Level</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 text-right font-semibold">Served</th>
                  <th className="px-3 py-3 text-right font-semibold">Accuracy</th>
                  <th className="px-3 py-3 text-right font-semibold">Avg time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list?.questions.map((q) => (
                  <tr key={q.id} onClick={() => open(q.id)} className={`cursor-pointer hover:bg-slate-50 ${editing?.id === q.id ? "bg-brand-50" : ""}`}>
                    <td className="max-w-md px-4 py-3">
                      <button className="line-clamp-2 text-left font-medium text-ink-950 hover:text-brand-700">{q.prompt}</button>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {TYPE_LABELS[q.type] ?? q.type}
                        {q.exams.length > 0 ? ` · ${q.exams.join(", ")}` : " · All exams"}
                        {q.tags.length > 0 && ` · #${q.tags.join(" #")}`}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      {q.subject?.name}
                      {q.catalogSkill && <span className="block text-slate-400">{q.catalogSkill.name}</span>}
                    </td>
                    <td className="px-3 py-3 text-xs">{DIFFICULTY_LABELS[q.difficulty as keyof typeof DIFFICULTY_LABELS] ?? q.difficulty}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[q.status]}`}>{q.status.charAt(0) + q.status.slice(1).toLowerCase()}</span>
                    </td>
                    <td className="num px-3 py-3 text-right text-xs">{q.stats?.timesServed ?? 0}</td>
                    <td className="num px-3 py-3 text-right text-xs">{q.stats?.accuracy == null ? "—" : `${q.stats.accuracy}%`}</td>
                    <td className="num px-3 py-3 text-right text-xs">{q.stats?.avgSeconds == null ? "—" : `${q.stats.avgSeconds}s`}</td>
                  </tr>
                ))}
                {list && list.questions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                      No catalogue questions match. Add one, or import a spreadsheet below.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {list && (
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{list.total} questions</span>
              <span className="flex items-center gap-2">
                <button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })} className="btn-ghost btn-sm">
                  Previous
                </button>
                Page {filters.page} of {pages}
                <button disabled={filters.page >= pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })} className="btn-ghost btn-sm">
                  Next
                </button>
              </span>
            </div>
          )}
          <div className="mt-6">
            <CatalogueQuestionImport onImported={reload} />
          </div>
        </div>

        {editing && catalog && (
          <form
            aria-label={editing.id ? "Edit question" : "New question"}
            className="sheet grid gap-4 p-5 xl:sticky xl:top-24"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink-950">{editing.id ? "Edit question" : "New question"}</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close" className="btn-ghost btn-sm">
                <Icon as={X} />
              </button>
            </div>
            {editing.id && <p className="num break-all text-xs text-slate-400">ID {editing.id}</p>}
            {editing.stats && (
              <dl className="grid grid-cols-4 gap-2 rounded-lg bg-slate-50 p-3 text-center text-xs">
                {(
                  [
                    ["Served", editing.stats.timesServed],
                    ["Attempts", editing.stats.attempts],
                    ["Accuracy", editing.stats.accuracy == null ? "—" : `${editing.stats.accuracy}%`],
                    ["Avg time", editing.stats.avgSeconds == null ? "—" : `${editing.stats.avgSeconds}s`],
                  ] as [string, string | number][]
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="num mt-0.5 font-semibold text-ink-950">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Subject
                <select className={`${input} mt-1`} value={editing.draft.subjectId} required onChange={(e) => set({ subjectId: e.target.value, skillId: "" })}>
                  <option value="">Choose…</option>
                  {catalog.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Skill
                <select className={`${input} mt-1`} value={editing.draft.skillId} onChange={(e) => set({ skillId: e.target.value })}>
                  <option value="">No specific skill</option>
                  {draftSubject?.skills.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Level
                <select className={`${input} mt-1`} value={editing.draft.difficulty} onChange={(e) => set({ difficulty: e.target.value })}>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {DIFFICULTY_LABELS[d]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Question type
                <select className={`${input} mt-1`} value={editing.draft.type} onChange={(e) => set({ type: e.target.value })}>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="text-xs font-semibold text-slate-600">
              Question
              <textarea className={`${input} mt-1`} rows={3} required maxLength={5000} value={editing.draft.prompt} onChange={(e) => set({ prompt: e.target.value })} />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Passage (optional)
              <textarea className={`${input} mt-1`} rows={2} maxLength={20000} value={editing.draft.passage} onChange={(e) => set({ passage: e.target.value })} />
            </label>
            {OPTION_TYPES.has(editing.draft.type) && (
              <fieldset className="grid gap-2">
                <legend className="text-xs font-semibold text-slate-600">Options</legend>
                {editing.draft.options.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <input className={input} aria-label={`Option ${i + 1}`} value={o} maxLength={1000} onChange={(e) => set({ options: editing.draft.options.map((x, j) => (j === i ? e.target.value : x)) })} />
                    {editing.draft.type !== "MULTI_SELECT" && editing.draft.type !== "ORDERING" && (
                      <button type="button" onClick={() => set({ correctAnswer: o })} disabled={!o.trim()} className={`btn-sm flex-none ${editing.draft.correctAnswer === o && o ? "btn-primary" : "btn-secondary"}`}>
                        Correct
                      </button>
                    )}
                  </div>
                ))}
                {editing.draft.options.length < 12 && (
                  <button type="button" onClick={() => set({ options: [...editing.draft.options, ""] })} className="btn-ghost btn-sm justify-self-start">
                    <Icon as={Plus} />
                    Add option
                  </button>
                )}
              </fieldset>
            )}
            <label className="text-xs font-semibold text-slate-600">
              Correct answer
              <input className={`${input} mt-1`} required maxLength={5000} value={editing.draft.correctAnswer} onChange={(e) => set({ correctAnswer: e.target.value })} />
              <span className="mt-1 block font-normal text-slate-400">
                {editing.draft.type === "NUMERIC_ENTRY"
                  ? 'JSON, e.g. {"value": 42} or {"value": 3.5, "tolerance": 0.1}'
                  : editing.draft.type === "GAP_FILL"
                    ? 'JSON: accepted answers per blank, e.g. [["a","an"],["comfortable"]]'
                    : editing.draft.type === "MULTI_SELECT" || editing.draft.type === "ORDERING"
                      ? 'JSON list, e.g. ["first","second"]'
                      : editing.draft.type.includes("NOT_GIVEN")
                        ? "TRUE / FALSE / NOT_GIVEN (or YES / NO / NOT_GIVEN)"
                        : "Must match one option exactly (or press Correct beside it)."}
              </span>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Explanation
              <textarea className={`${input} mt-1`} rows={3} maxLength={5000} value={editing.draft.explanation} onChange={(e) => set({ explanation: e.target.value })} />
            </label>
            <fieldset>
              <legend className="text-xs font-semibold text-slate-600">Only for these exams (leave empty for every exam with this subject)</legend>
              <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {exams.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 py-0.5 text-xs text-ink-950">
                    <input type="checkbox" checked={editing.draft.examIds.includes(e.id)} onChange={(ev) => set({ examIds: ev.target.checked ? [...editing.draft.examIds, e.id] : editing.draft.examIds.filter((x) => x !== e.id) })} />
                    {e.name} <span className="text-slate-400">{e.category}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-slate-600 sm:col-span-1">
                Status
                <select className={`${input} mt-1`} value={editing.draft.status} onChange={(e) => set({ status: e.target.value })}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Time (seconds)
                <input type="number" className={`${input} mt-1`} min={10} max={3600} value={editing.draft.timeLimitSeconds} onChange={(e) => set({ timeLimitSeconds: Number(e.target.value) })} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Tags
                <input className={`${input} mt-1`} placeholder="a; b" value={editing.draft.tags} onChange={(e) => set({ tags: e.target.value })} />
              </label>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary btn-sm">{editing.id ? "Save" : "Add question"}</button>
              {editing.id && (
                <button type="button" onClick={() => remove(editing.id!)} className="btn-ghost btn-sm text-red-700">
                  <Icon as={Trash2} />
                  Delete
                </button>
              )}
            </div>
            {editing.attempts && editing.attempts.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-600">Latest attempts</h3>
                <ul className="mt-1 max-h-48 divide-y divide-slate-100 overflow-y-auto text-xs">
                  {editing.attempts.map((a) => (
                    <li key={a.id} className="flex justify-between gap-2 py-1.5">
                      <span className="truncate text-slate-600">{a.user.name ?? a.user.email}</span>
                      <span className="num flex-none text-slate-500">
                        {a.isCorrect === null ? "—" : a.isCorrect ? "Right" : "Wrong"} · {a.timeTakenSeconds}s · {new Date(a.createdAt).toLocaleDateString("en-GB")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
