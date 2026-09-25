"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExamStateView, QuestionView } from "@/lib/exam-runner";
import { Countdown, useRemainingSeconds } from "./Countdown";
import { QuestionInput } from "./QuestionInput";
import { PassageView } from "./PassageView";
import { AudioPlayer } from "./AudioPlayer";
import { TimedSpeaking } from "./TimedSpeaking";
import { StimulusView } from "@/components/questions/StimulusView";

type LocalAnswer = { answer: unknown; flagged: boolean };
type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 800;

// Exam runner v2 (P1-E). Runs inside the existing proctored
// MockTestSessionShell (camera/mic/fullscreen/tab monitoring unchanged).
// The server owns every rule: deadlines, which question a forward-only
// section is on, play limits, locking. This component only displays that
// state, autosaves answers, and re-fetches when time runs out.
export function ExamRunnerV2({
  sessionId,
  micStream,
  onComplete,
}: {
  sessionId: string;
  micStream: MediaStream | null;
  onComplete: () => void;
}) {
  const [view, setView] = useState<ExamStateView | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [freeIndex, setFreeIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [notes, setNotes] = useState<Record<string, Set<string>>>({});

  const pendingRef = useRef(new Map<string, LocalAnswer>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const paperIndexRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  // The parent shell re-renders every second (its elapsed clock) and
  // passes a fresh onComplete each time. Held in a ref so applyView/load
  // stay stable - otherwise the start effect below would re-run (and
  // cancel its own in-flight request) every second.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const applyView = useCallback(
    (next: ExamStateView) => {
      setClockOffset(Date.parse(next.serverNow) - Date.now());
      setView(next);
      if (next.status === "COMPLETED") {
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
        return;
      }
      // New paper (first load, submit, or server-side auto-submit): reset
      // local answers from what the server actually has saved.
      if (paperIndexRef.current !== next.paperIndex) {
        paperIndexRef.current = next.paperIndex;
        const fromServer: Record<string, LocalAnswer> = {};
        for (const [qid, r] of Object.entries(next.responses)) fromServer[qid] = { answer: r.answer, flagged: r.flagged };
        setAnswers(fromServer);
        setFreeIndex(0);
        setReviewing(false);
        setConfirmSubmit(false);
        pendingRef.current.clear();
      }
    },
    []
  );

  const load = useCallback(async () => {
    const res = await fetch(`/api/exam-sessions/${sessionId}`);
    const data = await res.json().catch(() => null);
    if (res.ok) applyView(data);
    else setLoadError(data?.error ?? "Couldn't load the exam.");
  }, [sessionId, applyView]);

  // Start (or resume, after a refresh/disconnect) - idempotent server-side.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/exam-sessions/${sessionId}/start`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (cancelled) return;
      if (res.ok) applyView(data);
      else setLoadError(data?.error ?? "Couldn't start the exam.");
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, applyView]);

  async function sendSave(questionId: string) {
    const pending = pendingRef.current.get(questionId);
    if (!pending) return;
    pendingRef.current.delete(questionId);
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/exam-sessions/${sessionId}/response`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answer: pending.answer, flagged: pending.flagged }),
      });
      if (res.status === 409) {
        // Section closed (time up) or moved on - the server's view wins.
        await load();
        setSaveStatus("idle");
        return;
      }
      setSaveStatus(res.ok ? "saved" : "error");
    } catch {
      setSaveStatus("error");
      // Keep it queued so the next save or flush retries it.
      if (!pendingRef.current.has(questionId)) pendingRef.current.set(questionId, pending);
    }
  }

  function queueSave(questionId: string, next: LocalAnswer) {
    setAnswers((a) => ({ ...a, [questionId]: next }));
    pendingRef.current.set(questionId, next);
    const existing = timersRef.current.get(questionId);
    if (existing) clearTimeout(existing);
    timersRef.current.set(
      questionId,
      setTimeout(() => {
        timersRef.current.delete(questionId);
        sendSave(questionId);
      }, AUTOSAVE_DELAY_MS)
    );
  }

  async function flushAll() {
    for (const t of timersRef.current.values()) clearTimeout(t);
    timersRef.current.clear();
    await Promise.all([...pendingRef.current.keys()].map((qid) => sendSave(qid)));
  }

  const paperSeconds = useRemainingSeconds(view?.paperDeadline ?? null, clockOffset);
  const examSeconds = useRemainingSeconds(view?.examDeadline ?? null, clockOffset);

  // Time's up for this paper: save what's pending, then keep asking the
  // server until it reports the paper closed (it auto-submits once the
  // short grace period passes).
  useEffect(() => {
    if (paperSeconds !== 0 || !view || view.status !== "IN_PROGRESS") return;
    let stopped = false;
    const startIndex = view.paperIndex;
    (async () => {
      await flushAll();
      while (!stopped) {
        await load();
        if (paperIndexRef.current !== startIndex || completedRef.current) return;
        await new Promise((r) => setTimeout(r, 2000));
      }
    })();
    return () => {
      stopped = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperSeconds === 0, view?.paperIndex]);

  async function submitPaper() {
    if (!view) return;
    setBusy(true);
    await flushAll();
    const res = await fetch(`/api/exam-sessions/${sessionId}/submit-paper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperIndex: view.paperIndex }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (res.ok) applyView(data);
    else setLoadError(data?.error ?? "Couldn't submit this section.");
  }

  async function advanceLocked() {
    if (!view) return;
    setBusy(true);
    await flushAll();
    const res = await fetch(`/api/exam-sessions/${sessionId}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromIndex: view.currentQuestionIndex }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (res.ok) applyView(data);
  }

  if (loadError) {
    return (
      <div className="text-center">
        <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">{loadError}</p>
        <button onClick={() => { setLoadError(null); load(); }} className="mt-4 rounded-md border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10">
          Try again
        </button>
      </div>
    );
  }

  if (!view || view.status === "COMPLETED" || !view.paper) {
    return <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />;
  }

  const paper = view.paper;
  const locked = paper.navigationMode === "LOCKED_SEQUENTIAL";
  const index = locked ? Math.min(view.currentQuestionIndex, view.questions.length - 1) : freeIndex;
  const question = view.questions[index];
  const isLast = index === view.questions.length - 1;
  const answeredCount = view.questions.filter((q) => answers[q.id]?.answer != null).length;
  const unanswered = view.questions.length - answeredCount;

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            Section {view.paperIndex + 1} of {view.paperCount}
          </div>
          <h2 className="font-display text-lg font-bold text-white">{paper.name}</h2>
        </div>
        <div className="flex gap-5">
          <Countdown label="Section" seconds={paperSeconds} />
          <Countdown label="Exam" seconds={examSeconds} warnBelow={300} />
        </div>
      </div>

      {paper.instructions && (
        <p className="mt-3 whitespace-pre-line rounded-md bg-white/5 px-3 py-2 text-xs leading-relaxed text-slate-300">{paper.instructions}</p>
      )}

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          {locked ? `Question ${index + 1} of ${view.questions.length} - answers can't be changed after you move on` : `${answeredCount} of ${view.questions.length} answered`}
        </span>
        <span aria-live="polite">
          {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "All changes saved" : saveStatus === "error" ? "Not saved - retrying" : ""}
        </span>
      </div>

      {!locked && !reviewing && (
        <nav className="mt-3 flex flex-wrap gap-1.5" aria-label="Questions in this section">
          {view.questions.map((q, i) => {
            const a = answers[q.id];
            return (
              <button
                key={q.id}
                onClick={() => setFreeIndex(i)}
                aria-current={i === index ? "step" : undefined}
                aria-label={`Question ${i + 1}${a?.answer != null ? ", answered" : ""}${a?.flagged ? ", flagged" : ""}`}
                className={`relative h-8 w-8 rounded-md text-xs font-semibold transition ${
                  i === index ? "bg-brand-500 text-white" : a?.answer != null ? "bg-white/20 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {i + 1}
                {a?.flagged && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400" />}
              </button>
            );
          })}
        </nav>
      )}

      {reviewing ? (
        <ReviewScreen
          questions={view.questions}
          answers={answers}
          onJump={(i) => {
            setFreeIndex(i);
            setReviewing(false);
          }}
          onBack={() => setReviewing(false)}
        />
      ) : question ? (
        <QuestionCard
          key={question.id}
          sessionId={sessionId}
          question={question}
          paperParts={paper.parts}
          local={answers[question.id] ?? { answer: null, flagged: false }}
          canFlag={!locked}
          micStream={micStream}
          notes={notes}
          setNotes={setNotes}
          onChange={(next) => queueSave(question.id, next)}
        />
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {locked ? (
          <span />
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setFreeIndex((i) => Math.max(0, i - 1))} disabled={index === 0 || reviewing} className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-40">
              Back
            </button>
            <button onClick={() => setFreeIndex((i) => Math.min(view.questions.length - 1, i + 1))} disabled={isLast || reviewing} className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-40">
              Next
            </button>
            {paper.allowReview && !reviewing && (
              <button onClick={() => setReviewing(true)} className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10">
                Review answers
              </button>
            )}
          </div>
        )}

        {locked && !isLast ? (
          <button onClick={advanceLocked} disabled={busy} className="btn-primary">
            {busy ? "Saving..." : "Next question"}
          </button>
        ) : (
          <button onClick={() => setConfirmSubmit(true)} disabled={busy} className="btn-primary">
            Submit section
          </button>
        )}
      </div>

      {confirmSubmit && (
        <div role="dialog" aria-modal="true" aria-labelledby="submit-title" className="mt-4 rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-slate-100">
          <p id="submit-title" className="font-semibold">Submit this section?</p>
          <p className="mt-1 text-slate-300">
            {unanswered > 0 ? `${unanswered} question${unanswered === 1 ? " is" : "s are"} still unanswered. ` : ""}
            You won&apos;t be able to come back to this section once it&apos;s submitted.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={submitPaper} disabled={busy} className="btn-primary">
              {busy ? "Submitting..." : "Yes, submit section"}
            </button>
            <button onClick={() => setConfirmSubmit(false)} className="rounded-md border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10">
              Keep working
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewScreen({
  questions,
  answers,
  onJump,
  onBack,
}: {
  questions: QuestionView[];
  answers: Record<string, LocalAnswer>;
  onJump: (index: number) => void;
  onBack: () => void;
}) {
  return (
    <div className="mt-4 rounded-lg bg-white p-5 text-ink-900">
      <h3 className="font-display font-bold">Review your answers</h3>
      <p className="mt-1 text-xs text-slate-500">Select a question to go back to it. Flagged questions are marked for you to check again.</p>
      <ul className="mt-4 divide-y divide-slate-100">
        {questions.map((q, i) => {
          const a = answers[q.id];
          return (
            <li key={q.id}>
              <button onClick={() => onJump(i)} className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:bg-slate-50">
                <span className="truncate">
                  <span className="mr-2 font-semibold text-slate-400">{i + 1}.</span>
                  {q.prompt}
                </span>
                <span className="flex shrink-0 gap-1.5">
                  {a?.flagged && <span className="badge badge-ai">Flagged</span>}
                  <span className={`badge ${a?.answer != null ? "badge-skill" : "badge-neutral"}`}>{a?.answer != null ? "Answered" : "Unanswered"}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button onClick={onBack} className="btn-secondary mt-4">
        Back to questions
      </button>
    </div>
  );
}

function QuestionCard({
  sessionId,
  question,
  paperParts,
  local,
  canFlag,
  micStream,
  notes,
  setNotes,
  onChange,
}: {
  sessionId: string;
  question: QuestionView;
  paperParts: { partId: string; name: string; instructions: string | null; prepSeconds: number | null; responseSeconds: number | null }[];
  local: LocalAnswer;
  canFlag: boolean;
  micStream: MediaStream | null;
  notes: Record<string, Set<string>>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, Set<string>>>>;
  onChange: (next: LocalAnswer) => void;
}) {
  const part = paperParts.find((p) => p.partId === question.partId);
  const group = question.itemGroup;
  const stimulusText = group?.type === "PASSAGE" ? group.text : question.passage;
  const noteKey = group?.id ?? question.id;
  const isHighlightAnswer = question.type === "HIGHLIGHT_WORDS";

  // HIGHLIGHT_WORDS: the selected words are the answer. Restoring after a
  // refresh re-selects every occurrence of each saved word - the grader
  // compares word SETS, so this is equivalent for scoring.
  const answerWords = new Set(Array.isArray(local.answer) ? (local.answer as string[]).map((w) => w.toLowerCase()) : []);
  const [answerKeys, setAnswerKeys] = useState<Set<string>>(() => new Set());
  const [answerKeysRestored, setAnswerKeysRestored] = useState(false);

  function selectedForPassage(text: string): Set<string> {
    if (!isHighlightAnswer) return notes[noteKey] ?? new Set();
    if (!answerKeysRestored && answerWords.size > 0) {
      const restored = new Set<string>();
      text.split(/\n+/).forEach((para, pi) =>
        para.split(/(\s+)/).forEach((token, ti) => {
          const w = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase();
          if (w && answerWords.has(w)) restored.add(`${pi}:${ti}`);
        })
      );
      return restored;
    }
    return answerKeys;
  }

  function toggleWord(text: string, key: string, word: string) {
    if (!isHighlightAnswer) {
      setNotes((n) => {
        const next = new Set(n[noteKey] ?? []);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return { ...n, [noteKey]: next };
      });
      return;
    }
    const current = new Set(selectedForPassage(text));
    if (current.has(key)) current.delete(key);
    else current.add(key);
    setAnswerKeys(current);
    setAnswerKeysRestored(true);
    const words = new Set<string>();
    text.split(/\n+/).forEach((para, pi) =>
      para.split(/(\s+)/).forEach((token, ti) => {
        if (current.has(`${pi}:${ti}`)) {
          const w = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
          if (w) words.add(w);
        }
      })
    );
    void word;
    onChange({ ...local, answer: words.size ? [...words] : null });
  }

  return (
    <div className="mt-4 rounded-lg bg-white p-6 text-ink-900">
      {part && (
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-700">
          {part.name}
          {part.instructions && <p className="mt-1 whitespace-pre-line text-xs font-normal normal-case tracking-normal text-slate-500">{part.instructions}</p>}
        </div>
      )}

      {group?.type === "AUDIO" && group.hasAsset && (
        <div className="mb-4">
          <AudioPlayer sessionId={sessionId} itemGroupId={group.id} playLimit={group.playLimit} initialPlaysUsed={group.playsUsed} />
        </div>
      )}
      {(group?.type === "IMAGE" || group?.type === "CHART") && group.hasAsset && (
        // eslint-disable-next-line @next/next/no-img-element -- authenticated, no-store API stream; next/image would cache it
        <img src={`/api/exam-sessions/${sessionId}/assets/${group.id}`} alt={group.title ?? "Question image"} className="mb-4 max-h-80 w-full rounded-md border border-slate-200 object-contain" />
      )}
      {group?.type === "VIDEO" && group.hasAsset && (
        <video src={`/api/exam-sessions/${sessionId}/assets/${group.id}`} controls className="mb-4 w-full rounded-md" />
      )}
      {group && group.type !== "PASSAGE" && group.text && <p className="mb-4 text-sm text-slate-600">{group.text}</p>}
      {/* A question's own audio/picture spec - the same renderer as the mock test. */}
      {question.stimulus && <StimulusView stimulus={question.stimulus} resetKey={question.id} />}

      {stimulusText && (
        <div className="mb-4 max-h-80 overflow-y-auto rounded-md bg-slate-50 p-4">
          {group?.title && <h4 className="mb-2 font-display font-semibold">{group.title}</h4>}
          <PassageView
            text={stimulusText}
            mode={isHighlightAnswer ? "answer" : "notes"}
            selected={selectedForPassage(stimulusText)}
            onToggle={(key, word) => toggleWord(stimulusText, key, word)}
          />
        </div>
      )}

      <h3 className="whitespace-pre-line font-display font-bold">{question.prompt}</h3>

      {question.type === "TIMED_SPEAKING" ? (
        <TimedSpeaking
          micStream={micStream}
          prepSeconds={part?.prepSeconds ?? 30}
          responseSeconds={part?.responseSeconds ?? 60}
          alreadyAnswered={local.answer != null}
          onRecorded={(recordingId) => onChange({ ...local, answer: { recordingId } })}
        />
      ) : isHighlightAnswer ? (
        <p className="mt-3 text-xs text-slate-500">Select the words in the passage above that answer this question.</p>
      ) : (
        <QuestionInput
          type={question.type}
          prompt={question.prompt}
          options={question.options}
          value={local.answer}
          onChange={(answer) => onChange({ ...local, answer })}
        />
      )}

      {canFlag && (
        <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={local.flagged} onChange={(e) => onChange({ ...local, flagged: e.target.checked })} />
          Flag this question to review later
        </label>
      )}
    </div>
  );
}
