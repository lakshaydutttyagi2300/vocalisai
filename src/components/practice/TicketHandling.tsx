"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Inbox, RotateCcw, Send } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { NOTE_WORDS, REPLY_WORDS, TICKETS, TICKET_CATEGORIES, TICKET_PRIORITIES, countWords, type SupportTicket } from "@/lib/ticket-handling/tickets";
import { TICKET_CRITERIA, type TicketCriterion } from "@/lib/ticket-handling/review";

interface Review {
  id: string;
  ticketKey: string;
  category: string;
  priority: string;
  score: number;
  verdict: string;
  ratings: Record<TicketCriterion, number>;
  bestCategory: string;
  bestPriority: string;
  priorityReason: string;
  strengths: string[];
  fixes: string[];
  modelNote: string;
  createdAt: string;
}

function pickTicket(previous?: string): SupportTicket {
  const choices = TICKETS.filter((t) => t.key !== previous);
  return choices[Math.floor(Math.random() * choices.length)];
}

const ticketSubject = (key: string) => TICKETS.find((t) => t.key === key)?.subject ?? "Ticket";
const inRange = (n: number, r: { min: number; max: number }) => n >= r.min && n <= r.max;

/**
 * One ticket to handle. On its own it picks a random ticket; on the support
 * desk it is given the queue's ticket and shift, and "Back to the queue"
 * replaces "Try another ticket".
 */
export function TicketHandling({ ticketKey, shiftId, onBack }: { ticketKey?: string; shiftId?: string; onBack?: () => void } = {}) {
  const fixed = ticketKey ? TICKETS.find((t) => t.key === ticketKey) : undefined;
  const [ticket, setTicket] = useState<SupportTicket>(fixed ?? TICKETS[0]);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Review[]>([]);

  // A random ticket after the first render (the server and browser must agree on the first one).
  useEffect(() => {
    if (fixed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off random choice after hydration
    setTicket(pickTicket());
  }, [fixed]);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/ticket-reviews").catch(() => null);
    if (res?.ok) setHistory(((await res.json()) as { reviews: Review[] }).reviews);
  }, []);
  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const replyWords = countWords(reply);
  const noteWords = countWords(note);
  const ready = !!category && !!priority && inRange(replyWords, REPLY_WORDS) && inRange(noteWords, NOTE_WORDS);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ticket-reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketKey: ticket.key, category, priority, reply, note, shiftId }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "We couldn't mark your ticket this time. Please try again in a moment.");
      setReview(body.review);
      setRemaining(body.remaining ?? null);
      void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't mark your ticket this time. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function another() {
    setTicket(pickTicket(ticket.key));
    setCategory("");
    setPriority("");
    setReply("");
    setNote("");
    setReview(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const locked = busy || !!review;
  return (
    <div className="grid gap-6">
      {onBack && !review && (
        <button type="button" onClick={onBack} disabled={busy} className="btn-ghost btn-sm -ml-3 justify-self-start">
          <Icon as={ArrowLeft} />
          Back to the queue
        </button>
      )}
      <section className="card p-5 sm:p-6">
        <p className="eyebrow text-slate-500">
          {ticket.channel} · from {ticket.customerName}
        </p>
        <h2 className="mt-2 font-display text-lg font-bold text-ink-950">{ticket.subject}</h2>
        <p className="mt-3 whitespace-pre-line rounded-xl bg-surface-muted p-4 text-sm leading-relaxed text-ink-900">{ticket.message}</p>
        <h3 className="mt-4 text-sm font-semibold text-ink-900">On the account</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          {ticket.accountInfo.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>

      <section className="card grid gap-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold text-ink-900">
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={locked} className="rounded-xl border border-line bg-surface p-2.5 text-base font-normal text-ink-900">
              <option value="">Choose a category</option>
              {TICKET_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink-900">
            Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value)} disabled={locked} className="rounded-xl border border-line bg-surface p-2.5 text-base font-normal text-ink-900">
              <option value="">Choose a priority</option>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="grid gap-1.5 text-sm font-semibold text-ink-900">
          Reply to the customer
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} disabled={locked} rows={7} className="rounded-xl border border-line bg-surface p-3 text-base font-normal leading-relaxed text-ink-900 focus:border-brand-400 focus:outline-none" />
          <span className="text-xs font-normal text-slate-500">
            <span className="num">{replyWords}</span> words ({REPLY_WORDS.min}-{REPLY_WORDS.max})
          </span>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink-900">
          Internal note for your colleagues
          <textarea value={note} onChange={(e) => setNote(e.target.value)} disabled={locked} rows={3} placeholder="What happened, what you did, what happens next" className="rounded-xl border border-line bg-surface p-3 text-base font-normal leading-relaxed text-ink-900 focus:border-brand-400 focus:outline-none" />
          <span className="text-xs font-normal text-slate-500">
            <span className="num">{noteWords}</span> words ({NOTE_WORDS.min}-{NOTE_WORDS.max})
          </span>
        </label>
        {!review && (
          <button type="button" onClick={() => void submit()} disabled={busy || !ready} className="btn-primary w-full sm:w-auto sm:justify-self-start">
            <Icon as={Send} />
            {busy ? "Marking your ticket..." : "Submit ticket for marking"}
          </button>
        )}
        {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      </section>

      {review && (
        <section className="card p-5 sm:p-6" aria-live="polite">
          <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex justify-center">
              <ScoreRing value={review.score} label="Score" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-ink-950">Your ticket: {review.score} / 100</h2>
              <p className="mt-1 text-sm text-ink-900">{review.verdict}</p>
              {remaining !== null && <p className="mt-1 text-xs text-slate-500">{remaining} AI ticket review{remaining === 1 ? "" : "s"} left on your plan.</p>}
            </div>
          </div>
          <dl className="mt-5 grid gap-3 rounded-xl bg-surface-muted p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Category</dt>
              <dd className="text-ink-900">
                You chose <strong>{review.category}</strong>; best fit: <strong>{review.bestCategory}</strong>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Priority</dt>
              <dd className="text-ink-900">
                You chose <strong>{review.priority}</strong>; should be <strong>{review.bestPriority}</strong>
              </dd>
            </div>
            <p className="text-xs text-slate-600 sm:col-span-2">{review.priorityReason}</p>
          </dl>
          <ul className="mt-5 grid gap-2">
            {TICKET_CRITERIA.map((c) => (
              <li key={c.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 text-sm">
                <span className="text-ink-900">{c.label}</span>
                <span className="num font-semibold text-ink-900">{review.ratings[c.key]} / 5</span>
                <span className="col-span-2 mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-brand-600" style={{ width: `${review.ratings[c.key] * 20}%` }} />
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-ink-900">What you did well</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {review.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-ink-900">What to fix</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {review.fixes.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-surface-muted p-4">
            <h3 className="text-sm font-semibold text-ink-900">A strong internal note</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-900">{review.modelNote}</p>
          </div>
          {onBack ? (
            <button type="button" onClick={onBack} className="btn-primary mt-5 w-full sm:w-auto">
              <Icon as={ArrowLeft} />
              Back to the queue
            </button>
          ) : (
            <button type="button" onClick={another} className="btn-primary mt-5 w-full sm:w-auto">
              <Icon as={RotateCcw} />
              Try another ticket
            </button>
          )}
        </section>
      )}

      {!onBack && history.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold text-ink-950">Your recent tickets</h2>
          <ul className="card mt-3 divide-y divide-slate-100">
            {history.slice(0, 5).map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="min-w-0 text-ink-900">
                  {ticketSubject(h.ticketKey)} <span className="text-xs text-slate-500">· {new Date(h.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                </span>
                <span className="num flex-none font-semibold text-ink-900">{h.score} / 100</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Icon as={Inbox} />
        Your ticket scores also count towards your International Process readiness score.
      </p>
    </div>
  );
}
