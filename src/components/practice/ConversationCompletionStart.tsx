"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, MessagesSquare, PlayCircle } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { DIFFICULTY_LABELS, type Difficulty } from "@/lib/practice-taxonomy";

export interface LevelCount {
  difficulty: string;
  count: number;
}

const LEVELS: Difficulty[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const LEVEL_NOTES: Record<string, string> = {
  BEGINNER: "One reply is clearly the professional one.",
  INTERMEDIATE: "Two replies look reasonable - pick the more complete one.",
  ADVANCED: "Every reply is polite; find the one that handles it best.",
};
const QUESTIONS_PER_TEST = 10;
const SECONDS_PER_QUESTION = 45;

/** Rules, level choice and Start for the conversation completion test (a catalogue practice test). */
export function ConversationCompletionStart({ subjectId, skillId, levels }: { subjectId: string | null; skillId: string | null; levels: LevelCount[] }) {
  const router = useRouter();
  const available = (d: string) => levels.find((l) => l.difficulty === d)?.count ?? 0;
  const [level, setLevel] = useState<Difficulty>(LEVELS.find((d) => available(d) >= 5) ?? "BEGINNER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!subjectId || !skillId || levels.every((l) => l.count < 5)) {
    return (
      <section className="card p-5 text-sm text-slate-600 sm:p-6">
        <h2 className="font-display text-lg font-bold text-ink-950">Coming soon</h2>
        <p className="mt-2">The conversation questions are being added. Please check back shortly.</p>
      </section>
    );
  }

  const count = Math.min(QUESTIONS_PER_TEST, available(level));

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/practice-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Always timed: answers are saved and only checked when the test is submitted, so nothing is revealed early.
        body: JSON.stringify({ subjectId, skillId, difficulty: level, mode: "PRACTICE", timed: true, count }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.testId) throw new Error(body.error ?? "We couldn't start your test. Please try again.");
      router.push(`/practice-tests/${body.testId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't start your test. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-ink-950">How it works</h2>
        <ul className="mt-3 grid gap-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <Icon as={MessagesSquare} className="mt-0.5 flex-none text-brand-700" />
            Each question is a short conversation at work - with customers, colleagues or managers - that stops where someone has to reply.
          </li>
          <li className="flex gap-2">
            <Icon as={CheckCircle2} className="mt-0.5 flex-none text-brand-700" />
            Choose the most appropriate reply from A, B, C and D. Only one is the best answer. You can move back and forth and change answers until you submit.
          </li>
          <li className="flex gap-2">
            <Icon as={Clock} className="mt-0.5 flex-none text-brand-700" />
            {count} questions, {SECONDS_PER_QUESTION} seconds each (about {Math.round((count * SECONDS_PER_QUESTION) / 60)} minutes in total). Your score, and why each best reply is best, are shown only after you submit.
          </li>
        </ul>
      </section>

      <section className="card p-5 sm:p-6">
        <fieldset>
          <legend className="text-sm font-semibold text-ink-900">Level</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {LEVELS.map((d) => {
              const n = available(d);
              const off = n < 5;
              return (
                <label key={d} className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 ${off ? "cursor-not-allowed opacity-50" : "border-line"}`}>
                  <span className="flex items-center gap-2 font-semibold text-ink-900">
                    <input type="radio" name="level" value={d} checked={level === d} disabled={off} onChange={() => setLevel(d)} className="accent-brand-600" />
                    {DIFFICULTY_LABELS[d]}
                  </span>
                  <span className="text-xs text-slate-500">{LEVEL_NOTES[d]}</span>
                  <span className="text-xs text-slate-500">{n} questions</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <button type="button" onClick={() => void start()} disabled={busy} className="btn-primary mt-5 w-full sm:w-auto">
          <Icon as={PlayCircle} />
          {busy ? "Starting..." : "Start test"}
        </button>
        {error && <p className="mt-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      </section>
    </div>
  );
}
