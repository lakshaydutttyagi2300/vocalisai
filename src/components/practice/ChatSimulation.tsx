"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, RotateCcw, Send } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { CHAT_SCENARIOS, MAX_AGENT_MESSAGES, MAX_MESSAGE_CHARS, TARGET_REPLY_SECONDS, type ChatScenario } from "@/lib/chat-simulation/scenarios";
import { CHAT_CRITERIA, type ChatCriterion } from "@/lib/chat-simulation/marking";

interface Chat {
  id: string;
  scenarioKey: string;
  status: "ACTIVE" | "DONE";
  turns: { from: "customer" | "agent"; text: string; at: string }[];
  canEnd: boolean;
  customerSatisfied: boolean;
  finished: boolean;
  agentMessagesLeft: number;
  score: number | null;
  replySeconds: number | null;
  verdict: string | null;
  feedback: { ratings: Record<ChatCriterion, number>; strengths: string[]; fixes: string[]; betterLine: string } | null;
  createdAt: string;
}

const scenarioOf = (key: string): ChatScenario => CHAT_SCENARIOS.find((s) => s.key === key) ?? CHAT_SCENARIOS[0];

async function call(url: string, body?: unknown) {
  const res = await fetch(url, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

export function ChatSimulation() {
  const [chat, setChat] = useState<Chat | null>(null);
  const [history, setHistory] = useState<Chat[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<null | "start" | "send" | "end">(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await call("/api/chat-simulations");
      setHistory(data.done);
      setChat((current) => current ?? data.active);
    } catch {
      // The page still works without history.
    } finally {
      setLoaded(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  // Braces matter: newer browsers return a promise from scrollIntoView, and an effect may only return a clean-up function.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [chat?.turns.length, busy]);

  async function run(kind: "start" | "send" | "end", url: string, body?: unknown) {
    setBusy(kind);
    setError(null);
    try {
      const data = await call(url, body ?? {});
      setChat(data.chat);
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (kind === "send") setDraft("");
      if (kind === "end") void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const start = () => {
    const pool = CHAT_SCENARIOS.filter((s) => s.key !== chat?.scenarioKey);
    void run("start", "/api/chat-simulations", { scenarioKey: pool[Math.floor(Math.random() * pool.length)].key });
  };
  const send = () => draft.trim() && chat && void run("send", `/api/chat-simulations/${chat.id}/messages`, { text: draft });
  const end = () => chat && void run("end", `/api/chat-simulations/${chat.id}/end`);

  if (!loaded) return <p className="text-sm text-slate-600">Loading...</p>;

  if (!chat || (chat.status === "DONE" && !chat.feedback)) {
    return (
      <div className="grid gap-6">
        <section className="card p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-ink-950">How it works</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>An AI customer opens a live chat with a real problem. You get the facts you need.</li>
            <li>Reply as a chat agent - up to {MAX_AGENT_MESSAGES} messages. The customer reacts to what you write.</li>
            <li>End the chat to get your score on tone, grammar, correct information, problem solving and closing, plus your reply speed.</li>
          </ul>
          <button type="button" onClick={start} disabled={busy !== null} className="btn-primary mt-5 w-full sm:w-auto">
            <Icon as={MessageSquare} />
            {busy === "start" ? "Connecting you to a customer..." : "Start a chat"}
          </button>
          <p className="mt-2 text-xs text-slate-500">Each chat uses one chat simulation from your plan.</p>
          {error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        </section>
        <History items={history} />
      </div>
    );
  }

  const scenario = scenarioOf(chat.scenarioKey);
  const done = chat.status === "DONE";
  return (
    <div className="grid gap-6">
      <section className="card p-5 sm:p-6">
        <p className="eyebrow text-slate-500">Live chat · {scenario.title}</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink-900">What you know</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {scenario.facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink-900">A strong chat will</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {scenario.mustDo.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden" aria-label="Chat">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <span className="text-sm font-semibold text-ink-900">{scenario.customerName}</span>
          {!done && <span className="text-xs text-slate-500">{chat.agentMessagesLeft} of {MAX_AGENT_MESSAGES} replies left</span>}
        </div>
        <ol className="grid max-h-[28rem] gap-3 overflow-y-auto p-4 sm:p-5" aria-live="polite">
          {chat.turns.map((t, i) => (
            <li key={i} className={`flex ${t.from === "agent" ? "justify-end" : "justify-start"}`}>
              <span className={`max-w-[85%] whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${t.from === "agent" ? "bg-brand-600 text-white" : "bg-surface-muted text-ink-900"}`}>
                <span className="sr-only">{t.from === "agent" ? "You: " : `${scenario.customerName}: `}</span>
                {t.text}
              </span>
            </li>
          ))}
          {busy === "send" && (
            <li className="flex justify-start">
              <span className="rounded-2xl bg-surface-muted px-4 py-2.5 text-sm text-slate-500">{scenario.customerName} is typing...</span>
            </li>
          )}
          <div ref={bottom} />
        </ol>
        {!done && (
          <div className="border-t border-line p-4 sm:p-5">
            {chat.finished ? (
              <p className="text-sm text-ink-900">The chat is complete. End it to get your score.</p>
            ) : (
              <>
                <label htmlFor="chat-message" className="sr-only">
                  Your message
                </label>
                <textarea
                  id="chat-message"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  disabled={busy !== null}
                  rows={3}
                  placeholder={chat.customerSatisfied ? "The customer is happy - write your closing message" : "Type your reply and press Enter"}
                  className="w-full rounded-xl border border-line bg-surface p-3 text-base text-ink-900 focus:border-brand-400 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">Press Enter to send, Shift + Enter for a new line. Aim to reply within {TARGET_REPLY_SECONDS} seconds.</p>
              </>
            )}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              {!chat.finished && (
                <button type="button" onClick={send} disabled={busy !== null || !draft.trim()} className="btn-primary w-full sm:w-auto">
                  <Icon as={Send} />
                  Send
                </button>
              )}
              <button type="button" onClick={end} disabled={busy !== null || !chat.canEnd} className={`${chat.finished ? "btn-primary" : "btn-secondary"} w-full sm:w-auto`}>
                {busy === "end" ? "Marking your chat..." : "End chat and get my score"}
              </button>
            </div>
            {error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
            {remaining !== null && <p className="mt-2 text-xs text-slate-500">{remaining} chat simulation{remaining === 1 ? "" : "s"} left on your plan.</p>}
          </div>
        )}
      </section>

      {done && chat.feedback && chat.score !== null && (
        <section className="card p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex justify-center">
              <ScoreRing value={chat.score} label="Score" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-ink-950">Your chat: {chat.score} / 100</h2>
              <p className="mt-1 text-sm text-ink-900">{chat.verdict}</p>
              {chat.replySeconds !== null && <p className="mt-1 text-xs text-slate-500">Average reply time: {chat.replySeconds} seconds.</p>}
            </div>
          </div>
          <ul className="mt-5 grid gap-2">
            {CHAT_CRITERIA.map((c) => (
              <li key={c.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 text-sm">
                <span className="text-ink-900">{c.label}</span>
                <span className="num font-semibold text-ink-900">{chat.feedback!.ratings[c.key]} / 5</span>
                <span className="col-span-2 mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-brand-600" style={{ width: `${chat.feedback!.ratings[c.key] * 20}%` }} />
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-ink-900">What you did well</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {chat.feedback.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-ink-900">What to fix</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {chat.feedback.fixes.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-surface-muted p-4">
            <h3 className="text-sm font-semibold text-ink-900">A better way to say your weakest message</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-900">{chat.feedback.betterLine}</p>
          </div>
          <button type="button" onClick={start} disabled={busy !== null} className="btn-primary mt-5 w-full sm:w-auto">
            <Icon as={RotateCcw} />
            {busy === "start" ? "Connecting you to a customer..." : "Start another chat"}
          </button>
          {error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        </section>
      )}
      <History items={history} />
    </div>
  );
}

function History({ items }: { items: Chat[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="font-display text-lg font-bold text-ink-950">Your recent chats</h2>
      <ul className="card mt-3 divide-y divide-slate-100">
        {items.slice(0, 5).map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
            <span className="min-w-0 text-ink-900">
              {scenarioOf(h.scenarioKey).title} <span className="text-xs text-slate-500">· {new Date(h.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            </span>
            <span className="num flex-none font-semibold text-ink-900">{h.score} / 100</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Icon as={MessageSquare} />
        Your chat scores also count towards your International Process readiness score.
      </p>
    </section>
  );
}
