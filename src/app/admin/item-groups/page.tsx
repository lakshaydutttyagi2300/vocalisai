"use client";

import { useCallback, useEffect, useState } from "react";
import { uploadItemGroupAsset } from "@/lib/upload-item-asset-client";

// P1-G: admin screen for ItemGroups - a shared stimulus (reading passage,
// audio clip, image, chart, video) that several questions answer. Files go
// through the P1-D upload routes; attaching questions sets their
// itemGroupId/orderInGroup. Every change is written to the Activity Log by
// the API.

const TYPES = ["PASSAGE", "AUDIO", "IMAGE", "CHART", "VIDEO"] as const;
const TYPE_LABELS: Record<string, string> = { PASSAGE: "Reading passage", AUDIO: "Audio clip", IMAGE: "Image", CHART: "Chart", VIDEO: "Video" };
const ACCEPT: Record<string, string> = {
  AUDIO: "audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/mp4",
  IMAGE: "image/png,image/jpeg,image/webp",
  CHART: "image/png,image/jpeg,image/webp",
  VIDEO: "video/mp4,video/webm",
};

interface GroupSummary {
  id: string;
  type: string;
  title: string | null;
  assetKey: string | null;
  playLimit: number | null;
  questionCount: number;
}

interface GroupDetail {
  id: string;
  type: string;
  title: string | null;
  text: string | null;
  assetKey: string | null;
  transcript: string | null;
  metadataJson: string | null;
  playLimit: number | null;
  questions: { id: string; prompt: string; type: string; category: string; difficulty: string; orderInGroup: number | null; isActive: boolean }[];
}

interface FormState {
  type: string;
  title: string;
  text: string;
  transcript: string;
  metadataJson: string;
  playLimit: string;
  assetKey: string | null;
}

const EMPTY_FORM: FormState = { type: "PASSAGE", title: "", text: "", transcript: "", metadataJson: "", playLimit: "", assetKey: null };
const input = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

export default function AdminItemGroupsPage() {
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [selected, setSelected] = useState<GroupDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [attach, setAttach] = useState({ questionId: "", orderInGroup: "1" });

  const loadList = useCallback(async () => {
    const res = await fetch("/api/admin/item-groups");
    const data = await res.json().catch(() => null);
    if (res.ok) setGroups(data.groups);
    else setError(data?.error ?? "Couldn't load item groups.");
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/item-groups/${id}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Couldn't load that group.");
      return;
    }
    setSelected(data);
    setForm({
      type: data.type,
      title: data.title ?? "",
      text: data.text ?? "",
      transcript: data.transcript ?? "",
      metadataJson: data.metadataJson ?? "",
      playLimit: data.playLimit?.toString() ?? "",
      assetKey: data.assetKey,
    });
    setFile(null);
    const nextOrder = (data.questions as GroupDetail["questions"]).reduce((m, q) => Math.max(m, q.orderInGroup ?? 0), 0) + 1;
    setAttach({ questionId: "", orderInGroup: String(nextOrder) });
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  function startCreate() {
    setSelected(null);
    setCreating(true);
    setForm(EMPTY_FORM);
    setFile(null);
    setError(null);
    setNotice(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      let assetKey = form.assetKey;
      if (file) assetKey = await uploadItemGroupAsset(file, form.type);

      const body = {
        ...(selected ? {} : { type: form.type }),
        title: form.title,
        text: form.text,
        transcript: form.transcript,
        metadataJson: form.metadataJson,
        playLimit: form.type === "AUDIO" ? form.playLimit : null,
        assetKey,
      };
      const res = await fetch(selected ? `/api/admin/item-groups/${selected.id}` : "/api/admin/item-groups", {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't save the group.");
      setNotice("Saved.");
      setCreating(false);
      await loadList();
      await loadDetail(selected?.id ?? data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the group.");
    } finally {
      setBusy(false);
    }
  }

  async function patchQuestions(body: unknown) {
    if (!selected) return;
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/admin/item-groups/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "That change couldn't be saved.");
      return;
    }
    setNotice("Saved.");
    await loadDetail(selected.id);
    await loadList();
  }

  async function remove() {
    if (!selected || !confirm("Delete this item group?")) return;
    const res = await fetch(`/api/admin/item-groups/${selected.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Couldn't delete the group.");
      return;
    }
    setSelected(null);
    setNotice("Deleted.");
    await loadList();
  }

  const editingOpen = creating || selected;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink-950">Item groups</h1>
      <p className="mt-1 text-sm text-slate-600">
        A shared passage, audio clip, image, chart or video that several questions answer - like a reading passage with five questions
        about it. Used by the new exam screen only.
      </p>

      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">{notice}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-ink-900">Groups</h2>
            <button type="button" onClick={startCreate} className="btn-primary px-3 py-1 text-xs">
              New group
            </button>
          </div>
          {!groups && <div className="mt-3 h-24 animate-pulse rounded bg-slate-100" />}
          {groups && groups.length === 0 && <p className="mt-3 text-sm text-slate-500">No groups yet.</p>}
          <ul className="mt-3 divide-y divide-slate-100">
            {groups?.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setNotice(null);
                    loadDetail(g.id);
                  }}
                  className={`w-full py-2 text-left text-sm hover:bg-slate-50 ${selected?.id === g.id ? "font-semibold text-brand-700" : "text-ink-900"}`}
                >
                  {g.title || "(untitled)"}
                  <span className="block text-xs font-normal text-slate-500">
                    {TYPE_LABELS[g.type] ?? g.type} · {g.questionCount} question{g.questionCount === 1 ? "" : "s"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {editingOpen ? (
          <div className="card p-5">
            <h2 className="font-display font-bold text-ink-900">{selected ? "Edit group" : "New group"}</h2>

            <div className="mt-4 grid gap-3">
              <label className="text-sm">
                <span className="text-slate-600">Type</span>
                <select
                  value={form.type}
                  disabled={!!selected}
                  onChange={(e) => {
                    setForm({ ...form, type: e.target.value, assetKey: null });
                    setFile(null);
                  }}
                  className={`${input} mt-1 disabled:bg-slate-50`}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                {selected && <span className="mt-1 block text-xs text-slate-500">The type can&apos;t change once a group exists.</span>}
              </label>

              <label className="text-sm">
                <span className="text-slate-600">Title</span>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${input} mt-1`} />
              </label>

              <label className="text-sm">
                <span className="text-slate-600">{form.type === "PASSAGE" ? "Passage text (required)" : "Caption or description (optional)"}</span>
                <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={form.type === "PASSAGE" ? 8 : 2} className={`${input} mt-1`} />
              </label>

              {form.type !== "PASSAGE" && (
                <div className="text-sm">
                  <span className="text-slate-600">File (required)</span>
                  <input
                    aria-label="Group file"
                    type="file"
                    accept={ACCEPT[form.type]}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="mt-1 block text-sm"
                  />
                  <span className="mt-1 block text-xs text-slate-500">
                    {file ? `Will upload: ${file.name}` : form.assetKey ? "A file is attached. Choose a new one to replace it." : "No file yet."} Max 25MB.
                  </span>
                </div>
              )}

              {form.type === "AUDIO" && (
                <>
                  <label className="text-sm">
                    <span className="text-slate-600">Play limit (blank = unlimited)</span>
                    <input type="number" min={1} value={form.playLimit} onChange={(e) => setForm({ ...form, playLimit: e.target.value })} className={`${input} mt-1 max-w-[10rem]`} />
                  </label>
                  <label className="text-sm">
                    <span className="text-slate-600">Transcript (never shown to candidates during the exam)</span>
                    <textarea value={form.transcript} onChange={(e) => setForm({ ...form, transcript: e.target.value })} rows={4} className={`${input} mt-1`} />
                  </label>
                </>
              )}

              <label className="text-sm">
                <span className="text-slate-600">Metadata (optional JSON, e.g. {`{"accent":"British","speakers":2}`})</span>
                <input value={form.metadataJson} onChange={(e) => setForm({ ...form, metadataJson: e.target.value })} className={`${input} mt-1 font-mono`} />
              </label>
            </div>

            <div className="mt-5 flex justify-between gap-2">
              {selected ? (
                <button type="button" onClick={remove} className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50">
                  Delete group
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setSelected(null);
                  }}
                  className="btn-secondary text-sm"
                >
                  Close
                </button>
                <button type="button" onClick={save} disabled={busy} className="btn-primary text-sm disabled:opacity-60">
                  {busy ? "Saving..." : "Save group"}
                </button>
              </div>
            </div>

            {selected && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <h3 className="font-display font-bold text-ink-900">Questions in this group</h3>
                {selected.questions.length === 0 && <p className="mt-2 text-sm text-slate-500">None yet.</p>}
                <ul className="mt-2 space-y-1.5">
                  {selected.questions.map((q) => (
                    <li key={q.id} className="flex items-center gap-3 rounded bg-slate-50 px-3 py-2 text-sm">
                      <span className="w-6 font-semibold text-slate-400">{q.orderInGroup ?? "-"}</span>
                      <span className="flex-1 truncate">
                        {q.prompt}
                        <span className="block text-xs text-slate-500">
                          {q.type} · {q.category} · {q.difficulty}
                          {!q.isActive && " · inactive"}
                        </span>
                      </span>
                      <button type="button" onClick={() => patchQuestions({ detach: [q.id] })} className="text-xs text-red-600 hover:underline">
                        Detach
                      </button>
                    </li>
                  ))}
                </ul>

                <form
                  className="mt-3 flex flex-wrap items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    patchQuestions({ attach: [{ questionId: attach.questionId.trim(), orderInGroup: Number(attach.orderInGroup) }] });
                  }}
                >
                  <label className="flex-1 text-sm">
                    <span className="text-slate-600">Question ID (from the Questions page)</span>
                    <input value={attach.questionId} onChange={(e) => setAttach({ ...attach, questionId: e.target.value })} className={`${input} mt-1 font-mono`} />
                  </label>
                  <label className="text-sm">
                    <span className="text-slate-600">Order</span>
                    <input type="number" min={1} value={attach.orderInGroup} onChange={(e) => setAttach({ ...attach, orderInGroup: e.target.value })} className={`${input} mt-1 w-20`} />
                  </label>
                  <button type="submit" disabled={!attach.questionId.trim()} className="btn-secondary text-sm disabled:opacity-50">
                    Attach question
                  </button>
                </form>
                <p className="mt-2 text-xs text-slate-500">
                  You can also attach questions in bulk: fill the <strong>Item Group</strong> and <strong>Order In Group</strong> columns in a bulk
                  import file. This group&apos;s ID is <code className="rounded bg-slate-100 px-1">{selected.id}</code>.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="card flex items-center justify-center p-10 text-sm text-slate-500">Select a group, or create a new one.</div>
        )}
      </div>
    </div>
  );
}
