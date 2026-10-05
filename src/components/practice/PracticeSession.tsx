"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  type Difficulty,
  type PracticeModeDef,
} from "@/lib/practice-taxonomy";
import { StimulusView } from "@/components/questions/StimulusView";
import { ArrowRight, Check, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import type { Stimulus } from "@/lib/question-stimulus";
import { MediaHero } from "@/components/ui/MediaHero";
import { ModePreview } from "@/components/ui/ContentPreview";

type Question = {
  id: string;
  category: string;
  difficulty: string;
  type: string;
  prompt: string;
  passage: string | null;
  stimulus?: Stimulus;
  options: string[] | null;
  timeLimitSeconds: number;
};

type Feedback = {
  isCorrect: boolean | null;
  score: number | null;
  correctAnswer: string | null;
  explanation: string | null;
};

type Suggestion = { direction: "up" | "down"; to: Difficulty; average: number; allowed: boolean };

type Stage = "pick-difficulty" | "loading" | "in-progress" | "finished" | "error";

export function PracticeSession({ mode, suggestedLevel = null }: { mode: PracticeModeDef; suggestedLevel?: Difficulty | null }) {
  const [stage, setStage] = useState<Stage>("pick-difficulty");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [responseText, setResponseText] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [results, setResults] = useState<Feedback[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const startedAtRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);

  const currentQuestion = questions[index];

  useEffect(() => {
    if (stage !== "in-progress" || !currentQuestion) return;

    setSecondsLeft(currentQuestion.timeLimitSeconds);
    startedAtRef.current = Date.now();
    submittedRef.current = false;

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          if (!submittedRef.current) submitAnswer(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, index]);

  // Move up / down a level, from the last few sessions (a suggestion only).
  function loadSuggestion() {
    setSuggestion(null);
    if (!difficulty) return;
    fetch(`/api/practice/level-suggestion?category=${mode.category}&difficulty=${difficulty}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSuggestion(data?.suggestion ?? null))
      .catch(() => {});
  }

  async function startSession(chosen: Difficulty) {
    setDifficulty(chosen);
    setSuggestion(null);
    setStage("loading");
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/practice/questions?category=${mode.category}&difficulty=${chosen}&count=5`
      );
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Couldn't load questions.");
        setStage("error");
        return;
      }

      if (!data.questions?.length) {
        setErrorMessage("No questions available for this difficulty yet.");
        setStage("error");
        return;
      }

      setQuestions(data.questions);
      setIndex(0);
      setResponseText("");
      setFeedback(null);
      setResults([]);
      setStage("in-progress");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStage("error");
    }
  }

  async function submitAnswer(timedOut = false) {
    if (submittedRef.current || !currentQuestion) return;
    submittedRef.current = true;
    setIsSubmitting(true);

    const timeTakenSeconds = Math.round((Date.now() - startedAtRef.current) / 1000);

    try {
      const res = await fetch("/api/practice/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          responseText: timedOut ? responseText || "" : responseText,
          timeTakenSeconds,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Couldn't save your answer.");
        setStage("error");
        return;
      }

      const fb: Feedback = {
        isCorrect: data.isCorrect,
        score: data.score,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
      };
      setFeedback(fb);
      setResults((r) => [...r, fb]);
    } catch {
      setErrorMessage("Network error while saving your answer.");
      setStage("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function nextQuestion() {
    if (index + 1 >= questions.length) {
      setStage("finished");
      loadSuggestion();
      return;
    }
    setIndex((i) => i + 1);
    setResponseText("");
    setFeedback(null);
  }

  if (stage === "pick-difficulty") {
    return (
      <div className="pb-20">
        <MediaHero back={{ label: "Back to Practice", href: "/practice" }} eyebrow="Practice" title={mode.label} subtitle={mode.description} stats={["Beginner to Expert", "Instant feedback"]} media={[]} visual={<ModePreview mode={mode} />} variant="split" size="sm" />
      <div className="page-container mt-10">
        <p className="text-base font-semibold text-fg">Choose a difficulty</p>
        <div className="mt-3 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {DIFFICULTIES.map((d) => (
            <button key={d} onClick={() => startSession(d)} className={`${d === suggestedLevel ? "btn-primary" : "btn-secondary"} btn-lg justify-between`}>
              {DIFFICULTY_LABELS[d]}
              <Icon as={ArrowRight} />
            </button>
          ))}
        </div>

        <ol aria-label="How it works" className="mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          {(
            [
              ["Pick a level", "Start where you're comfortable. You can move up or down any time."],
              ["Answer 5 questions", "One at a time, with feedback after each answer."],
              ["Build your rating", "Your answers count towards your skill ratings on My Skills."],
            ] as const
          ).map(([title, detail], i) => (
            <li key={title} className="card p-4">
              <span className="num text-xs font-semibold text-accent-strong">Step {i + 1}</span>
              <span className="mt-1 block font-semibold text-fg">{title}</span>
              <span className="mt-1 block text-sm text-fg-muted">{detail}</span>
            </li>
          ))}
        </ol>
      </div>
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-32 animate-pulse rounded-lg bg-slate-200" />
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
        <button onClick={() => setStage("pick-difficulty")} className="btn-secondary mt-4">
          <Icon as={RotateCcw} />
          Try again
        </button>
      </div>
    );
  }

  if (stage === "finished") {
    const scored = results.filter((r) => r.score !== null);
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-ink-950">Session complete</h1>
        {scored.length > 0 ? (
          <p className="mt-3 text-slate-600">
            You scored{" "}
            <span className="font-semibold text-ink-900">
              {scored.filter((r) => r.isCorrect).length} / {scored.length}
            </span>{" "}
            correct at {difficulty ? DIFFICULTY_LABELS[difficulty] : ""} level.
          </p>
        ) : (
          <p className="mt-3 text-slate-600">
            Your {results.length} response{results.length === 1 ? "" : "s"} were saved.
            Open-ended answers like these aren&apos;t marked automatically. Ask your AI Coach for
            feedback on how to improve them.
          </p>
        )}
        {suggestion && difficulty && (
          <div className="sheet mt-6 p-5 text-left">
            <p className="flex items-center gap-2 font-semibold text-ink-950">
              <Icon as={suggestion.direction === "up" ? TrendingUp : TrendingDown} className={suggestion.direction === "up" ? "text-green-700" : "text-amber-700"} />
              {suggestion.direction === "up" ? `Ready for ${DIFFICULTY_LABELS[suggestion.to]}?` : `Try ${DIFFICULTY_LABELS[suggestion.to]} for a while?`}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              You&apos;ve averaged {suggestion.average}% over your last 3 {DIFFICULTY_LABELS[difficulty]} sessions here.{" "}
              {suggestion.direction === "up" ? "Moving up will stretch you further." : "Building confidence one level down usually helps."} It&apos;s your choice.
            </p>
            {suggestion.allowed ? (
              <button onClick={() => startSession(suggestion.to)} className="btn-primary btn-sm mt-3">
                Practise at {DIFFICULTY_LABELS[suggestion.to]}
              </button>
            ) : (
              <Link href="/billing" className="btn-primary btn-sm mt-3">
                {DIFFICULTY_LABELS[suggestion.to]} is on paid plans
              </Link>
            )}
          </div>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={() => setStage("pick-difficulty")} className="btn-secondary">
            <Icon as={RotateCcw} />
            Practice again
          </button>
          <Link href="/dashboard" className="btn-primary">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // in-progress
  if (!currentQuestion) return null;

  const isChoice = currentQuestion.options && currentQuestion.options.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span className="flex items-center gap-2">
          Question {index + 1} of {questions.length}
          {difficulty && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">{DIFFICULTY_LABELS[difficulty]}</span>}
        </span>
        <span className={secondsLeft <= 10 ? "font-semibold text-red-600" : ""}>
          {secondsLeft}s left
        </span>
      </div>

      <div className="card mt-4 p-6">
        {/* Only the parsed stimulus is ever shown - never the raw passage. */}
        <StimulusView stimulus={currentQuestion.stimulus} resetKey={currentQuestion.id} />

        <h2 className="whitespace-pre-line font-medium text-ink-900">{currentQuestion.prompt}</h2>

        {!feedback ? (
          isChoice ? (
            <div className="mt-4 space-y-2">
              {currentQuestion.options!.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setResponseText(opt)}
                  className={`block w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 ${
                    responseText === opt
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={5}
              placeholder="Type your response..."
              className="input-field mt-4"
            />
          )
        ) : (
          <div className="mt-4">
            {feedback.score !== null && (
              <p
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  feedback.isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                {feedback.isCorrect ? "Correct." : `Not quite. Correct answer: ${feedback.correctAnswer}`}
              </p>
            )}
            {feedback.explanation && (
              <p className="mt-2 text-sm text-slate-600">{feedback.explanation}</p>
            )}
            {feedback.score === null && (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Response saved.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          {!feedback ? (
            <button
              onClick={() => submitAnswer(false)}
              disabled={!responseText.trim()}
              data-loading={isSubmitting || undefined}
              className="btn-primary"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
              <Icon as={Check} />
            </button>
          ) : (
            <button onClick={nextQuestion} className="btn-primary">
              {index + 1 >= questions.length ? "Finish" : "Next question"}
              <Icon as={ArrowRight} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
