"use client";

import { useMemo } from "react";

// Word-level passage renderer used two ways:
//  - "notes" mode: the candidate's own highlighter - purely a reading aid,
//    never sent to the server or graded.
//  - "answer" mode: for HIGHLIGHT_WORDS questions, where the selected
//    words ARE the answer (P1-C's highlight-words grader).
// Words are tokenized once; punctuation stays attached for display but
// is stripped from the value used as an answer.
export function PassageView({
  text,
  selected,
  onToggle,
  mode,
}: {
  text: string;
  selected: Set<string>;
  onToggle: (tokenKey: string, word: string) => void;
  mode: "notes" | "answer";
}) {
  const paragraphs = useMemo(() => text.split(/\n+/), [text]);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
      {mode === "notes" && <p className="text-[11px] text-slate-400">Tip: click words to highlight them while you read.</p>}
      {paragraphs.map((para, pi) => (
        <p key={pi}>
          {para.split(/(\s+)/).map((token, ti) => {
            if (/^\s+$/.test(token) || token === "") return token;
            const key = `${pi}:${ti}`;
            const word = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
            const on = selected.has(key);
            return (
              <button
                type="button"
                key={key}
                onClick={() => word && onToggle(key, word)}
                aria-pressed={on}
                className={`rounded px-0.5 transition ${
                  on ? (mode === "answer" ? "bg-brand-100 text-brand-900 ring-1 ring-brand-400" : "bg-amber-100 text-ink-900") : "hover:bg-slate-100"
                }`}
              >
                {token}
              </button>
            );
          })}
        </p>
      ))}
    </div>
  );
}
