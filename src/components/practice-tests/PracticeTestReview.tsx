"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Check, History, Minus, X } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import type { PracticeTestView } from "@/lib/practice-tests";

type Filter = "ALL" | "WRONG" | "UNANSWERED";

function formatAnswer(value: unknown): string {
  if (value === null || value === undefined) return "No answer";
  if (Array.isArray(value)) return value.map((v) => (Array.isArray(v) ? v.join(" / ") : String(v))).join(", ");
  if (typeof value === "object") return "value" in (value as object) ? String((value as { value: unknown }).value) : JSON.stringify(value);
  return String(value);
}

// After submitting: the score, then every question with your answer, the
// correct one, the explanation and your time.
export function PracticeTestReview({ test, onChange }: { test: PracticeTestView; onChange: (t: PracticeTestView) => void }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const answered = test.questions.filter((q) => q.answered);
  const correct = test.questions.filter((q) => q.isCorrect === true).length;
  const accuracy = answered.length > 0 ? Math.round((correct / answered.length) * 100) : 0;
  const totalTime = answered.reduce((s, q) => s + (q.timeTakenSeconds ?? 0), 0);
  const avgTime = answered.length > 0 ? Math.round(totalTime / answered.length) : 0;
  const shown = test.questions.filter((q) => (filter === "WRONG" ? q.answered && q.isCorrect === false : filter === "UNANSWERED" ? !q.answered : true));

  async function toggleBookmark(id: string, next: boolean) {
    onChange({ ...test, questions: test.questions.map((q) => (q.id === id ? { ...q, bookmarked: next } : q)) });
    await fetch("/api/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: id, bookmarked: next }) }).catch(() => null);
  }

  const stats: [string, string][] = [
    ["Score", `${test.scorePercent ?? 0}%`],
    ["Correct", `${correct} / ${test.totalCount}`],
    ["Accuracy", `${accuracy}%`],
    ["Avg. time", `${avgTime}s`],
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:px-6">
      <p className="eyebrow">Results</p>
      <h1 className="headline mt-3 text-3xl text-ink-950">{[test.exam?.name, test.subjectName, test.skillName].filter(Boolean).join(" · ") || "Your test"}</h1>
      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-white p-5">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="num mt-1 text-2xl font-semibold text-ink-950">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-slate-500">
        {answered.length} answered, {test.totalCount - answered.length} left blank. Accuracy counts answered questions only.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Show" className="flex gap-2">
          {(
            [
              ["ALL", "All"],
              ["WRONG", "Wrong"],
              ["UNANSWERED", "Unanswered"],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === key ? "border-accent bg-accent-soft text-fg" : "border-slate-200 bg-white text-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Link href="/practice-tests" className="btn-ghost btn-sm">
            <Icon as={History} />
            Test history
          </Link>
          {test.exam && (
            <Link href={test.exam.href} className="btn-primary btn-sm">
              Practise again
            </Link>
          )}
        </div>
      </div>

      <ol aria-label="Question review" className="mt-4 grid gap-3">
        {shown.map((q) => {
          const n = test.questions.indexOf(q) + 1;
          return (
            <li key={q.id} className="sheet p-5">
              <div className="flex items-start justify-between gap-4">
                <p className="flex items-center gap-2 text-xs font-semibold">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${q.isCorrect === true ? "bg-green-100 text-green-800" : q.isCorrect === false ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                    <Icon as={q.isCorrect === true ? Check : q.isCorrect === false ? X : Minus} size="xs" />
                  </span>
                  <span className="text-slate-500">
                    Question {n}
                    {q.skillName && ` · ${q.skillName}`}
                    {q.timeTakenSeconds !== null && ` · ${q.timeTakenSeconds}s`}
                  </span>
                </p>
                <button onClick={() => toggleBookmark(q.id, !q.bookmarked)} aria-pressed={q.bookmarked} aria-label={q.bookmarked ? "Remove bookmark" : "Bookmark"} className="btn-ghost btn-sm -mr-2 -mt-1">
                  <Icon as={q.bookmarked ? BookmarkCheck : Bookmark} className={q.bookmarked ? "text-amber-600" : undefined} />
                </button>
              </div>
              <p className="mt-3 whitespace-pre-line font-medium text-ink-950">{q.prompt}</p>
              <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Your answer</dt>
                  <dd className={q.isCorrect === false ? "text-red-700" : "text-ink-950"}>{formatAnswer(q.answer)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Correct answer</dt>
                  <dd className="text-green-800">{q.correctAnswer ?? "Not auto-marked"}</dd>
                </div>
              </dl>
              {q.explanation && <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{q.explanation}</p>}
            </li>
          );
        })}
        {shown.length === 0 && <li className="text-sm text-slate-500">Nothing to show here.</li>}
      </ol>
    </div>
  );
}
