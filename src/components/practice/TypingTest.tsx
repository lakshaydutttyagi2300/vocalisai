"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, RotateCcw } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { TYPING_PASSAGES, type TypingPassage } from "@/lib/typing/passages";
import { JOB_TARGET, MIN_SECONDS, TEST_SECONDS, scoreTyping } from "@/lib/typing/scoring";

interface SavedResult {
  passageKey: string;
  durationSeconds: number;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  createdAt: string;
}

type Phase = "ready" | "running" | "saving" | "done";

function pickPassage(previous?: string): TypingPassage {
  const choices = TYPING_PASSAGES.filter((p) => p.key !== previous);
  return choices[Math.floor(Math.random() * choices.length)];
}

export function TypingTest() {
  const [passage, setPassage] = useState<TypingPassage>(TYPING_PASSAGES[0]);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("ready");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<{ result: SavedResult; verdict: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedResult[]>([]);
  const box = useRef<HTMLTextAreaElement>(null);

  // A random passage after the first render (the server and browser must agree on the first one).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off random choice after hydration
  useEffect(() => setPassage(pickPassage()), []);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/typing-results").catch(() => null);
    if (res?.ok) setHistory(((await res.json()) as { results: SavedResult[] }).results);
  }, []);
  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const elapsed = startedAt ? Math.min(TEST_SECONDS, Math.max(0, Math.round((now - startedAt) / 1000))) : 0;
  // Live figures: steadied over the first few seconds; after the test, the saved result.
  const live = scoreTyping(passage.text, typed, Math.max(elapsed, 5));
  const saved = result?.result ?? null;
  const speedShown = saved ? saved.netWpm : phase === "ready" ? 0 : live.netWpm;
  const accuracyShown = saved ? saved.accuracy : phase === "ready" ? 0 : live.accuracy;
  const ended = phase === "saving" || phase === "done";
  const target = passage.text.split(" ");
  const typedWords = typed.trim() ? typed.trim().split(/\s+/) : [];

  const finish = useCallback(async () => {
    if (phase !== "running" || !startedAt) return;
    setPhase("saving");
    const seconds = Math.max(MIN_SECONDS, Math.min(TEST_SECONDS, Math.round((Date.now() - startedAt) / 1000)));
    try {
      const res = await fetch("/api/typing-results", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passageKey: passage.key, typed, seconds }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Your result couldn't be saved. Please try again.");
      setResult(body);
      setPhase("done");
      void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your result couldn't be saved. Please try again.");
      setPhase("done");
    }
  }, [phase, startedAt, passage.key, typed, loadHistory]);

  // The clock: ticks while running; time up ends the test.
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the test ends when the clock runs out
    if (phase === "running" && elapsed >= TEST_SECONDS) void finish();
  }, [phase, elapsed, finish]);

  function onType(value: string) {
    if (phase === "done" || phase === "saving") return;
    if (phase === "ready") {
      if (!value) return;
      const t = Date.now();
      setStartedAt(t);
      setNow(t);
      setPhase("running");
    }
    setTyped(value);
    // Finished the passage: the last word typed and followed by nothing more to type.
    const done = value.trim().split(/\s+/);
    if (done.length >= target.length && (value.endsWith(" ") || done[target.length - 1] === target[target.length - 1])) {
      setTimeout(() => void finish(), 0);
    }
  }

  function restart() {
    setPassage(pickPassage(passage.key));
    setTyped("");
    setPhase("ready");
    setStartedAt(null);
    setResult(null);
    setError(null);
    setTimeout(() => box.current?.focus(), 0);
  }

  return (
    <div className="grid gap-6">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="eyebrow text-slate-500">{passage.kind}</span>
          <span className="num text-sm font-semibold text-ink-900" aria-live="off">
            {ended ? "Finished" : phase === "ready" ? `${TEST_SECONDS / 60}:00 left` : `${Math.floor((TEST_SECONDS - elapsed) / 60)}:${String((TEST_SECONDS - elapsed) % 60).padStart(2, "0")} left`}
          </span>
        </div>
        <p className="mt-3 text-base leading-relaxed text-ink-900 sm:text-lg" aria-label="Text to type">
          {target.map((w, i) => {
            const state = i < typedWords.length - (typed.endsWith(" ") ? 0 : 1) ? (typedWords[i] === w ? "ok" : "bad") : i === typedWords.length - (typed.endsWith(" ") ? 0 : 1) ? "now" : "todo";
            return (
              <span key={i} className={state === "ok" ? "text-green-700" : state === "bad" ? "rounded bg-red-50 text-red-700 underline" : state === "now" ? "rounded bg-brand-50 underline" : ""}>
                {w}{" "}
              </span>
            );
          })}
        </p>
        <label htmlFor="typing-box" className="mt-5 block text-sm font-medium text-ink-900">
          Type the text above here. The clock starts when you press the first key.
        </label>
        <textarea
          id="typing-box"
          ref={box}
          value={typed}
          onChange={(e) => onType(e.target.value)}
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          disabled={phase === "saving" || phase === "done"}
          rows={5}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          className="mt-2 w-full rounded-xl border border-line bg-surface p-3 text-base text-ink-900 focus:border-brand-400 focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
          <span>
            Speed <span className="num font-semibold text-ink-900">{speedShown}</span> words/min
          </span>
          <span>
            Accuracy <span className="num font-semibold text-ink-900">{accuracyShown}%</span>
          </span>
          {phase === "running" && (
            <button type="button" onClick={() => void finish()} className="btn-secondary btn-sm ml-auto">
              Finish now
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">Pasting is switched off. Most chat, email and back-office jobs ask for about {JOB_TARGET.netWpm} words per minute at {JOB_TARGET.accuracy}% accuracy.</p>
      </section>

      {phase === "saving" && <p className="text-sm text-slate-600">Working out your result...</p>}
      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {saved && (
        <section className="card p-5 sm:p-6" aria-live="polite">
          <h2 className="font-display text-lg font-bold text-ink-950">Your result</h2>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              ["Net speed", `${saved.netWpm}`, "words/min"],
              ["Accuracy", `${saved.accuracy}%`, "of words right"],
              ["Gross speed", `${saved.grossWpm}`, "words/min typed"],
            ].map(([label, value, unit]) => (
              <div key={label} className="rounded-xl bg-surface-muted p-3">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="num mt-1 font-display text-2xl font-bold text-ink-950">{value}</dd>
                <dd className="text-xs text-slate-500">{unit}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-ink-900">{result!.verdict}</p>
        </section>
      )}
      {(phase === "done" || phase === "running") && (
        <button type="button" onClick={restart} className="btn-primary w-full sm:w-auto">
          <Icon as={RotateCcw} />
          {phase === "running" ? "Start again with a new text" : "Try another text"}
        </button>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold text-ink-950">Your recent tests</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Net speed</th>
                  <th className="py-2 pr-4 font-medium">Accuracy</th>
                </tr>
              </thead>
              <tbody className="num divide-y divide-slate-100">
                {history.slice(0, 5).map((h) => (
                  <tr key={h.createdAt}>
                    <td className="py-2 pr-4 text-slate-600">{new Date(h.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                    <td className="py-2 pr-4 text-ink-900">{h.netWpm} words/min</td>
                    <td className="py-2 pr-4 text-ink-900">{h.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Icon as={Keyboard} />
        Your typing result also counts towards your International Process readiness score.
      </p>
    </div>
  );
}
