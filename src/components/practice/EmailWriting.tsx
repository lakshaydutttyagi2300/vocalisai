"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, RotateCcw, Send } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { EMAIL_TASKS, MAX_REPLY_WORDS, MIN_REPLY_WORDS, countWords, type EmailTask } from "@/lib/email-writing/tasks";
import { EMAIL_CRITERIA, type EmailCriterion } from "@/lib/email-writing/review";

interface Review {
  id: string;
  taskKey: string;
  wordCount: number;
  score: number;
  verdict: string;
  ratings: Record<EmailCriterion, number>;
  strengths: string[];
  fixes: string[];
  modelReply: string;
  createdAt: string;
}

function pickTask(previous?: string): EmailTask {
  const choices = EMAIL_TASKS.filter((t) => t.key !== previous);
  return choices[Math.floor(Math.random() * choices.length)];
}

const taskTitle = (key: string) => EMAIL_TASKS.find((t) => t.key === key)?.title ?? "Email";

export function EmailWriting() {
  const [task, setTask] = useState<EmailTask>(EMAIL_TASKS[0]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Review[]>([]);

  // A random email after the first render (the server and browser must agree on the first one).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off random choice after hydration
    setTask(pickTask());
  }, []);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/email-reviews").catch(() => null);
    if (res?.ok) setHistory(((await res.json()) as { reviews: Review[] }).reviews);
  }, []);
  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const words = countWords(reply);
  const tooShort = words < MIN_REPLY_WORDS;
  const tooLong = words > MAX_REPLY_WORDS;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/email-reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskKey: task.key, reply }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "We couldn't mark your email this time. Please try again in a moment.");
      setReview(body.review);
      setRemaining(body.remaining ?? null);
      void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't mark your email this time. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function another() {
    setTask(pickTask(task.key));
    setReply("");
    setReview(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid gap-6">
      <section className="card p-5 sm:p-6">
        <p className="eyebrow text-slate-500">Customer email · {task.title}</p>
        <p className="mt-3 whitespace-pre-line rounded-xl bg-surface-muted p-4 text-sm leading-relaxed text-ink-900">{task.customerEmail}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink-900">What you know</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {task.facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink-900">A strong reply will</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {task.mustDo.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <label htmlFor="email-reply" className="block text-sm font-semibold text-ink-900">
          Your reply
        </label>
        <textarea
          id="email-reply"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          disabled={busy || !!review}
          rows={10}
          placeholder={"Dear ...,\n\n"}
          className="mt-2 w-full rounded-xl border border-line bg-surface p-3 text-base leading-relaxed text-ink-900 focus:border-brand-400 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span className={tooLong ? "text-red-700" : ""}>
            <span className="num">{words}</span> words {tooShort ? `(at least ${MIN_REPLY_WORDS})` : tooLong ? `(at most ${MAX_REPLY_WORDS})` : ""}
          </span>
          <span>Marked by AI on tone, structure, grammar, clarity and whether it solves the problem.</span>
        </div>
        {!review && (
          <button type="button" onClick={() => void submit()} disabled={busy || tooShort || tooLong} className="btn-primary mt-4 w-full sm:w-auto">
            <Icon as={Send} />
            {busy ? "Marking your email..." : "Mark my email"}
          </button>
        )}
        {error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      </section>

      {review && (
        <section className="card p-5 sm:p-6" aria-live="polite">
          <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex justify-center">
              <ScoreRing value={review.score} label="Score" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-ink-950">Your email: {review.score} / 100</h2>
              <p className="mt-1 text-sm text-ink-900">{review.verdict}</p>
              {remaining !== null && <p className="mt-1 text-xs text-slate-500">{remaining} AI email review{remaining === 1 ? "" : "s"} left on your plan.</p>}
            </div>
          </div>
          <ul className="mt-5 grid gap-2">
            {EMAIL_CRITERIA.map((c) => (
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
          <details className="mt-5 rounded-xl bg-surface-muted p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink-900">See a model reply</summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-900">{review.modelReply}</p>
          </details>
          <button type="button" onClick={another} className="btn-primary mt-5 w-full sm:w-auto">
            <Icon as={RotateCcw} />
            Try another email
          </button>
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold text-ink-950">Your recent emails</h2>
          <ul className="card mt-3 divide-y divide-slate-100">
            {history.slice(0, 5).map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="min-w-0 text-ink-900">
                  {taskTitle(h.taskKey)} <span className="text-xs text-slate-500">· {new Date(h.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                </span>
                <span className="num flex-none font-semibold text-ink-900">{h.score} / 100</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Icon as={Mail} />
        Your email scores also count towards your International Process readiness score.
      </p>
    </div>
  );
}
