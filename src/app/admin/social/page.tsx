"use client";

import { Bot, Check, ExternalLink, OctagonX, Play, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

interface Post {
  id: string; platform: string; status: string; format: string; topic: string; hook: string; body: string; hashtags: string[];
  cardText: string | null; alt: string | null; video: { scenes: { speaker: string; line: string; visual: string; sfx?: string }[]; music: string; durationSec: number; renderStatus?: string } | null;
  direction: { hookType?: string; narrative?: string; visualStyle?: string; cta?: string; characters?: string[] };
  scheduledFor: string | null; publishedAt: string | null; url: string | null; clicks: number; error: string | null; revisions: number;
  metrics: { likes: number | null; replies: number | null; shares: number | null } | null;
  sources: { title: string; url: string }[];
}
interface Note { id: string; title: string; body: string; sourceUrl: string | null; verified: boolean; at: string }
interface Agent { id: string; name: string; responsibility: string; inputs: string[]; outputs: string[]; tools: string[]; usesAi: boolean; publicAction: boolean; failureConditions: string[]; taskKinds: string[] }
interface Status {
  config: { mode: "draft" | "supervised" | "autopilot"; platforms: string[]; postsPerDay: number; planDaysAhead: number; slotsIst: string[]; maxAiCallsPerDay: number; siteUrl: string };
  stopped: boolean; lastTick: string | null; minutesSinceTick: number | null; ai: { usedToday: number; limit: number };
  taskCounts: Record<string, number>; connections: Record<string, boolean>; ownerAlertsConnected: boolean; cronSecretSet: boolean; geminiKeySet: boolean;
  agents: Agent[]; otherAgents: { id: string; name: string; responsibility: string }[]; foldedAgents: { name: string; note: string }[];
  tasks: { id: string; kind: string; agent: string; status: string; attempts: number; error: string | null; durationMs: number | null; at: string }[];
  failed: { id: string; kind: string; agent: string; error: string | null; attempts: number; at: string }[];
  blocked: { id: string; kind: string; reason: string | null }[];
  posts: Post[];
  notes: Record<"reports" | "alerts" | "research" | "audience" | "comments" | "decisions", Note[]>;
}

const MODES = [
  { id: "draft", label: "Draft", help: "Researches and writes. Never publishes." },
  { id: "supervised", label: "Supervised", help: "Prepares posts; you approve each one." },
  { id: "autopilot", label: "Autopilot", help: "Publishes posts that pass every check." },
] as const;
const TABS = ["Review", "Calendar", "Agents", "Activity", "Memory", "Settings"] as const;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "-");
const num = (n: number | null | undefined) => (n === null || n === undefined ? "n/a" : String(n));

export default function SocialAutopilotPage() {
  const [s, setS] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Review");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/social", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) setError(d.error ?? "Couldn't load the autopilot.");
      else { setS(d); setError(null); }
    } catch { setError("Couldn't load the autopilot."); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(payload: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setNote(null); setError(null);
    try {
      const r = await fetch("/api/admin/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) setError(d.error ?? "That didn't work."); else setNote(d.message ?? "Done.");
    } catch { setError("That didn't work."); }
    setBusy(false); load();
  }

  if (!s) return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">{error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : <p className="text-sm text-slate-500">Loading...</p>}</div>;

  const waiting = s.posts.filter((p) => ["NEEDS_REVIEW", "APPROVED"].includes(p.status));
  const stale = s.minutesSinceTick === null || s.minutesSinceTick > 120;
  const setup: [string, boolean][] = [
    ["Scheduler secret (CRON_SECRET) set", s.cronSecretSet], ["Free AI key (GEMINI_API_KEY) set", s.geminiKeySet],
    ["Bluesky connected", s.connections.bluesky], ["Telegram channel connected", s.connections.telegram], ["Alerts to your phone (Telegram) connected", s.ownerAlertsConnected],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-ink-950">Social Autopilot</h1>
      <p className="mt-1 text-sm text-slate-600">A team of AI agents that researches, writes, checks and posts for you. You choose how much freedom it has.</p>

      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {note && <p role="status" className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{note}</p>}

      {s.stopped && <div role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">EMERGENCY STOP is on. Nothing is being published.</div>}
      {stale && <div role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">The scheduler has not run {s.minutesSinceTick === null ? "yet" : `for ${s.minutesSinceTick} minutes`}. Nothing happens by itself until it does - see &quot;Scheduler&quot; in docs/SOCIAL_AUTOPILOT.md.</div>}

      <div className="card mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-bold text-ink-900">How much freedom?</h2>
          <p className="text-xs text-slate-500">Last run: {when(s.lastTick)} · AI calls today: {s.ai.usedToday}/{s.ai.limit}</p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Mode">
          {MODES.map((m) => (
            <button key={m.id} role="radio" aria-checked={s.config.mode === m.id} disabled={busy} onClick={() => act({ action: "setMode", mode: m.id }, m.id === "autopilot" ? "Autopilot publishes posts without asking you, but only ones that pass every check. Turn it on?" : undefined)}
              className={`rounded-lg border p-3 text-left text-sm transition ${s.config.mode === m.id ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-brand-300"}`}>
              <span className="block font-semibold text-ink-900">{m.label}</span><span className="text-xs text-slate-600">{m.help}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {s.stopped
            ? <button className="btn-primary" disabled={busy} onClick={() => act({ action: "resume" })}><Icon as={Play} /> Resume publishing</button>
            : <button className="btn-danger" disabled={busy} onClick={() => act({ action: "stop" })}><Icon as={OctagonX} /> Emergency stop</button>}
          <button className="btn-secondary" disabled={busy} onClick={() => act({ action: "runNow" })}><Icon as={RefreshCw} /> Run a cycle now</button>
        </div>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-ink-900">Setup checklist ({setup.filter(([, ok]) => ok).length}/{setup.length})</summary>
          <ul className="mt-2 space-y-1">{setup.map(([label, ok]) => <li key={label} className={ok ? "text-emerald-700" : "text-amber-700"}>{ok ? "✓" : "○"} {label}</li>)}</ul>
        </details>
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`whitespace-nowrap px-4 py-2 text-sm font-semibold ${tab === t ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-600"}`}>
            {t}{t === "Review" && waiting.length ? ` (${waiting.length})` : ""}{t === "Activity" && s.failed.length ? ` (${s.failed.length} failed)` : ""}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "Review" && (waiting.length === 0
          ? <p className="text-sm text-slate-600">Nothing is waiting for you. {s.config.mode === "autopilot" ? "Autopilot publishes passing posts on its own." : "New posts appear here after each daily run."}</p>
          : <div className="space-y-4">{waiting.map((p) => <PostCard key={p.id} p={p} busy={busy} act={act} />)}</div>)}
        {tab === "Calendar" && <div className="space-y-3">{s.posts.length === 0 && <p className="text-sm text-slate-600">No posts yet. The first daily run creates them.</p>}{s.posts.map((p) => <PostCard key={p.id} p={p} busy={busy} act={act} compact />)}</div>}
        {tab === "Agents" && <AgentsTab s={s} />}
        {tab === "Activity" && <ActivityTab s={s} />}
        {tab === "Memory" && <MemoryTab s={s} />}
        {tab === "Settings" && <SettingsTab s={s} busy={busy} act={act} />}
      </div>
    </div>
  );
}

function PostCard({ p, busy, act, compact }: { p: Post; busy: boolean; act: (a: Record<string, unknown>, c?: string) => void; compact?: boolean }) {
  const [url, setUrl] = useState("");
  const canReview = ["NEEDS_REVIEW"].includes(p.status);
  const manual = !["bluesky", "telegram", "linkedin"].includes(p.platform);
  return (
    <article className="card p-4">
      <header className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold uppercase">{p.platform}</span>
        <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">{p.status.replace("_", " ")}</span>
        <span className="text-slate-500">{p.format} · {p.scheduledFor ? `slot ${when(p.scheduledFor)}` : "no slot"}{p.publishedAt ? ` · posted ${when(p.publishedAt)}` : ""}</span>
        {p.url && <a className="inline-flex items-center gap-1 text-brand-700 underline" href={p.url} target="_blank" rel="noreferrer">view <Icon as={ExternalLink} size="xs" /></a>}
      </header>
      <h3 className="mt-2 font-semibold text-ink-900">{p.hook || p.topic}</h3>
      {!compact || p.status === "NEEDS_REVIEW" ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{p.hook && p.body.startsWith(p.hook) ? p.body.slice(p.hook.length).trim() : p.body}</p> : null}
      {p.cardText && !compact && <p className="mt-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">Image text: {p.cardText}</p>}
      {p.video && !compact && (
        <details className="mt-2 text-sm"><summary className="cursor-pointer font-medium">Video script ({p.video.scenes.length} scenes, ~{p.video.durationSec}s) - script only, not yet rendered</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-700">{p.video.scenes.map((sc, i) => <li key={i}><b>{sc.speaker}:</b> {sc.line} <i className="text-slate-500">[{sc.visual}{sc.sfx ? `; ${sc.sfx}` : ""}]</i></li>)}</ol>
          <p className="mt-1 text-xs text-slate-500">Music: {p.video.music}</p></details>
      )}
      <p className="mt-2 text-xs text-slate-500">Style: {[p.direction.hookType, p.direction.narrative, p.direction.visualStyle, p.direction.cta].filter(Boolean).join(" · ")}{p.direction.characters?.length ? ` · cast: ${p.direction.characters.join(" + ")}` : ""}{p.revisions ? ` · rewritten ${p.revisions}×` : ""}</p>
      {p.sources.length > 0 && <p className="mt-1 text-xs text-slate-500">Sources: {p.sources.map((x) => x.title).join("; ")}</p>}
      {p.status === "PUBLISHED" && <p className="mt-1 text-xs text-slate-600">Results: likes {num(p.metrics?.likes)}, replies {num(p.metrics?.replies)}, reposts {num(p.metrics?.shares)}, link clicks {p.clicks} (n/a = the platform does not report it)</p>}
      {p.error && <p className="mt-1 text-xs text-amber-800">Note: {p.error}</p>}
      {(canReview || p.status === "APPROVED" || p.status === "FAILED") && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canReview && <button className="btn-primary btn-sm" disabled={busy} onClick={() => act({ action: "approve", postId: p.id })}><Icon as={Check} /> Approve</button>}
          {manual && ["APPROVED", "NEEDS_REVIEW"].includes(p.status) && (<>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link to your live post (optional)" aria-label="Link to the live post" className="min-w-0 basis-full flex-1 rounded border sm:basis-auto border-slate-300 px-2 py-1 text-sm" />
            <button className="btn-secondary btn-sm" disabled={busy} onClick={() => act({ action: "markPublished", postId: p.id, url: url.trim() || null })}>I posted this</button></>)}
          {!manual && p.status === "FAILED" && <button className="btn-secondary btn-sm" disabled={busy} onClick={() => act({ action: "markPublished", postId: p.id, url: null }, "Only do this if you checked and the post really is live.")}>It is actually live</button>}
          <button className="btn-ghost btn-sm" disabled={busy} onClick={() => act({ action: "reject", postId: p.id, reason: "Rejected by owner" })}><Icon as={X} /> Reject</button>
        </div>
      )}
    </article>
  );
}

function AgentsTab({ s }: { s: Status }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Each agent below is real code with its own job and its own task type. Free AI is used only where judgement helps; scheduling, limits, permissions and safety checks are plain code.</p>
      {s.otherAgents.map((a) => <div key={a.id} className="card p-4"><h3 className="flex items-center gap-2 font-semibold text-ink-900"><Icon as={Bot} /> {a.name}</h3><p className="mt-1 text-sm text-slate-700">{a.responsibility}</p></div>)}
      {s.agents.map((a) => (
        <details key={a.id} className="card p-4">
          <summary className="cursor-pointer font-semibold text-ink-900">{a.name} <span className="ml-2 text-xs font-normal text-slate-500">{a.usesAi ? "uses free AI" : "rules only"}{a.publicAction ? " · acts in public (stopped by Emergency stop)" : ""}</span></summary>
          <p className="mt-2 text-sm text-slate-700">{a.responsibility}</p>
          <dl className="mt-2 grid gap-1 text-xs text-slate-600">
            <div><dt className="inline font-semibold">Takes in: </dt><dd className="inline">{a.inputs.join("; ")}</dd></div>
            <div><dt className="inline font-semibold">Produces: </dt><dd className="inline">{a.outputs.join("; ")}</dd></div>
            <div><dt className="inline font-semibold">Allowed to use: </dt><dd className="inline">{a.tools.join("; ")}</dd></div>
            <div><dt className="inline font-semibold">Fails when: </dt><dd className="inline">{a.failureConditions.join("; ")}</dd></div>
            <div><dt className="inline font-semibold">Task types: </dt><dd className="inline">{a.taskKinds.join(", ")}</dd></div>
          </dl>
        </details>
      ))}
      <div className="card p-4"><h3 className="font-semibold text-ink-900">Not built as separate agents (on purpose)</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{s.foldedAgents.map((a) => <li key={a.name}><b>{a.name}:</b> {a.note}</li>)}</ul></div>
    </div>
  );
}

function ActivityTab({ s }: { s: Status }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Tasks: {Object.entries(s.taskCounts).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(" · ") || "none yet"}</p>
      {s.blocked.length > 0 && <div className="card p-4"><h3 className="font-semibold text-ink-900">Waiting on you or on a switch</h3><ul className="mt-2 space-y-1 text-sm text-slate-700">{s.blocked.map((t) => <li key={t.id}>{t.kind}: {t.reason}</li>)}</ul></div>}
      {s.failed.length > 0 && <div className="card p-4"><h3 className="font-semibold text-red-800">Failures</h3><ul className="mt-2 space-y-1 text-sm text-slate-700">{s.failed.map((t) => <li key={t.id}><b>{t.agent}</b> / {t.kind} after {t.attempts} tries - {t.error}</li>)}</ul></div>}
      <div className="card overflow-x-auto p-4"><h3 className="font-semibold text-ink-900">Recent tasks</h3>
        <table className="mt-2 w-full text-left text-xs"><thead><tr className="text-slate-500"><th className="py-1 pr-3">When</th><th className="pr-3">Agent</th><th className="pr-3">Task</th><th className="pr-3">Status</th><th className="pr-3">Time</th></tr></thead>
          <tbody>{s.tasks.map((t) => <tr key={t.id} className="border-t border-slate-100"><td className="py-1 pr-3">{when(t.at)}</td><td className="pr-3">{t.agent}</td><td className="pr-3">{t.kind}</td><td className="pr-3">{t.status.toLowerCase()}{t.attempts > 1 ? ` (${t.attempts} tries)` : ""}</td><td className="pr-3">{t.durationMs === null ? "-" : `${(t.durationMs / 1000).toFixed(1)}s`}</td></tr>)}</tbody></table></div>
    </div>
  );
}

function NoteList({ title, notes, empty }: { title: string; notes: Note[]; empty: string }) {
  return (
    <div className="card p-4"><h3 className="font-semibold text-ink-900">{title}</h3>
      {notes.length === 0 ? <p className="mt-2 text-sm text-slate-500">{empty}</p> : <ul className="mt-2 space-y-2 text-sm text-slate-700">{notes.map((n) => <li key={n.id}><b>{n.title}</b>{n.sourceUrl && <> · <a className="text-brand-700 underline" href={n.sourceUrl} target="_blank" rel="noreferrer">source</a></>}<span className="text-xs text-slate-500"> · {when(n.at)}{n.sourceUrl ? (n.verified ? " · verified source" : "") : title === "Research" ? " · unverified idea" : ""}</span></li>)}</ul>}
    </div>
  );
}
function MemoryTab({ s }: { s: Status }) {
  return (
    <div className="space-y-4">
      <div className="card p-4"><h3 className="font-semibold text-ink-900">Reports</h3>
        {s.notes.reports.length === 0 ? <p className="mt-2 text-sm text-slate-500">The first daily report arrives at 9 pm India time.</p> : s.notes.reports.map((r) => <details key={r.id} className="mt-2"><summary className="cursor-pointer text-sm font-medium">{r.title}</summary><pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs">{r.body}</pre></details>)}</div>
      <NoteList title="Alerts" notes={s.notes.alerts} empty="No alerts." />
      <NoteList title="Comments needing a human (drafts are never sent automatically)" notes={s.notes.comments} empty="No comments yet." />
      <NoteList title="Research" notes={s.notes.research} empty="No research yet." />
      <NoteList title="Audience insights" notes={s.notes.audience} empty="None yet." />
      <NoteList title="Decisions and experiments" notes={s.notes.decisions} empty="None yet. The optimizer waits for 12 posts with real numbers." />
    </div>
  );
}

function SettingsTab({ s, busy, act }: { s: Status; busy: boolean; act: (a: Record<string, unknown>) => void }) {
  const [platforms, setPlatforms] = useState(s.config.platforms);
  const [perDay, setPerDay] = useState(s.config.postsPerDay);
  const [slots, setSlots] = useState(s.config.slotsIst.join(", "));
  const [aiCap, setAiCap] = useState(s.config.maxAiCallsPerDay);
  const ALL = ["bluesky", "telegram", "linkedin", "instagram", "youtube", "x"];
  return (
    <div className="card space-y-4 p-5">
      <fieldset><legend className="text-sm font-semibold text-ink-900">Platforms</legend>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">{ALL.map((p) => <label key={p} className="flex items-center gap-1"><input type="checkbox" checked={platforms.includes(p)} onChange={(e) => setPlatforms(e.target.checked ? [...platforms, p] : platforms.filter((x) => x !== p))} />{p}{["instagram", "youtube", "x"].includes(p) ? " (you post by hand)" : ""}</label>)}</div></fieldset>
      <label className="block text-sm"><span className="font-semibold text-ink-900">Posts per day, per platform (0-6)</span><input type="number" min={0} max={6} value={perDay} onChange={(e) => setPerDay(Number(e.target.value))} className="mt-1 block w-24 rounded border border-slate-300 px-2 py-1" /></label>
      <label className="block text-sm"><span className="font-semibold text-ink-900">Posting times (India time, comma separated)</span><input value={slots} onChange={(e) => setSlots(e.target.value)} className="mt-1 block w-full max-w-sm rounded border border-slate-300 px-2 py-1" /></label>
      <label className="block text-sm"><span className="font-semibold text-ink-900">Free AI calls allowed per day</span><input type="number" min={0} max={500} value={aiCap} onChange={(e) => setAiCap(Number(e.target.value))} className="mt-1 block w-28 rounded border border-slate-300 px-2 py-1" /></label>
      <button className="btn-primary" disabled={busy} onClick={() => act({ action: "saveSettings", settings: { platforms, postsPerDay: perDay, slotsIst: slots.split(",").map((x) => x.trim()).filter(Boolean), maxAiCallsPerDay: aiCap } })}>Save settings</button>
    </div>
  );
}
