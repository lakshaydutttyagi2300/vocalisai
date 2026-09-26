"use client";

import { wordCount } from "@/lib/question-types/graders/long-writing";

// One input per question type in the P1-C registry. Every value passed to
// onChange is already in that type's answer-schema shape (the server
// re-validates it); `null` means "no answer" and clears any saved one.
// Types needing a passage or recording (HIGHLIGHT_WORDS, TIMED_SPEAKING)
// are rendered by the parent, since they need more than an input.

const TFNG = ["TRUE", "FALSE", "NOT_GIVEN"];
const YNNG = ["YES", "NO", "NOT_GIVEN"];
const ENUM_LABELS: Record<string, string> = { TRUE: "True", FALSE: "False", NOT_GIVEN: "Not given", YES: "Yes", NO: "No" };

export function blankCount(prompt: string): number {
  return Math.max(1, (prompt.match(/_{3,}/g) ?? []).length);
}

function Choice({ options, value, onChange, labels }: { options: string[]; value: unknown; onChange: (v: string) => void; labels?: Record<string, string> }) {
  return (
    <div className="mt-4 space-y-2" role="radiogroup">
      {options.map((opt) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === opt}
          key={opt}
          onClick={() => onChange(opt)}
          className={`block w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 ${
            value === opt ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

export function QuestionInput({
  type,
  prompt,
  options,
  value,
  onChange,
}: {
  type: string;
  prompt: string;
  options: string[] | null;
  value: unknown;
  onChange: (answer: unknown) => void;
}) {
  switch (type) {
    case "MULTIPLE_CHOICE":
    case "READING_COMPREHENSION":
    case "LISTENING_COMPREHENSION":
    case "MATCHING":
      return <Choice options={options ?? []} value={value} onChange={onChange} />;

    case "TRUE_FALSE_NOT_GIVEN":
      return <Choice options={TFNG} value={value} onChange={onChange} labels={ENUM_LABELS} />;

    case "YES_NO_NOT_GIVEN":
      return <Choice options={YNNG} value={value} onChange={onChange} labels={ENUM_LABELS} />;

    case "MULTI_SELECT": {
      const selected = new Set(Array.isArray(value) ? (value as string[]) : []);
      return (
        <div className="mt-4 space-y-2">
          {(options ?? []).map((opt) => (
            <label key={opt} className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-4 py-2 text-sm hover:border-slate-300">
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => {
                  const next = new Set(selected);
                  if (next.has(opt)) next.delete(opt);
                  else next.add(opt);
                  onChange(next.size ? [...next] : null);
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }

    case "GAP_FILL": {
      const n = blankCount(prompt);
      const values = Array.isArray(value) ? (value as string[]) : Array(n).fill("");
      return (
        <div className="mt-4 space-y-2">
          {Array.from({ length: n }, (_, i) => (
            <label key={i} className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0 text-slate-500">Gap {i + 1}</span>
              <input
                className="input-field"
                value={values[i] ?? ""}
                onChange={(e) => {
                  const next = Array.from({ length: n }, (_, j) => (j === i ? e.target.value : values[j] ?? ""));
                  onChange(next.every((v) => v.trim() === "") ? null : next);
                }}
              />
            </label>
          ))}
        </div>
      );
    }

    case "LABELLING": {
      const labels = options ?? [];
      const map = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, string>) : {};
      return (
        <div className="mt-4 space-y-2">
          {labels.map((label) => (
            <label key={label} className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0 font-semibold text-slate-600">{label}</span>
              <input
                className="input-field"
                value={map[label] ?? ""}
                onChange={(e) => {
                  const next = { ...map, [label]: e.target.value };
                  if (!e.target.value.trim()) delete next[label];
                  onChange(Object.keys(next).length ? next : null);
                }}
              />
            </label>
          ))}
        </div>
      );
    }

    case "ORDERING": {
      const current = Array.isArray(value) ? (value as string[]) : options ?? [];
      const move = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= current.length) return;
        const next = [...current];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
      };
      return (
        <div className="mt-4">
          <ol className="space-y-2">
            {current.map((item, i) => (
              <li key={item} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <span className="w-5 text-slate-400">{i + 1}.</span>
                <span className="flex-1">{item}</span>
                <button type="button" aria-label={`Move ${item} up`} onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-2 hover:bg-slate-100 disabled:opacity-30">↑</button>
                <button type="button" aria-label={`Move ${item} down`} onClick={() => move(i, 1)} disabled={i === current.length - 1} className="rounded px-2 hover:bg-slate-100 disabled:opacity-30">↓</button>
              </li>
            ))}
          </ol>
          {!Array.isArray(value) && (
            <button type="button" onClick={() => onChange(current)} className="btn-secondary btn-sm mt-3">
              Keep this order as my answer
            </button>
          )}
        </div>
      );
    }

    case "NUMERIC_ENTRY":
      return (
        <input
          type="number"
          inputMode="decimal"
          className="input-field mt-4 max-w-xs"
          defaultValue={typeof value === "number" ? value : ""}
          onChange={(e) => {
            const n = e.target.value === "" ? NaN : Number(e.target.value);
            onChange(Number.isFinite(n) ? n : null);
          }}
        />
      );

    case "LONG_WRITING": {
      const text = typeof value === "string" ? value : "";
      return (
        <div className="mt-4">
          <textarea
            className="input-field min-h-[16rem]"
            value={text}
            onChange={(e) => onChange(e.target.value.trim() ? e.target.value : null)}
            placeholder="Write your response here..."
          />
          <p className="mt-1 text-right text-xs text-slate-500" aria-live="polite">
            {wordCount(text)} word{wordCount(text) === 1 ? "" : "s"}
          </p>
        </div>
      );
    }

    // DICTATION, SHORT_ANSWER, and anything else text-shaped.
    default:
      return (
        <textarea
          className="input-field mt-4"
          rows={3}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value.trim() ? e.target.value : null)}
          placeholder="Type your answer..."
        />
      );
  }
}
