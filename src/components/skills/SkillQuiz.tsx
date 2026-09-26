"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Lightbulb, Mic, RotateCcw, Target, X } from "lucide-react";
import { Icon, IconBadge } from "@/components/ui/Icon";
import { StimulusView } from "@/components/questions/StimulusView";
import { MasteryBadge } from "@/components/skills/MasteryBadge";
import type { Stimulus } from "@/lib/question-stimulus";
import type { Band } from "@/lib/skills/mastery";

// One screen for both Quick Drills (one skill) and "I'm weak in X"
// diagnostics (one category). Nothing is fetched - or charged - until the
// candidate presses Start. Every answer goes through the normal practice
// attempts route, which marks it and updates mastery.

type Question = {
  id: string;
  prompt: string;
  stimulus?: Stimulus;
  options: string[] | null;
  level: number | null;
  hint: string | null;
  skillId: string | null;
};

type Feedback = {
  isCorrect: boolean;
  correctAnswer: string | null;
  explanation: string | null;
  distractorReason: string | null;
  mastery: { score: number; band: Band; bandLabel: string; attempts: number } | null;
};

type Answered = { question: Question; chosen: string; feedback: Feedback };

type Loaded =
  | { kind: "drill" | "diagnostic"; questions: Question[]; drillToken: string | null; names: Record<string, string>; title: string }
  | { kind: "voice"; title: string; practice: { href: string; label: string } };

type Stage = "intro" | "loading" | "question" | "finished" | "error";

export type SkillQuizProps =
  | { kind: "drill"; skillId: string; title: string; subtitle: string; questionCount: number }
  | { kind: "diagnostic"; category: string; title: string; subtitle: string; questionCount: number };

const subcategoryOf = (skillId: string | null) => (skillId ? skillId.split(".").slice(0, 2).join(".") : "");

export function SkillQuiz(props: SkillQuizProps) {
  const [stage, setStage] = useState<Stage>("intro");
  const [data, setData] = useState<Loaded | null>(null);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [answered, setAnswered] = useState<Answered[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(Date.now());

  async function start() {
    setStage("loading");
    setError(null);
    const url = props.kind === "drill" ? `/api/skills/drill?skill=${encodeURIComponent(props.skillId)}` : `/api/skills/diagnostic?category=${encodeURIComponent(props.category)}`;
    try {
      const res = await fetch(url);
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Couldn't start. Please try again.");
        setStage("error");
        return;
      }
      if (body.kind === "voice") {
        setData({ kind: "voice", title: body.category.name, practice: body.practice });
        setStage("finished");
        return;
      }
      setData({
        kind: body.kind,
        questions: body.questions,
        drillToken: body.drillToken,
        names: body.names ?? {},
        title: body.kind === "drill" ? body.skill.name : body.category.name,
      });
      setAnswered([]);
      setIndex(0);
      resetQuestion();
      setStage("question");
    } catch {
      setError("Network error. Please try again.");
      setStage("error");
    }
  }

  function resetQuestion() {
    setChosen("");
    setShowHint(false);
    setFeedback(null);
    startedAt.current = Date.now();
  }

  async function submit() {
    if (!data || data.kind === "voice" || !chosen || submitting) return;
    const question = data.questions[index];
    setSubmitting(true);
    try {
      const res = await fetch("/api/practice/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          responseText: chosen,
          timeTakenSeconds: Math.round((Date.now() - startedAt.current) / 1000),
          drillToken: data.drillToken,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Couldn't save your answer.");
        setStage("error");
        return;
      }
      const fb: Feedback = {
        isCorrect: !!body.isCorrect,
        correctAnswer: body.correctAnswer,
        explanation: body.explanation,
        distractorReason: body.distractorReason ?? null,
        mastery: body.mastery ?? null,
      };
      setFeedback(fb);
      setAnswered((a) => [...a, { question, chosen, feedback: fb }]);
    } catch {
      setError("Network error while saving your answer.");
      setStage("error");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (!data || data.kind === "voice") return;
    if (index + 1 >= data.questions.length) {
      setStage("finished");
      return;
    }
    setIndex((i) => i + 1);
    resetQuestion();
  }

  const back = (
    <Link href="/skills" className="btn-ghost btn-sm -ml-3">
      <Icon as={ArrowLeft} />
      Back to my skills
    </Link>
  );

  if (stage === "intro" || stage === "loading") {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        {back}
        <div className="mt-4 flex items-start gap-4">
          <IconBadge as={Target} />
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-950">{props.title}</h1>
            <p className="mt-1 text-sm text-slate-600">{props.subtitle}</p>
          </div>
        </div>
        <ul className="mt-6 space-y-2 text-sm text-slate-700">
          <li className="flex gap-2"><Icon as={Check} className="mt-0.5 text-brand-600" />About {props.questionCount} questions, easiest first</li>
          <li className="flex gap-2"><Icon as={Check} className="mt-0.5 text-brand-600" />Instant feedback after each answer - including why a wrong option is wrong</li>
          <li className="flex gap-2"><Icon as={Check} className="mt-0.5 text-brand-600" />Counts as one practice session, and updates your skill scores</li>
        </ul>
        <button onClick={start} className="btn-primary btn-lg mt-8" data-loading={stage === "loading" || undefined} disabled={stage === "loading"}>
          {stage === "loading" ? "Getting questions..." : props.kind === "drill" ? "Start drill" : "Start check"}
          <Icon as={ArrowRight} />
        </button>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        {back}
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
        <button onClick={() => setStage("intro")} className="btn-secondary mt-4">
          <Icon as={RotateCcw} />
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  if (data.kind === "voice") {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        {back}
        <h1 className="mt-4 font-display text-2xl font-bold text-ink-950">{data.title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          This is a speaking skill, so it&apos;s checked by recording real answers rather than a quiz. Each recorded answer you have analysed counts
          towards your {data.title} score.
        </p>
        <Link href={data.practice.href} className="btn-primary mt-6">
          <Icon as={Mic} />
          Go to {data.practice.label}
        </Link>
      </div>
    );
  }

  if (stage === "finished") {
    return <Summary data={data} answered={answered} kind={props.kind} onRestart={() => setStage("intro")} back={back} />;
  }

  const q = data.questions[index];
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
        <span className="font-medium text-ink-900">{data.title}</span>
        <span>
          Question {index + 1} of {data.questions.length}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" role="presentation">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(index / data.questions.length) * 100}%` }} />
      </div>

      <div className="card mt-5 p-6">
        {q.skillId && data.names[q.skillId] && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {data.names[q.skillId]}
            {q.level ? ` · Level ${q.level}` : ""}
          </p>
        )}
        <StimulusView stimulus={q.stimulus} resetKey={q.id} />
        <h2 className="whitespace-pre-line font-medium leading-relaxed text-ink-900">{q.prompt}</h2>

        <div className="mt-4 space-y-2" role="radiogroup" aria-label="Answer options">
          {(q.options ?? []).map((opt) => {
            const picked = chosen === opt;
            let cls = picked ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 hover:border-slate-300";
            if (feedback) {
              if (opt === feedback.correctAnswer) cls = "border-emerald-500 bg-emerald-50 text-emerald-800";
              else if (picked) cls = "border-red-400 bg-red-50 text-red-700";
              else cls = "border-slate-200 text-slate-500";
            }
            return (
              <button
                key={opt}
                role="radio"
                aria-checked={picked}
                disabled={!!feedback}
                onClick={() => setChosen(opt)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 ${cls}`}
              >
                <span>{opt}</span>
                {feedback && opt === feedback.correctAnswer && <Icon as={Check} className="text-emerald-600" />}
                {feedback && picked && opt !== feedback.correctAnswer && <Icon as={X} className="text-red-600" />}
              </button>
            );
          })}
        </div>

        {!feedback && q.hint && (
          <div className="mt-4">
            {showHint ? (
              <p className="flex gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <Icon as={Lightbulb} className="mt-0.5" />
                {q.hint}
              </p>
            ) : (
              <button onClick={() => setShowHint(true)} className="btn-ghost btn-sm -ml-3">
                <Icon as={Lightbulb} />
                Show a hint
              </button>
            )}
          </div>
        )}

        {feedback && (
          <div className="mt-5 space-y-2" aria-live="polite">
            <p className={`rounded-md px-3 py-2 text-sm font-semibold ${feedback.isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
              {feedback.isCorrect ? "Correct!" : `Not quite - the answer is ${feedback.correctAnswer}.`}
            </p>
            {!feedback.isCorrect && feedback.distractorReason && (
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Why &ldquo;{chosen}&rdquo; is wrong: </span>
                {feedback.distractorReason}
              </p>
            )}
            {feedback.explanation && (
              <p className="whitespace-pre-line text-sm text-slate-600">
                <span className="font-semibold text-slate-700">How to get it: </span>
                {feedback.explanation}
              </p>
            )}
            {feedback.mastery && q.skillId && (
              <p className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                {data.names[q.skillId] ?? "This skill"}:
                <MasteryBadge band={feedback.mastery.band} score={feedback.mastery.score} />
                {feedback.mastery.band === "UNRATED" && <span>({Math.max(0, 5 - feedback.mastery.attempts)} more answers to get a rating)</span>}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          {!feedback ? (
            <button onClick={submit} disabled={!chosen} data-loading={submitting || undefined} className="btn-primary">
              {submitting ? "Checking..." : "Check answer"}
              <Icon as={Check} />
            </button>
          ) : (
            <button onClick={next} className="btn-primary">
              {index + 1 >= data.questions.length ? "See results" : "Next question"}
              <Icon as={ArrowRight} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Summary({
  data,
  answered,
  kind,
  onRestart,
  back,
}: {
  data: Extract<Loaded, { kind: "drill" | "diagnostic" }>;
  answered: Answered[];
  kind: "drill" | "diagnostic";
  onRestart: () => void;
  back: React.ReactNode;
}) {
  const right = answered.filter((a) => a.feedback.isCorrect).length;

  // Group by subcategory (diagnostic) or by exact skill (drill).
  const groups = new Map<string, { right: number; total: number; mastery: Feedback["mastery"] }>();
  for (const a of answered) {
    const key = kind === "diagnostic" ? subcategoryOf(a.question.skillId) : a.question.skillId ?? "";
    const g = groups.get(key) ?? { right: 0, total: 0, mastery: null };
    g.total++;
    if (a.feedback.isCorrect) g.right++;
    if (a.feedback.mastery) g.mastery = a.feedback.mastery;
    groups.set(key, g);
  }
  const rows = [...groups.entries()].map(([id, g]) => ({ id, name: data.names[id] ?? id, ...g, pct: g.right / g.total }));
  rows.sort((a, b) => a.pct - b.pct);
  const weakest = rows.filter((r) => r.pct < 1 && r.id).slice(0, 3);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {back}
      <h1 className="mt-4 font-display text-2xl font-bold text-ink-950">{kind === "drill" ? "Drill complete" : "Your results"}</h1>
      <p className="mt-1 text-slate-600">
        {data.title}: <span className="font-semibold text-ink-900">{right} of {answered.length}</span> correct.
      </p>

      <div className="card mt-6 divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="text-sm font-semibold text-ink-900">{r.name}</p>
              <p className="text-xs text-slate-500">
                {r.right} of {r.total} correct
              </p>
            </div>
            {kind === "diagnostic" ? (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.pct >= 1 ? "bg-emerald-50 text-emerald-700" : r.pct >= 0.5 ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"}`}>
                {r.pct >= 1 ? "Looks strong" : r.pct >= 0.5 ? "Some gaps" : "Needs work"}
              </span>
            ) : (
              r.mastery && <MasteryBadge band={r.mastery.band} score={r.mastery.score} />
            )}
          </div>
        ))}
      </div>

      {kind === "diagnostic" && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-ink-950">Recommended drills</h2>
          {weakest.length === 0 ? (
            <p className="mt-1 text-sm text-slate-600">No gaps found in this check - try a harder drill from your skills page.</p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {weakest.map((r) => (
                <Link key={r.id} href={`/skills/drill/${encodeURIComponent(r.id)}`} className="card block p-4 transition hover:border-brand-300 hover:shadow-md">
                  <p className="font-semibold text-ink-900">{r.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    You got {r.right} of {r.total} - a short drill will target this.
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                    Start drill <Icon as={ArrowRight} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <button onClick={onRestart} className="btn-secondary">
          <Icon as={RotateCcw} />
          {kind === "drill" ? "Drill again" : "Take the check again"}
        </button>
        <Link href="/skills" className="btn-primary">
          See all my skills
          <Icon as={ArrowRight} />
        </Link>
      </div>
    </div>
  );
}
