"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Star, Trash2 } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { PRACTICE_MODES } from "@/lib/practice-taxonomy";

interface ExamLink {
  subjectId: string;
  mockQuestionCount: number;
  sectionName: string | null;
}
interface Exam {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  keywords: string | null;
  isPopular: boolean;
  groupName: string | null;
  isActive: boolean;
  sortOrder: number;
  mockMinutes: number | null;
  categoryId: string;
  subjects: ExamLink[];
  _count: { tests: number; questions: number };
}
interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  exams: Exam[];
}
interface Skill {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  _count: { questions: number };
}
interface Subject {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  legacyCategory: string | null;
  isActive: boolean;
  sortOrder: number;
  skills: Skill[];
  questionCount: number;
  _count: { exams: number };
}

const n = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** A delete waiting for the admin to confirm it. */
interface PendingDelete {
  title: string;
  detail: string;
  run: () => Promise<unknown>;
}

type Selection = { kind: "category"; id: string | null } | { kind: "exam"; id: string | null; categoryId: string } | { kind: "subject"; id: string | null } | null;

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink-950 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

export default function AdminCataloguePage() {
  const [tab, setTab] = useState<"exams" | "subjects">("exams");
  const [data, setData] = useState<{ categories: Category[]; subjects: Subject[] } | null>(null);
  const [selected, setSelected] = useState<Selection>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [pendingBusy, setPendingBusy] = useState(false);
  const allExams = useMemo(() => data?.categories.flatMap((c) => c.exams) ?? [], [data]);

  async function confirmPending() {
    if (!pending) return;
    setPendingBusy(true);
    await pending.run();
    setPendingBusy(false);
    setPending(null);
  }

  function deleteCategory(c: Category) {
    setPending({
      title: `Delete the category "${c.name}"?`,
      detail: c.exams.length
        ? `Its ${n(c.exams.length, "exam")} will be deleted too. Questions stay in the question bank, and candidates keep their past results.`
        : "It has no exams.",
      run: () =>
        save(`/api/admin/catalogue/categories/${c.id}`, "DELETE", undefined, c.exams.length ? `Category "${c.name}" deleted, with its ${n(c.exams.length, "exam")}.` : `Category "${c.name}" deleted.`, () =>
          setSelected((cur) => (cur && cur.kind !== "subject" && (cur.kind === "category" ? cur.id : cur.categoryId) === c.id ? null : cur))
        ),
    });
  }

  function deleteExam(e: Exam) {
    setPending({
      title: `Delete the exam "${e.name}"?`,
      detail: `Its sections and question links go with it. The questions stay in the question bank, and candidates keep their past results (${n(e._count.tests, "test")}).`,
      run: () => save(`/api/admin/catalogue/exams/${e.id}`, "DELETE", undefined, `Exam "${e.name}" deleted.`, () => setSelected((cur) => (cur?.kind === "exam" && cur.id === e.id ? { kind: "category", id: cur.categoryId } : cur))),
    });
  }

  function deleteSubject(sub: Subject) {
    setPending({
      title: `Delete the subject "${sub.name}"?`,
      detail: `Its ${n(sub.skills.length, "skill")} go with it, and it is removed from ${n(sub._count.exams, "exam")}. Its ${n(sub.questionCount, "question")} stay in the question bank, no longer linked to this subject.`,
      run: () => save(`/api/admin/catalogue/subjects/${sub.id}`, "DELETE", undefined, `Subject "${sub.name}" deleted.`, () => setSelected((cur) => (cur?.kind === "subject" && cur.id === sub.id ? null : cur))),
    });
  }

  function deleteSkill(k: Skill) {
    setPending({
      title: `Delete the skill "${k.name}"?`,
      detail: `Its ${n(k._count.questions, "question")} stay in the question bank, no longer linked to this skill.`,
      run: () => save(`/api/admin/catalogue/skills/${k.id}`, "DELETE", undefined, `Skill "${k.name}" deleted.`),
    });
  }

  function toggleExam(e: Exam) {
    return save(`/api/admin/catalogue/exams/${e.id}`, "PATCH", { isActive: !e.isActive }, `"${e.name}" is now ${e.isActive ? "off (hidden from candidates)" : "on (visible to candidates)"}.`);
  }

  const load = useCallback(async () => {
    try {
      setData(await send("/api/admin/catalogue", "GET"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    send("/api/admin/catalogue", "GET")
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // `after` runs as soon as the change is saved - before the (slow) reload -
  // so a late reload can never pull the admin back to something they left.
  async function save(url: string, method: string, body: unknown, message: string, after?: (res: { item?: { id: string; categoryId?: string } }) => void) {
    setError(null);
    setNotice(null);
    try {
      const res = await send(url, method, body);
      after?.(res);
      setNotice(message);
      await load();
      return res;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }

  if (!data) {
    return <div className="mx-auto max-w-6xl px-5 py-10 text-sm text-slate-500">{error ?? "Loading the catalogue…"}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="headline mt-2 text-3xl text-ink-950">Exam catalogue</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Category → Exam → Subject → Skill. Subjects and skills are shared, so one Reasoning subject serves every exam that lists it.</p>
        </div>
        <Link href="/admin/catalogue/questions" className="btn-primary btn-sm">
          Manage questions
        </Link>
      </div>

      <div role="tablist" aria-label="Catalogue" className="mt-6 flex gap-2">
        {(
          [
            ["exams", "Categories & exams"],
            ["subjects", "Subjects & skills"],
          ] as const
        ).map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setSelected(null); }} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${tab === key ? "border-ink-950 bg-ink-950 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {(error || notice) && (
        <p role={error ? "alert" : "status"} className={`mt-4 rounded-md px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>
          {error ?? notice}
        </p>
      )}

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 px-4" onClick={() => !pendingBusy && setPending(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-delete-title" className="sheet w-full max-w-md p-5" onClick={(ev) => ev.stopPropagation()}>
            <h2 id="confirm-delete-title" className="font-semibold text-ink-950">
              {pending.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{pending.detail}</p>
            <p className="mt-2 text-sm font-medium text-red-700">This can&apos;t be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPending(null)} disabled={pendingBusy} className="btn-ghost btn-sm">
                Cancel
              </button>
              <button type="button" onClick={confirmPending} disabled={pendingBusy} className="btn-sm inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                <Icon as={Trash2} />
                {pendingBusy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "exams" ? (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="sheet overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink-950">Categories</h2>
              <button onClick={() => setSelected({ kind: "category", id: null })} className="btn-ghost btn-sm">
                <Icon as={Plus} />
                Add
              </button>
            </div>
            <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
              {data.categories.map((c) => {
                const open = (selected?.kind === "category" && selected.id === c.id) || (selected?.kind === "exam" && selected.categoryId === c.id);
                return (
                  <li key={c.id}>
                    <button onClick={() => setSelected({ kind: "category", id: c.id })} className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm ${open ? "bg-brand-50 font-semibold text-brand-800" : "text-ink-950 hover:bg-slate-50"}`}>
                      <span className={c.isActive ? "" : "text-slate-400 line-through"}>{c.name}</span>
                      <span className="num text-xs text-slate-400">{c.exams.length}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="min-w-0">
            {selected?.kind === "category" && (
              <CategoryEditor
                key={selected.id ?? "new"}
                category={data.categories.find((c) => c.id === selected.id) ?? null}
                onSave={(body, id) =>
                  save(id ? `/api/admin/catalogue/categories/${id}` : "/api/admin/catalogue/categories", id ? "PATCH" : "POST", body, "Category saved.", (res) => {
                    if (res.item && !id) setSelected((cur) => (cur?.kind === "category" && cur.id === null ? { kind: "category", id: res.item!.id } : cur));
                  })
                }
                onDelete={deleteCategory}
                onEditExam={(examId, categoryId) => setSelected({ kind: "exam", id: examId, categoryId })}
                onToggleExam={toggleExam}
                onDeleteExam={deleteExam}
              />
            )}
            {selected?.kind === "exam" && (
              <ExamEditor
                key={selected.id ?? "new"}
                exam={allExams.find((e) => e.id === selected.id) ?? null}
                categoryId={selected.categoryId}
                categories={data.categories}
                subjects={data.subjects}
                onBack={() => setSelected({ kind: "category", id: selected.categoryId })}
                onSave={(body, id) =>
                  save(id ? `/api/admin/catalogue/exams/${id}` : "/api/admin/catalogue/exams", id ? "PATCH" : "POST", body, "Exam saved.", (res) => {
                    if (res.item && !id) setSelected((cur) => (cur?.kind === "exam" && cur.id === null ? { kind: "exam", id: res.item!.id, categoryId: res.item!.categoryId ?? cur.categoryId } : cur));
                  })
                }
                onDelete={deleteExam}
              />
            )}
            {!selected && <p className="sheet p-6 text-sm text-slate-500">Choose a category to edit it and its exams, or add a new one.</p>}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="sheet overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink-950">Subjects</h2>
              <button onClick={() => setSelected({ kind: "subject", id: null })} className="btn-ghost btn-sm">
                <Icon as={Plus} />
                Add
              </button>
            </div>
            <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
              {data.subjects.map((s) => (
                <li key={s.id}>
                  <button onClick={() => setSelected({ kind: "subject", id: s.id })} className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm ${selected?.kind === "subject" && selected.id === s.id ? "bg-brand-50 font-semibold text-brand-800" : "text-ink-950 hover:bg-slate-50"}`}>
                    <span className={s.isActive ? "" : "text-slate-400 line-through"}>{s.name}</span>
                    <span className="num text-xs text-slate-400">{s.questionCount}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0">
            {selected?.kind === "subject" ? (
              <SubjectEditor
                key={selected.id ?? "new"}
                subject={data.subjects.find((s) => s.id === selected.id) ?? null}
                onSave={(body, id) =>
                  save(id ? `/api/admin/catalogue/subjects/${id}` : "/api/admin/catalogue/subjects", id ? "PATCH" : "POST", body, "Subject saved.", (res) => {
                    if (res.item && !id) setSelected((cur) => (cur?.kind === "subject" && cur.id === null ? { kind: "subject", id: res.item!.id } : cur));
                  })
                }
                onDelete={deleteSubject}
                onSkill={(method, body, id) => save(id ? `/api/admin/catalogue/skills/${id}` : "/api/admin/catalogue/skills", method, body, "Skill saved.")}
                onDeleteSkill={deleteSkill}
              />
            ) : (
              <div className="sheet p-6 text-sm leading-relaxed text-slate-600">
                <p>Choose a subject to edit it and its skills, or add a new one.</p>
                <p className="mt-3">
                  <span className="font-semibold text-ink-950">Levels:</span> every subject and skill uses the same four levels: Beginner, Intermediate, Advanced and Expert. A question belongs to exactly one level, and each level&apos;s questions are separate. Free plans include Beginner and Intermediate.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** On/Off switch that saves straight away. */
function OnOffSwitch({ on, label, busy, onToggle }: { on: boolean; label: string; busy?: boolean; onToggle: () => void }) {
  return (
    <span className="flex flex-none items-center gap-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={busy}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-60 ${on ? "bg-green-600" : "bg-slate-300"}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
      <span className={`w-6 text-xs font-semibold ${on ? "text-green-700" : "text-slate-500"}`}>{on ? "On" : "Off"}</span>
    </span>
  );
}

function ActiveToggle({ value, onChange, label = "Visible to candidates" }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-950">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
      {label}
    </label>
  );
}

function CategoryEditor({ category, onSave, onDelete, onEditExam, onToggleExam, onDeleteExam }: { category: Category | null; onSave: (body: object, id?: string) => unknown; onDelete: (c: Category) => void; onEditExam: (examId: string | null, categoryId: string) => void; onToggleExam: (e: Exam) => Promise<unknown>; onDeleteExam: (e: Exam) => void }) {
  const [toggling, setToggling] = useState<string | null>(null);
  const [form, setForm] = useState({ name: category?.name ?? "", slug: category?.slug ?? "", description: category?.description ?? "", sortOrder: category?.sortOrder ?? 0, isActive: category?.isActive ?? true });
  return (
    <div className="grid gap-6">
      <form
        className="sheet grid gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...form, slug: form.slug || undefined, description: form.description || null }, category?.id);
        }}
      >
        <h2 className="font-semibold text-ink-950">{category ? "Edit category" : "New category"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} />
          </Field>
          <Field label="Short name (in the web address)" hint="Leave empty to make one from the name.">
            <input className={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} maxLength={60} />
          </Field>
        </div>
        <Field label="Description">
          <textarea className={input} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} />
        </Field>
        <div className="flex flex-wrap items-end gap-6">
          <Field label="Order">
            <input type="number" className={`${input} w-24`} value={form.sortOrder} min={0} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          </Field>
          <ActiveToggle value={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />
        </div>
        <div className="flex gap-2">
          <button className="btn-primary btn-sm">Save</button>
          {category && (
            <button type="button" onClick={() => onDelete(category)} className="btn-ghost btn-sm text-red-700">
              <Icon as={Trash2} />
              Delete category
            </button>
          )}
        </div>
      </form>

      {category && (
        <div className="sheet overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink-950">Exams in {category.name}</h2>
            <button onClick={() => onEditExam(null, category.id)} className="btn-ghost btn-sm">
              <Icon as={Plus} />
              Add exam
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {category.exams.map((e) => (
              <li key={e.id} className="flex items-center gap-2 pr-3 hover:bg-slate-50">
                <button onClick={() => onEditExam(e.id, category.id)} className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 pl-5 text-left text-sm">
                  <span className={`flex min-w-0 items-center gap-2 ${e.isActive ? "text-ink-950" : "text-slate-400"}`}>
                    {e.isPopular && <Icon as={Star} size="xs" className="text-amber-500" />}
                    {e.name}
                  </span>
                  <span className="num text-xs text-slate-400">
                    {e.subjects.length} subjects · {e._count.tests} tests
                  </span>
                </button>
                <OnOffSwitch
                  on={e.isActive}
                  label={`${e.name} visible to candidates`}
                  busy={toggling === e.id}
                  onToggle={async () => {
                    setToggling(e.id);
                    await onToggleExam(e);
                    setToggling(null);
                  }}
                />
                <button type="button" onClick={() => onDeleteExam(e)} aria-label={`Delete ${e.name}`} title="Delete exam" className="btn-ghost btn-sm text-red-700">
                  <Icon as={Trash2} />
                </button>
              </li>
            ))}
            {category.exams.length === 0 && <li className="px-5 py-3 text-sm text-slate-500">No exams yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function ExamEditor({ exam, categoryId, categories, subjects, onBack, onSave, onDelete }: { exam: Exam | null; categoryId: string; categories: Category[]; subjects: Subject[]; onBack: () => void; onSave: (body: object, id?: string) => unknown; onDelete: (e: Exam) => void }) {
  const [form, setForm] = useState({
    categoryId: exam?.categoryId ?? categoryId,
    name: exam?.name ?? "",
    slug: exam?.slug ?? "",
    description: exam?.description ?? "",
    keywords: exam?.keywords ?? "",
    isPopular: exam?.isPopular ?? false,
    groupName: exam?.groupName ?? "",
    isActive: exam?.isActive ?? true,
    sortOrder: exam?.sortOrder ?? 0,
    mockMinutes: exam?.mockMinutes ?? 60,
  });
  const [links, setLinks] = useState<ExamLink[]>(exam?.subjects ?? []);
  const linked = useMemo(() => new Map(links.map((l) => [l.subjectId, l])), [links]);
  const total = links.reduce((s, l) => s + l.mockQuestionCount, 0);

  return (
    <form
      className="sheet grid gap-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...form, slug: form.slug || undefined, description: form.description || null, keywords: form.keywords || null, groupName: form.groupName.trim() || null, mockMinutes: form.mockMinutes || null, subjects: links }, exam?.id);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink-950">{exam ? `Edit ${exam.name}` : "New exam"}</h2>
        <button type="button" onClick={onBack} className="btn-ghost btn-sm">
          Back to category
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} />
        </Field>
        <Field label="Short name (in the web address)" hint="Leave empty to make one from the name.">
          <input className={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} maxLength={60} />
        </Field>
        <Field label="Category">
          <select className={input} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Group (sub-heading)" hint="e.g. Assessment providers or Company assessments. Empty: no sub-heading.">
          <input className={input} list="exam-groups" value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })} maxLength={60} />
          <datalist id="exam-groups">
            {[...new Set(categories.flatMap((c) => c.exams.map((x) => x.groupName)).filter(Boolean))].map((g) => (
              <option key={g} value={g!} />
            ))}
          </datalist>
        </Field>
        <Field label="Search words" hint="Other names candidates might type, e.g. national qualifier test">
          <input className={input} value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} maxLength={300} />
        </Field>
      </div>
      <Field label="Description">
        <textarea className={input} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} />
      </Field>
      <div className="flex flex-wrap items-end gap-6">
        <Field label="Order">
          <input type="number" className={`${input} w-24`} min={0} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
        </Field>
        <Field label="Full mock (minutes)">
          <input type="number" className={`${input} w-28`} min={1} max={600} value={form.mockMinutes ?? ""} onChange={(e) => setForm({ ...form, mockMinutes: Number(e.target.value) })} />
        </Field>
        <ActiveToggle value={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />
        <ActiveToggle value={form.isPopular} onChange={(isPopular) => setForm({ ...form, isPopular })} label="Show in Featured assessments" />
      </div>

      <fieldset className="rounded-xl border border-slate-200">
        <legend className="ml-3 px-1 text-xs font-semibold text-slate-600">Subjects and full-mock questions ({total} in total)</legend>
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
          {subjects.map((s) => {
            const link = linked.get(s.id);
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(link)}
                    onChange={(e) => setLinks(e.target.checked ? [...links, { subjectId: s.id, mockQuestionCount: 10, sectionName: null }] : links.filter((l) => l.subjectId !== s.id))}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className={s.isActive ? "text-ink-950" : "text-slate-400"}>{s.name}</span>
                </label>
                {link && (
                  <span className="flex gap-2">
                  <input
                    aria-label={`${s.name} section name`}
                    placeholder="Section name (optional)"
                    className={`${input} w-48 py-1`}
                    maxLength={80}
                    value={link.sectionName ?? ""}
                    onChange={(e) => setLinks(links.map((l) => (l.subjectId === s.id ? { ...l, sectionName: e.target.value || null } : l)))}
                  />
                  <input
                    type="number"
                    aria-label={`${s.name} questions in the full mock`}
                    className={`${input} w-20 py-1`}
                    min={0}
                    max={300}
                    value={link.mockQuestionCount}
                    onChange={(e) => setLinks(links.map((l) => (l.subjectId === s.id ? { ...l, mockQuestionCount: Number(e.target.value) } : l)))}
                  />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="flex gap-2">
        <button className="btn-primary btn-sm">Save exam</button>
        {exam && (
          <button type="button" onClick={() => onDelete(exam)} className="btn-ghost btn-sm text-red-700">
            <Icon as={Trash2} />
            Delete exam
          </button>
        )}
      </div>
    </form>
  );
}

function SubjectEditor({ subject, onSave, onDelete, onSkill, onDeleteSkill }: { subject: Subject | null; onSave: (body: object, id?: string) => unknown; onDelete: (s: Subject) => void; onSkill: (method: string, body: object | undefined, id?: string) => unknown; onDeleteSkill: (k: Skill) => void }) {
  const [form, setForm] = useState({ name: subject?.name ?? "", slug: subject?.slug ?? "", description: subject?.description ?? "", legacyCategory: subject?.legacyCategory ?? "", sortOrder: subject?.sortOrder ?? 0, isActive: subject?.isActive ?? true });
  const [newSkill, setNewSkill] = useState("");

  return (
    <div className="grid gap-6">
      <form
        className="sheet grid gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...form, slug: form.slug || undefined, description: form.description || null, legacyCategory: form.legacyCategory || null }, subject?.id);
        }}
      >
        <h2 className="font-semibold text-ink-950">{subject ? "Edit subject" : "New subject"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} />
          </Field>
          <Field label="Short name (for imports)" hint="Used in the spreadsheet's subject column.">
            <input className={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} maxLength={60} />
          </Field>
        </div>
        <Field label="Description">
          <textarea className={input} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} />
        </Field>
        <div className="flex flex-wrap items-end gap-6">
          <Field label="Also use the older question bank" hint="Its untagged questions count as this subject's.">
            <select className={input} value={form.legacyCategory} onChange={(e) => setForm({ ...form, legacyCategory: e.target.value })}>
              <option value="">None</option>
              {PRACTICE_MODES.map((m) => (
                <option key={m.category} value={m.category}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Order">
            <input type="number" className={`${input} w-24`} min={0} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          </Field>
          <ActiveToggle value={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />
        </div>
        {subject && (
          <p className="text-xs text-slate-500">
            {subject.questionCount} tagged questions · used by {subject._count.exams} exams
          </p>
        )}
        <div className="flex gap-2">
          <button className="btn-primary btn-sm">Save</button>
          {subject && (
            <button type="button" onClick={() => onDelete(subject)} className="btn-ghost btn-sm text-red-700">
              <Icon as={Trash2} />
              Delete subject
            </button>
          )}
        </div>
      </form>

      {subject && (
        <div className="sheet overflow-hidden">
          <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-ink-950">Skills in {subject.name}</h2>
          <ul className="divide-y divide-slate-100">
            {subject.skills.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className={k.isActive ? "text-ink-950" : "text-slate-400 line-through"}>
                  {k.name} <span className="num text-xs text-slate-400">({k.slug}) · {k._count.questions} questions</span>
                </span>
                <span className="flex gap-2">
                  <button onClick={() => onSkill("PATCH", { isActive: !k.isActive }, k.id)} className="btn-ghost btn-sm">
                    {k.isActive ? "Switch off" : "Switch on"}
                  </button>
                  <button
                    onClick={() => {
                      const name = window.prompt("Rename skill", k.name);
                      if (name?.trim()) onSkill("PATCH", { name: name.trim() }, k.id);
                    }}
                    className="btn-ghost btn-sm"
                  >
                    Rename
                  </button>
                  <button onClick={() => onDeleteSkill(k)} aria-label={`Delete ${k.name}`} className="btn-ghost btn-sm text-red-700">
                    <Icon as={Trash2} />
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <form
            className="flex gap-2 border-t border-slate-100 px-5 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newSkill.trim()) return;
              onSkill("POST", { subjectId: subject.id, name: newSkill.trim(), sortOrder: subject.skills.length });
              setNewSkill("");
            }}
          >
            <input className={input} placeholder="New skill name" aria-label="New skill name" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} maxLength={120} />
            <button className="btn-secondary btn-sm flex-none">
              <Icon as={Plus} />
              Add skill
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
