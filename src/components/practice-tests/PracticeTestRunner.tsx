"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Check, Clock, Send, X } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { StimulusView } from "@/components/questions/StimulusView";
import { QuestionInput } from "@/components/exam-runner-v2/QuestionInput";
import type { PracticeTestView } from "@/lib/practice-tests";
import { PracticeTestReview } from "@/components/practice-tests/PracticeTestReview";

type Question = PracticeTestView["questions"][number];

const LEVEL_LABELS: Record<string, string> = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced", EXPERT: "Expert" };
export const MODE_LABELS: Record<string, string> = {
  PRACTICE: "Practice",
  WEAK_AREAS: "Weak areas",
  REVISION: "Revision",
  BOOKMARKS: "Bookmarks",
  FULL_MOCK: "Full mock test",
};

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function PracticeTestRunner({ initial }: { initial: PracticeTestView }) {
  const [test, setTest] = useState(initial);
  const [index, setIndex] = useState(() => Math.max(0, initial.questions.findIndex((q) => !q.answered)));
  const [draft, setDraft] = useState<Record<string, unknown>>(() => Object.fromEntries(initial.questions.map((q) => [q.id, q.answer])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  // Time spent on each question, added up across visits.
  const spent = useRef<Record<string, number>>({});
  const shownAt = useRef<number>(0);
  const current: Question | undefined = test.questions[index];

  // Server clock minus this device clock, so the countdown matches the server deadline.
  const clockOffset = useRef(0);
  useEffect(() => {
    clockOffset.current = new Date(initial.serverNow).getTime() - Date.now();
  }, [initial.serverNow]);
  const submitted = test.status === "SUBMITTED";

  const secondsOn = useCallback((id: string) => Math.round((spent.current[id] ?? 0) + (Date.now() - shownAt.current) / 1000), []);

  useEffect(() => {
    shownAt.current = Date.now();
    const id = current?.id;
    const store = spent.current;
    return () => {
      if (id) store[id] = (store[id] ?? 0) + (Date.now() - shownAt.current) / 1000;
    };
  }, [current?.id]);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/practice-tests/${test.id}/submit`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "We couldn't submit your test. Please try again.");
      setTest(data);
      setConfirmSubmit(false);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [test.id]);

  // Countdown for timed tests; at zero the test is submitted.
  useEffect(() => {
    if (!test.deadline || submitted) return;
    const deadline = new Date(test.deadline).getTime();
    const tick = () => {
      const left = (deadline - (Date.now() + clockOffset.current)) / 1000;
      setRemaining(left);
      if (left <= 0) {
        clearInterval(timer);
        submit();
      }
    };
    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, [test.deadline, submitted, submit]);

  if (submitted) return <PracticeTestReview test={test} onChange={setTest} />;
  if (!current) return null;

  const answeredCount = test.questions.filter((q) => q.answered).length;
  const locked = !test.timed && current.answered; // untimed practice: answer fixed once marked
  const value = draft[current.id] ?? null;
  const hasValue = value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0) && value !== "";

  async function saveAnswer() {
    if (!current || !hasValue) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/practice-tests/${test.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: current.id, answer: value, timeTakenSeconds: secondsOn(current.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "We couldn't save your answer. Please try again.");
      setTest((t) => ({
        ...t,
        questions: t.questions.map((q) =>
          q.id === current.id
            ? { ...q, answered: true, answer: value, ...(t.timed ? {} : { isCorrect: data.isCorrect ?? null, correctAnswer: data.correctAnswer ?? null, explanation: data.explanation ?? null }) }
            : q
        ),
      }));
      if (test.timed && index < test.questions.length - 1) setIndex(index + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBookmark(q: Question) {
    const next = !q.bookmarked;
    setTest((t) => ({ ...t, questions: t.questions.map((x) => (x.id === q.id ? { ...x, bookmarked: next } : x)) }));
    const res = await fetch("/api/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: q.id, bookmarked: next }) }).catch(() => null);
    if (!res?.ok) setTest((t) => ({ ...t, questions: t.questions.map((x) => (x.id === q.id ? { ...x, bookmarked: !next } : x)) }));
  }

  const title = [test.exam?.name, test.subjectName, test.skillName].filter(Boolean).join(" · ") || MODE_LABELS[test.mode];

  return (
    <div className="mx-auto max-w-5xl px-5 pb-16 pt-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-950">{title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {test.mode !== "BOOKMARKS" && <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">{LEVEL_LABELS[test.difficulty] ?? test.difficulty}</span>}
            {MODE_LABELS[test.mode]}
            {test.timed ? " · Timed" : " · Untimed"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {remaining !== null && (
            <span role="timer" aria-label="Time left" className={`num inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${remaining < 60 ? "bg-red-50 text-red-700" : "bg-slate-100 text-ink-950"}`}>
              <Icon as={Clock} size="xs" />
              {clock(remaining)}
            </span>
          )}
          <button onClick={() => setConfirmSubmit(true)} className="btn-secondary btn-sm">
            <Icon as={Send} />
            Submit test
          </button>
        </div>
      </div>

      {confirmSubmit && (
        <div role="alertdialog" aria-label="Submit test" className="sheet mt-4 flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-ink-950">
            You&apos;ve answered {answeredCount} of {test.questions.length}. Submit now and see your results?
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmSubmit(false)} className="btn-ghost btn-sm">
              Keep going
            </button>
            <button onClick={submit} disabled={busy} className="btn-primary btn-sm">
              Submit
            </button>
          </div>
        </div>
      )}

      <nav aria-label="Questions" className="mt-5 flex flex-wrap gap-1.5">
        {test.questions.map((q, i) => {
          const tone =
            i === index
              ? "border-ink-950 bg-ink-950 text-white"
              : q.answered && q.isCorrect === true
                ? "border-green-200 bg-green-50 text-green-800"
                : q.answered && q.isCorrect === false
                  ? "border-red-200 bg-red-50 text-red-700"
                  : q.answered
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600";
          return (
            <button key={q.id} onClick={() => setIndex(i)} aria-current={i === index ? "step" : undefined} aria-label={`Question ${i + 1}${q.answered ? ", answered" : ""}`} className={`num h-8 min-w-8 rounded-md border px-2 text-xs font-semibold ${tone}`}>
              {i + 1}
            </button>
          );
        })}
      </nav>

      <div className="sheet mt-4 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs text-slate-500">
            Question {index + 1} of {test.questions.length}
            {current.skillName && ` · ${current.skillName}`}
          </p>
          <button onClick={() => toggleBookmark(current)} aria-pressed={current.bookmarked} className="btn-ghost btn-sm -mr-2 -mt-1">
            <Icon as={current.bookmarked ? BookmarkCheck : Bookmark} className={current.bookmarked ? "text-amber-600" : undefined} />
            {current.bookmarked ? "Bookmarked" : "Bookmark"}
          </button>
        </div>

        {current.passage?.text && (
          <div className="mt-4 max-h-80 overflow-y-auto rounded-md bg-slate-50 p-4">
            {current.passage.title && <p className="mb-2 text-sm font-semibold text-ink-950">{current.passage.title}</p>}
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{current.passage.text}</p>
          </div>
        )}
        <div className="mt-4">
          <StimulusView stimulus={current.stimulus} resetKey={current.id} />
        </div>
        <h2 className="whitespace-pre-line text-base font-semibold leading-relaxed text-ink-950">{current.prompt}</h2>

        <fieldset disabled={locked || busy} className="disabled:opacity-90">
          <QuestionInput type={current.type} prompt={current.prompt} options={current.options} value={value} onChange={(v) => setDraft((d) => ({ ...d, [current.id]: v }))} />
        </fieldset>

        {locked && current.isCorrect !== null && (
          <div className={`mt-5 rounded-lg p-4 text-sm ${current.isCorrect ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>
            <p className="flex items-center gap-2 font-semibold">
              <Icon as={current.isCorrect ? Check : X} />
              {current.isCorrect ? "Correct." : `Not quite. Correct answer: ${current.correctAnswer}`}
            </p>
            {current.explanation && <p className="mt-2 leading-relaxed">{current.explanation}</p>}
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => setIndex(index - 1)} disabled={index === 0} className="btn-ghost btn-sm">
            <Icon as={ArrowLeft} />
            Previous
          </button>
          <div className="flex gap-2">
            {!locked && (
              <button onClick={saveAnswer} disabled={!hasValue || busy} data-loading={busy || undefined} className="btn-primary">
                {test.timed ? (current.answered ? "Update answer" : "Save answer") : "Check answer"}
              </button>
            )}
            {(locked || test.timed) && index < test.questions.length - 1 && (
              <button onClick={() => setIndex(index + 1)} className={locked ? "btn-primary" : "btn-secondary"}>
                Next
                <Icon as={ArrowRight} />
              </button>
            )}
            {locked && index === test.questions.length - 1 && (
              <button onClick={submit} disabled={busy} className="btn-primary">
                See results
                <Icon as={ArrowRight} />
              </button>
            )}
          </div>
        </div>
      </div>

      {test.exam && (
        <p className="mt-6 text-xs text-slate-500">
          <Link href={test.exam.href} className="hover:underline">
            Back to {test.exam.name}
          </Link>
        </p>
      )}
    </div>
  );
}
