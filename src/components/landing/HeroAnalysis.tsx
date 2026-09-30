"use client";

import { useEffect, useState } from "react";

// The hero's product visual: an example of what a speech analysis shows,
// built from the same parts as the real results page (transcript, filler
// words, a grammar fix, pace, the three-level ratings). It "plays" once:
// the transcript is marked up word by word, then the ratings settle.
const TRANSCRIPT: { text: string; mark?: "filler" | "fix" }[] = [
  { text: "Thank you for calling." },
  { text: " I" },
  { text: " um,", mark: "filler" },
  { text: " I" },
  { text: " will helping", mark: "fix" },
  { text: " you track the order today, and" },
  { text: " like,", mark: "filler" },
  { text: " confirm the delivery address first." },
];

const RATINGS = [
  { label: "Fluency", rating: "Adequate", value: 64 },
  { label: "Pronunciation", rating: "Strong", value: 86 },
  { label: "Grammar", rating: "Adequate", value: 58 },
  { label: "Vocabulary", rating: "Strong", value: 81 },
];

export default function HeroAnalysis() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => setStep(TRANSCRIPT.length + 1));
      return () => window.cancelAnimationFrame(frame);
    }
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setStep(i);
      if (i > TRANSCRIPT.length) window.clearInterval(timer);
    }, 420);
    return () => window.clearInterval(timer);
  }, []);

  const done = step > TRANSCRIPT.length;

  return (
    <figure className="relative mx-auto w-full max-w-[34rem]" aria-label="Example speech analysis">
      <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-white text-ink-900 shadow-[var(--shadow-float)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="min-w-0">
            <p className="eyebrow text-[0.65rem]">Speech analysis</p>
            <p className="truncate text-sm font-semibold text-ink-900">Customer service call · Intermediate</p>
          </div>
          <span className="flex-none rounded-full bg-slate-100 px-2.5 py-1 text-[0.7rem] font-semibold text-slate-600">Example</span>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[1fr_9.5rem]">
          <div className="min-w-0">
            <p className="eyebrow text-[0.62rem] text-slate-500">What you said</p>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-800">
              {TRANSCRIPT.map((part, i) => {
                const shown = i < step;
                const cls = !shown
                  ? "text-slate-300"
                  : part.mark === "filler"
                    ? "rounded bg-amber-100 px-0.5 text-amber-700"
                    : part.mark === "fix"
                      ? "rounded bg-red-50 px-0.5 text-red-700 underline decoration-red-300 decoration-wavy underline-offset-4"
                      : "";
                return (
                  <span key={i} className={`transition-colors duration-300 ${cls}`}>
                    {part.text}
                  </span>
                );
              })}
            </p>
            <div
              className={`mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"}`}
            >
              <p className="text-xs font-semibold text-slate-500">Grammar</p>
              <p className="mt-1 text-ink-800">
                <span className="text-red-700 line-through decoration-red-300">will helping</span>
                <span className="mx-1.5 text-slate-400">→</span>
                <span className="font-semibold text-green-700">will help</span>
              </p>
            </div>
          </div>

          <div className="flex flex-row gap-5 sm:flex-col sm:gap-4 sm:border-l sm:border-slate-100 sm:pl-5">
            <div>
              <p className="eyebrow text-[0.62rem] text-slate-500">Pace</p>
              <p className="num mt-1 text-3xl font-semibold text-ink-950">
                {done ? 142 : "—"}
                <span className="ml-1 text-xs font-medium text-slate-500">wpm</span>
              </p>
              <p className="text-xs text-slate-500">Balanced</p>
            </div>
            <div>
              <p className="eyebrow text-[0.62rem] text-slate-500">Fillers</p>
              <p className="num mt-1 text-3xl font-semibold text-ink-950">{done ? 2 : "—"}</p>
              <p className="text-xs text-slate-500">&ldquo;um&rdquo;, &ldquo;like&rdquo;</p>
            </div>
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-100 px-5 py-4">
          {RATINGS.map((r) => (
            <li key={r.label} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold text-ink-800">{r.label}</span>
                <span className={r.rating === "Strong" ? "font-semibold text-brand-700" : "font-semibold text-amber-700"}>{r.rating}</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-[width] duration-1000 ease-out ${r.rating === "Strong" ? "bg-brand-500" : "bg-amber-500"}`}
                  style={{ width: done ? `${r.value}%` : "0%" }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-3 text-center text-xs text-slate-400">An example of the feedback on a recorded answer.</figcaption>
    </figure>
  );
}
