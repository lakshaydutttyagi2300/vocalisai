"use client";

import { useCallback, useEffect, useState } from "react";

// P1-G: admin CRUD for the exam catalogue - families, versions (variants),
// papers and parts. Every change goes through /api/admin/exam-catalogue,
// which validates it and writes the Activity Log. Option lists come from
// that same endpoint, so the form never offers a value the server rejects.

interface Part {
  id: string;
  order: number;
  name: string;
  instructions: string | null;
  prepSeconds: number | null;
  responseSeconds: number | null;
  _count: { mockTestTemplateSections: number };
}
interface Paper {
  id: string;
  order: number;
  name: string;
  durationSeconds: number;
  instructions: string | null;
  navigationMode: string;
  allowReview: boolean;
  parts: Part[];
}
interface Variant {
  id: string;
  slug: string;
  name: string;
  scoreScale: string;
  isActive: boolean;
  _count: { mockTestTemplates: number };
  papers: Paper[];
}
interface Family {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  variants: Variant[];
}
interface Catalogue {
  families: Family[];
  availableFamilies: { slug: string; name: string; description: string }[];
  scoreScales: string[];
  navigationModes: string[];
}

const NAV_LABELS: Record<string, string> = {
  LOCKED_SEQUENTIAL: "Forward only (no going back)",
  FREE_WITHIN_SECTION: "Free navigation within the paper",
};

type Api = (method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown) => Promise<boolean>;

const input = "rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none";
const smallBtn = "btn-secondary px-2 py-1 text-xs";
const dangerBtn = "rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50";

export default function AdminExamsPage() {
  const [data, setData] = useState<Catalogue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newFamily, setNewFamily] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/exam-catalogue");
    const body = await res.json().catch(() => null);
    if (res.ok) setData(body);
    else setError(body?.error ?? "Couldn't load the exam catalogue.");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const api: Api = async (method, path, body) => {
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/admin/exam-catalogue/${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "That change couldn't be saved.");
      return false;
    }
    setNotice(method === "DELETE" ? "Deleted." : "Saved.");
    await load();
    return true;
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink-950">Exam catalogue</h1>
      <p className="mt-1 text-sm text-slate-600">
        Set up exam formats for the new exam screen: a <strong>family</strong> (e.g. IELTS-style), its <strong>versions</strong> (e.g.
        Academic), each version&apos;s timed <strong>papers</strong>, and each paper&apos;s <strong>parts</strong>. Then link a mock-test
        template to a version in <a className="text-brand-700 underline" href="/admin/templates">Templates</a>.
      </p>

      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">{notice}</p>}

      {!data && !error && <div className="mt-6 h-40 animate-pulse rounded-lg bg-slate-200" />}

      {data && (
        <>
          <div className="card mt-6 flex flex-wrap items-end gap-3 p-4">
            <label className="text-sm">
              <span className="block text-slate-600">Add an exam family</span>
              <select aria-label="Exam family to add" value={newFamily} onChange={(e) => setNewFamily(e.target.value)} className={`${input} mt-1`}>
                <option value="">Choose...</option>
                {data.availableFamilies.map((f) => (
                  <option key={f.slug} value={f.slug}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!newFamily}
              onClick={async () => {
                if (await api("POST", "families", { slug: newFamily })) setNewFamily("");
              }}
              className="btn-primary text-sm disabled:opacity-50"
            >
              Add family
            </button>
            {data.availableFamilies.length === 0 && <span className="text-xs text-slate-500">Every exam family has been added.</span>}
          </div>

          <div className="mt-6 space-y-6">
            {data.families.length === 0 && <p className="text-sm text-slate-500">No exam families yet. Add one above to get started.</p>}
            {data.families.map((f) => (
              <FamilyCard key={f.id} family={f} catalogue={data} api={api} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FamilyCard({ family, catalogue, api }: { family: Family; catalogue: Catalogue; api: Api }) {
  const [adding, setAdding] = useState({ slug: "", name: "", scoreScale: catalogue.scoreScales[0] ?? "" });

  return (
    <section className="card p-5" aria-label={`Exam family ${family.name}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-900">{family.name}</h2>
          {family.description && <p className="text-xs text-slate-500">{family.description}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" className={smallBtn} onClick={() => api("PATCH", `families/${family.id}`, { isActive: !family.isActive })}>
            {family.isActive ? "Deactivate" : "Activate"}
          </button>
          <button
            type="button"
            className={dangerBtn}
            onClick={() => confirm(`Delete "${family.name}" and everything inside it?`) && api("DELETE", `families/${family.id}`)}
          >
            Delete family
          </button>
        </div>
      </div>
      {!family.isActive && <p className="mt-1 text-xs font-semibold text-amber-700">Inactive</p>}

      <div className="mt-4 space-y-4">
        {family.variants.map((v) => (
          <VariantCard key={v.id} variant={v} catalogue={catalogue} api={api} />
        ))}
      </div>

      <form
        className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await api("POST", "variants", { familyId: family.id, ...adding })) setAdding({ ...adding, slug: "", name: "" });
        }}
      >
        <span className="w-full text-xs font-semibold uppercase tracking-wide text-slate-500">Add a version</span>
        <input aria-label="Version name" placeholder="Name (e.g. Academic)" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} className={input} />
        <input aria-label="Version short code" placeholder="Short code (e.g. ACADEMIC)" value={adding.slug} onChange={(e) => setAdding({ ...adding, slug: e.target.value.toUpperCase() })} className={input} />
        <select aria-label="Version score scale" value={adding.scoreScale} onChange={(e) => setAdding({ ...adding, scoreScale: e.target.value })} className={input}>
          {catalogue.scoreScales.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary px-3 py-1 text-sm">
          Add version
        </button>
      </form>
    </section>
  );
}

function VariantCard({ variant, catalogue, api }: { variant: Variant; catalogue: Catalogue; api: Api }) {
  const [edit, setEdit] = useState({ name: variant.name, slug: variant.slug, scoreScale: variant.scoreScale });
  const [adding, setAdding] = useState({ name: "", minutes: 30, navigationMode: "LOCKED_SEQUENTIAL", allowReview: false, instructions: "" });

  return (
    <div className="rounded-lg border border-slate-200 p-4" aria-label={`Version ${variant.name}`}>
      <div className="flex flex-wrap items-end gap-2">
        <input aria-label="Version name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={`${input} font-semibold`} />
        <input aria-label="Version short code" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value.toUpperCase() })} className={input} />
        <select aria-label="Version score scale" value={edit.scoreScale} onChange={(e) => setEdit({ ...edit, scoreScale: e.target.value })} className={input}>
          {catalogue.scoreScales.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" className={smallBtn} onClick={() => api("PATCH", `variants/${variant.id}`, edit)}>
          Save
        </button>
        <button type="button" className={smallBtn} onClick={() => api("PATCH", `variants/${variant.id}`, { isActive: !variant.isActive })}>
          {variant.isActive ? "Deactivate" : "Activate"}
        </button>
        <button type="button" className={dangerBtn} onClick={() => confirm(`Delete version "${variant.name}"?`) && api("DELETE", `variants/${variant.id}`)}>
          Delete
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Used by {variant._count.mockTestTemplates} template{variant._count.mockTestTemplates === 1 ? "" : "s"}
        {!variant.isActive && " · Inactive"}
      </p>

      <div className="mt-3 space-y-3">
        {variant.papers.map((p) => (
          <PaperCard key={p.id} paper={p} catalogue={catalogue} api={api} />
        ))}
      </div>

      <form
        className="mt-3 flex flex-wrap items-end gap-2 rounded-md bg-slate-50 p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await api("POST", "papers", {
            variantId: variant.id,
            name: adding.name,
            durationSeconds: Math.round(adding.minutes * 60),
            navigationMode: adding.navigationMode,
            allowReview: adding.allowReview,
            instructions: adding.instructions,
          });
          if (ok) setAdding({ ...adding, name: "", instructions: "" });
        }}
      >
        <span className="w-full text-xs font-semibold uppercase tracking-wide text-slate-500">Add a paper</span>
        <input aria-label="Paper name" placeholder="Name (e.g. Listening)" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} className={input} />
        <label className="text-xs text-slate-600">
          Minutes{" "}
          <input aria-label="Paper minutes" type="number" min={1} value={adding.minutes} onChange={(e) => setAdding({ ...adding, minutes: Number(e.target.value) })} className={`${input} w-20`} />
        </label>
        <select aria-label="Paper navigation" value={adding.navigationMode} onChange={(e) => setAdding({ ...adding, navigationMode: e.target.value })} className={input}>
          {catalogue.navigationModes.map((m) => (
            <option key={m} value={m}>
              {NAV_LABELS[m] ?? m}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input type="checkbox" checked={adding.allowReview} onChange={(e) => setAdding({ ...adding, allowReview: e.target.checked })} />
          Review screen
        </label>
        <input aria-label="Paper instructions" placeholder="Instructions (optional)" value={adding.instructions} onChange={(e) => setAdding({ ...adding, instructions: e.target.value })} className={`${input} min-w-[16rem] flex-1`} />
        <button type="submit" className="btn-primary px-3 py-1 text-sm">
          Add paper
        </button>
      </form>
    </div>
  );
}

function PaperCard({ paper, catalogue, api }: { paper: Paper; catalogue: Catalogue; api: Api }) {
  const [edit, setEdit] = useState({
    name: paper.name,
    minutes: paper.durationSeconds / 60,
    navigationMode: paper.navigationMode,
    allowReview: paper.allowReview,
    instructions: paper.instructions ?? "",
    order: paper.order,
  });
  const [adding, setAdding] = useState({ name: "", prepSeconds: "", responseSeconds: "", instructions: "" });

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3" aria-label={`Paper ${paper.name}`}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-600">
          #<input aria-label="Paper order" type="number" min={1} value={edit.order} onChange={(e) => setEdit({ ...edit, order: Number(e.target.value) })} className={`${input} w-14`} />
        </label>
        <input aria-label="Paper name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={`${input} font-medium`} />
        <label className="text-xs text-slate-600">
          Minutes{" "}
          <input aria-label="Paper minutes" type="number" min={1} value={edit.minutes} onChange={(e) => setEdit({ ...edit, minutes: Number(e.target.value) })} className={`${input} w-20`} />
        </label>
        <select aria-label="Paper navigation" value={edit.navigationMode} onChange={(e) => setEdit({ ...edit, navigationMode: e.target.value })} className={input}>
          {catalogue.navigationModes.map((m) => (
            <option key={m} value={m}>
              {NAV_LABELS[m] ?? m}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input type="checkbox" checked={edit.allowReview} onChange={(e) => setEdit({ ...edit, allowReview: e.target.checked })} />
          Review screen
        </label>
        <button
          type="button"
          className={smallBtn}
          onClick={() =>
            api("PATCH", `papers/${paper.id}`, {
              name: edit.name,
              durationSeconds: Math.round(edit.minutes * 60),
              navigationMode: edit.navigationMode,
              allowReview: edit.allowReview,
              instructions: edit.instructions,
              order: edit.order,
            })
          }
        >
          Save
        </button>
        <button type="button" className={dangerBtn} onClick={() => confirm(`Delete paper "${paper.name}"?`) && api("DELETE", `papers/${paper.id}`)}>
          Delete
        </button>
      </div>
      <textarea
        aria-label="Paper instructions"
        placeholder="Instructions shown before this paper (optional)"
        value={edit.instructions}
        onChange={(e) => setEdit({ ...edit, instructions: e.target.value })}
        rows={2}
        className={`${input} mt-2 w-full`}
      />

      <ul className="mt-2 space-y-1.5">
        {paper.parts.map((part) => (
          <PartRow key={part.id} part={part} api={api} />
        ))}
      </ul>

      <form
        className="mt-2 flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await api("POST", "parts", {
            paperId: paper.id,
            name: adding.name,
            instructions: adding.instructions,
            prepSeconds: adding.prepSeconds === "" ? null : Number(adding.prepSeconds),
            responseSeconds: adding.responseSeconds === "" ? null : Number(adding.responseSeconds),
          });
          if (ok) setAdding({ name: "", prepSeconds: "", responseSeconds: "", instructions: "" });
        }}
      >
        <input aria-label="Part name" placeholder="New part name (e.g. Part 1)" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} className={input} />
        <input aria-label="Part prep seconds" type="number" min={0} placeholder="Prep sec (speaking)" value={adding.prepSeconds} onChange={(e) => setAdding({ ...adding, prepSeconds: e.target.value })} className={`${input} w-36`} />
        <input aria-label="Part response seconds" type="number" min={0} placeholder="Speak sec (speaking)" value={adding.responseSeconds} onChange={(e) => setAdding({ ...adding, responseSeconds: e.target.value })} className={`${input} w-36`} />
        <button type="submit" className="btn-secondary px-3 py-1 text-xs">
          Add part
        </button>
      </form>
    </div>
  );
}

function PartRow({ part, api }: { part: Part; api: Api }) {
  const [edit, setEdit] = useState({
    name: part.name,
    order: part.order,
    prepSeconds: part.prepSeconds?.toString() ?? "",
    responseSeconds: part.responseSeconds?.toString() ?? "",
    instructions: part.instructions ?? "",
  });
  const used = part._count.mockTestTemplateSections;

  return (
    <li className="flex flex-wrap items-center gap-2 rounded bg-slate-50 px-2 py-1.5" aria-label={`Part ${part.name}`}>
      <input aria-label="Part order" type="number" min={1} value={edit.order} onChange={(e) => setEdit({ ...edit, order: Number(e.target.value) })} className={`${input} w-14`} />
      <input aria-label="Part name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={input} />
      <input aria-label="Part prep seconds" type="number" min={0} placeholder="Prep sec" value={edit.prepSeconds} onChange={(e) => setEdit({ ...edit, prepSeconds: e.target.value })} className={`${input} w-24`} />
      <input aria-label="Part response seconds" type="number" min={0} placeholder="Speak sec" value={edit.responseSeconds} onChange={(e) => setEdit({ ...edit, responseSeconds: e.target.value })} className={`${input} w-24`} />
      <input aria-label="Part instructions" placeholder="Instructions" value={edit.instructions} onChange={(e) => setEdit({ ...edit, instructions: e.target.value })} className={`${input} min-w-[12rem] flex-1`} />
      <button
        type="button"
        className={smallBtn}
        onClick={() =>
          api("PATCH", `parts/${part.id}`, {
            name: edit.name,
            order: edit.order,
            instructions: edit.instructions,
            prepSeconds: edit.prepSeconds === "" ? null : Number(edit.prepSeconds),
            responseSeconds: edit.responseSeconds === "" ? null : Number(edit.responseSeconds),
          })
        }
      >
        Save
      </button>
      <button type="button" className={dangerBtn} onClick={() => confirm(`Delete part "${part.name}"?`) && api("DELETE", `parts/${part.id}`)}>
        Delete
      </button>
      {used > 0 && <span className="text-xs text-slate-500">In {used} template section{used === 1 ? "" : "s"}</span>}
    </li>
  );
}
