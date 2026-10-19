"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, Image as ImageIcon, PlayCircle, RotateCcw, Send } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { ScoreRing } from "@/components/ui/ScoreRing";
import {
  MAX_PICTURE_WORDS,
  MIN_PICTURE_WORDS,
  PICTURE_INSTRUCTION,
  PICTURE_PROMPTS,
  PICTURE_SECONDS,
  countWords,
  getPicturePrompt,
  pictureSrc,
  type PicturePrompt,
} from "@/lib/picture-writing/prompts";
import { PICTURE_CRITERIA, type PictureCriterion } from "@/lib/picture-writing/review";

interface Review {
  id: string;
  promptKey: string;
  response: string;
  wordCount: number;
  timedOut: boolean;
  score: number;
  verdict: string;
  ratings: Record<PictureCriterion, number>;
  strengths: string[];
  fixes: string[];
  missedDetails: string[];
  modelAnswer: string;
  createdAt: string;
}

/** An attempt in progress, kept in this browser so a refresh doesn't lose it. */
interface Attempt {
  promptKey: string;
  attemptKey: string;
  deadline: number;
  text: string;
}

const STORE = "vocalisai.picture-writing.attempt";
const readAttempt = (): Attempt | null => {
  try {
    const a = JSON.parse(localStorage.getItem(STORE) ?? "null") as Attempt | null;
    return a && getPicturePrompt(a.promptKey) && typeof a.deadline === "number" ? a : null;
  } catch {
    return null;
  }
};
const saveAttempt = (a: Attempt | null) => {
  try {
    if (a) localStorage.setItem(STORE, JSON.stringify(a));
    else localStorage.removeItem(STORE);
  } catch {
    // Private mode or storage blocked: the attempt just isn't kept across a refresh.
  }
};

// The test area (on the page), so a new photo starts in view rather than under the page header.
const showTest = () => document.getElementById("picture-test")?.scrollIntoView({ block: "start" });
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

/** A photo the candidate hasn't described recently, chosen at random. */
function pickPrompt(recent: string[]): PicturePrompt {
  const fresh = PICTURE_PROMPTS.filter((p) => !recent.includes(p.key));
  const pool = fresh.length ? fresh : PICTURE_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function Photo({ prompt, className }: { prompt: PicturePrompt; className?: string }) {
  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={pictureSrc(prompt.key, true)} />
      <img src={pictureSrc(prompt.key)} alt={prompt.alt} width={1200} height={800} decoding="async" className={className} />
    </picture>
  );
}

/**
 * Timed picture writing: a real workplace photo, 2 minutes to describe it,
 * then AI feedback on five criteria. The text is submitted automatically
 * when the time runs out (if it is long enough to mark).
 */
export function PictureWriting() {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [now, setNow] = useState(0);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tooShortAtEnd, setTooShortAtEnd] = useState(false);
  const [history, setHistory] = useState<Review[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const submitting = useRef(false);
  // The latest attempt for the timer and submit callbacks (declared before the countdown effect, so it is current there).
  const attemptRef = useRef<Attempt | null>(null);
  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/picture-reviews").catch(() => null);
    if (res?.ok) setHistory(((await res.json()) as { reviews: Review[] }).reviews);
    setHistoryLoaded(true);
  }, []);
  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Pick up an attempt that was in progress before a refresh.
  useEffect(() => {
    const saved = readAttempt();
    if (!saved) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring browser-only state after hydration
    setAttempt(saved);
    setNow(Date.now());
    requestAnimationFrame(showTest);
  }, []);

  const submit = useCallback(
    async (timedOut: boolean) => {
      const a = attemptRef.current;
      if (!a || submitting.current) return;
      submitting.current = true;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/picture-reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ promptKey: a.promptKey, attemptKey: a.attemptKey, response: a.text, timedOut }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "We couldn't mark your description this time. Please try again in a moment.");
        setReview(body.review);
        setRemaining(body.remaining ?? null);
        saveAttempt(null);
        void loadHistory();
      } catch (e) {
        submitting.current = false;
        setError(e instanceof Error ? e.message : "We couldn't mark your description this time. Please try again in a moment.");
      } finally {
        setBusy(false);
      }
    },
    [loadHistory],
  );

  // The countdown. When it reaches zero the editor locks and the text is sent.
  const writing = !!attempt && !review;
  useEffect(() => {
    if (!writing || locked) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const a = attemptRef.current;
      if (a && t >= a.deadline) {
        clearInterval(id);
        setLocked(true);
        if (countWords(a.text) >= MIN_PICTURE_WORDS) void submit(true);
        else setTooShortAtEnd(true);
      }
    };
    const id = setInterval(tick, 250);
    tick();
    return () => clearInterval(id);
  }, [writing, locked, submit]);

  function start() {
    const recent = history.map((h) => h.promptKey);
    const prompt = pickPrompt(recent);
    const a = { promptKey: prompt.key, attemptKey: newKey(), deadline: Date.now() + PICTURE_SECONDS * 1000, text: "" };
    saveAttempt(a);
    submitting.current = false;
    setAttempt(a);
    setNow(Date.now());
    setLocked(false);
    setReview(null);
    setRemaining(null);
    setError(null);
    setTooShortAtEnd(false);
    requestAnimationFrame(showTest);
  }

  function updateText(text: string) {
    if (!attempt || locked) return;
    const a = { ...attempt, text };
    saveAttempt(a);
    setAttempt(a);
  }

  function reset() {
    saveAttempt(null);
    setAttempt(null);
    setReview(null);
    setLocked(false);
    setError(null);
    setTooShortAtEnd(false);
    window.scrollTo({ top: 0 });
  }

  const prompt = attempt ? getPicturePrompt(attempt.promptKey) : undefined;

  // ---- Result ----
  if (review && prompt) {
    return (
      <div className="grid gap-6">
        <section className="card p-5 sm:p-6" aria-live="polite">
          <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex justify-center">
              <ScoreRing value={review.score} label="Score" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-ink-950">Your description: {review.score} / 100</h2>
              <p className="mt-1 text-sm text-ink-900">{review.verdict}</p>
              {remaining !== null && <p className="mt-1 text-xs text-slate-500">{remaining} AI picture-writing review{remaining === 1 ? "" : "s"} left on your plan.</p>}
            </div>
          </div>
          <ul className="mt-5 grid gap-2">
            {PICTURE_CRITERIA.map((c) => (
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
              <h3 className="text-sm font-semibold text-ink-900">What to improve</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {review.fixes.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
          {review.missedDetails.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-ink-900">Details you could have mentioned</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {review.missedDetails.map((d) => (
                  <li key={d} className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="card grid gap-5 p-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:p-6">
          <Photo prompt={prompt} className="h-auto w-full rounded-xl object-cover" />
          <div className="grid min-w-0 content-start gap-4">
            <div>
              <h3 className="text-sm font-semibold text-ink-900">
                What you wrote <span className="font-normal text-slate-500">· {review.wordCount} words{review.timedOut ? " · sent when time ran out" : ""}</span>
              </h3>
              <p className="mt-2 whitespace-pre-line rounded-xl bg-surface-muted p-4 text-sm leading-relaxed text-ink-900">{review.response}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink-900">A strong description</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-900">{review.modelAnswer}</p>
              <p className="mt-2 text-xs text-slate-500">There is no single right answer: any reading that fits the photo is fine.</p>
            </div>
          </div>
        </section>

        <button type="button" onClick={start} className="btn-primary w-full sm:w-auto sm:justify-self-start">
          <Icon as={RotateCcw} />
          Try another photo
        </button>
      </div>
    );
  }

  // ---- Writing ----
  if (attempt && prompt) {
    const left = Math.max(0, Math.ceil((attempt.deadline - now) / 1000));
    const words = countWords(attempt.text);
    const ready = words >= MIN_PICTURE_WORDS && words <= MAX_PICTURE_WORDS;
    const urgent = left <= 20;
    return (
      <div className="grid gap-5">
        <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-4" role="group" aria-label="Time left">
          <span className={`flex items-center gap-2 font-display text-2xl font-bold num ${urgent ? "text-red-700" : "text-ink-950"}`}>
            <Icon as={Clock} />
            <span aria-hidden="true">{clock(left)}</span>
          </span>
          <span className="sr-only" aria-live="polite">
            {left === 60 || left === 30 || left === 10 ? `${left} seconds left` : ""}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Time used" aria-valuemin={0} aria-valuemax={PICTURE_SECONDS} aria-valuenow={PICTURE_SECONDS - left}>
              <span className={`block h-full rounded-full transition-[width] duration-300 ${urgent ? "bg-red-500" : "bg-brand-600"}`} style={{ width: `${((PICTURE_SECONDS - left) / PICTURE_SECONDS) * 100}%` }} />
            </span>
          </span>
          <span className="text-xs text-slate-500">{locked ? "Time's up" : "Sent automatically at 0:00"}</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="min-w-0">
            <Photo prompt={prompt} className="h-auto w-full rounded-2xl object-cover shadow-sm" />
            <p className="mt-2 text-xs text-slate-500">{prompt.category}</p>
          </section>
          <section className="card grid min-w-0 content-start gap-4 p-5">
            <p className="text-sm font-medium leading-relaxed text-ink-900">{PICTURE_INSTRUCTION}</p>
            <label className="grid gap-1.5 text-sm font-semibold text-ink-900">
              Your description
              <textarea
                value={attempt.text}
                onChange={(e) => updateText(e.target.value)}
                readOnly={locked || busy}
                rows={10}
                autoFocus
                spellCheck
                aria-describedby="picture-words"
                className="rounded-xl border border-line bg-surface p-3 text-base font-normal leading-relaxed text-ink-900 focus:border-brand-400 focus:outline-none read-only:bg-surface-muted"
              />
              <span id="picture-words" className="text-xs font-normal text-slate-500">
                <span className="num">{words}</span> words (at least {MIN_PICTURE_WORDS})
              </span>
            </label>
            {!tooShortAtEnd && (
              <button type="button" onClick={() => void submit(locked)} disabled={busy || !ready} className="btn-primary w-full sm:w-auto sm:justify-self-start">
                <Icon as={Send} />
                {busy ? "Marking your description..." : "Submit for marking"}
              </button>
            )}
            {tooShortAtEnd && (
              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                <p>
                  Time&apos;s up. You wrote {words} word{words === 1 ? "" : "s"}, and at least {MIN_PICTURE_WORDS} are needed for marking, so nothing was sent and no review was used.
                </p>
                <button type="button" onClick={start} className="btn-secondary btn-sm mt-3">
                  <Icon as={RotateCcw} />
                  Try another photo
                </button>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
                <p>{error}</p>
                {locked && !busy && (
                  <button type="button" onClick={() => void submit(true)} className="btn-secondary btn-sm mt-3">
                    Try sending again
                  </button>
                )}
              </div>
            )}
            {!locked && (
              <button type="button" onClick={reset} disabled={busy} className="btn-ghost btn-sm justify-self-start text-slate-600">
                Stop and go back
              </button>
            )}
          </section>
        </div>
      </div>
    );
  }

  // ---- Introduction ----
  return (
    <div className="grid gap-6">
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-ink-950">How it works</h2>
        <ul className="mt-3 grid gap-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <Icon as={ImageIcon} className="mt-0.5 flex-none text-brand-700" />
            You see a real photo of a workplace or everyday situation - a different one each time.
          </li>
          <li className="flex gap-2">
            <Icon as={Clock} className="mt-0.5 flex-none text-brand-700" />
            You have <strong className="font-semibold text-ink-900">2 minutes</strong> to describe what is happening, who is involved, what they want and what might happen next. The clock starts when the photo appears.
          </li>
          <li className="flex gap-2">
            <Icon as={Send} className="mt-0.5 flex-none text-brand-700" />
            Your text is sent automatically at 0:00 (at least {MIN_PICTURE_WORDS} words). AI marks clarity, grammar, interpretation, visual detail and professionalism - there is no single right answer.
          </li>
        </ul>
        <button type="button" onClick={start} disabled={!historyLoaded} className="btn-primary mt-5 w-full sm:w-auto">
          <Icon as={PlayCircle} />
          {historyLoaded ? "Start test" : "Loading..."}
        </button>
        <p className="mt-2 text-xs text-slate-500">Each marked description uses one AI picture-writing review from your plan. {PICTURE_PROMPTS.length} photos to practise with.</p>
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold text-ink-950">Your recent descriptions</h2>
          <ul className="card mt-3 divide-y divide-slate-100">
            {history.slice(0, 5).map((h) => {
              const p = getPicturePrompt(h.promptKey);
              return (
                <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0 text-ink-900">
                    {p?.category ?? "Photo"} <span className="text-xs text-slate-500">· {new Date(h.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </span>
                  <span className="num flex-none font-semibold text-ink-900">{h.score} / 100</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
