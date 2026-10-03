"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mic, Sparkles, Timer } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useStillMedia } from "./media";
import { Waveform } from "./Waveform";

// Animated, labelled-as-example walkthroughs of the real VocalisAi screens.
// Each is driven by one tick counter that runs only while the demo is on
// screen; with reduced motion they show their finished state instead.

/** Ticks (every `ms`) through 0..length-1 and loops, only while visible. */
function useTicker(length: number, ms = 100, start = 0) {
  const ref = useRef<HTMLDivElement>(null);
  // Starts part-way through, so the first thing anyone sees already has content.
  const [tick, setTick] = useState(start);
  const [visible, setVisible] = useState(false);
  const still = useStillMedia();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    o.observe(el);
    return () => o.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || still) return;
    const id = window.setInterval(() => setTick((t) => (t + 1) % length), ms);
    return () => window.clearInterval(id);
  }, [visible, still, length, ms]);
  return { ref, tick: still ? length - 1 : tick, still };
}

const frame = "rounded-2xl border border-line bg-surface/90 shadow-[var(--shadow-float)] backdrop-blur-md";

const ANSWER = "So, um, in my last role I handled, like, twenty customer calls a day, and I always made sure the customer felt heard.".split(" ");
const FILLERS = new Set(["um,", "like,"]);

/** A spoken answer being analysed: recording, transcript, then ratings. 14 s loop. */
export function AnalysisDemo({ className = "" }: { className?: string }) {
  const { ref, tick } = useTicker(140, 100, 104);
  const recording = tick < 35;
  const words = recording ? 0 : Math.min(ANSWER.length, Math.floor((tick - 35) / 1.6));
  const rated = tick >= 75;
  const scores = [
    { name: "Pronunciation", band: "Strong", value: 86 },
    { name: "Fluency", band: "Adequate · 2 fillers", value: 64 },
    { name: "Grammar", band: "Strong", value: 90 },
    { name: "Pace", band: "142 wpm · balanced", value: 78 },
  ];
  return (
    <div ref={ref} className={`${frame} p-5 text-left ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-accent-strong">Speech analysis</p>
          <p className="mt-1 truncate text-sm font-semibold text-fg">Interview answer · Intermediate</p>
        </div>
        <span className="rounded-full border border-line px-2.5 py-1 text-[0.68rem] font-medium text-fg-muted">Example</span>
      </div>
      <div className="mt-4 flex h-12 items-center gap-3">
        <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${recording ? "bg-accent text-on-ink" : "bg-fg/10 text-fg-muted"}`}>
          <Icon as={Mic} />
        </span>
        <Waveform bars={36} paused={!recording} className={`h-10 flex-1 ${recording ? "" : "opacity-40"}`} />
        <span className="num w-10 flex-none text-right text-xs text-fg-muted">0:{String(Math.min(18, Math.floor(tick / 2))).padStart(2, "0")}</span>
      </div>
      <p className="mt-4 min-h-[4.5rem] text-sm leading-relaxed text-fg-muted">
        {ANSWER.map((w, i) => (
          <span key={i} className={`transition-opacity duration-300 ${i < words ? "opacity-100" : "opacity-0"}`}>
            {FILLERS.has(w) ? <mark className="rounded bg-accent-soft px-0.5 text-accent-strong">{w}</mark> : w}{" "}
          </span>
        ))}
      </p>
      <ul className="mt-4 grid gap-2.5 border-t border-line pt-4">
        {scores.map((s, i) => (
          <li key={s.name} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 text-xs">
            <span className="text-fg-muted">{s.name}</span>
            <span className="relative h-1.5 overflow-hidden rounded-full bg-fg/10">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-700 ease-out"
                style={{ width: rated ? `${s.value}%` : "0%", transitionDelay: `${i * 140}ms` }}
              />
            </span>
            <span className={`col-start-2 -mt-1 text-[0.68rem] text-fg-subtle transition-opacity duration-500 ${rated ? "opacity-100" : "opacity-0"}`}>{s.band}</span>
          </li>
        ))}
      </ul>
      <p className={`mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs text-fg-muted transition-opacity duration-500 ${tick >= 100 ? "opacity-100" : "opacity-0"}`}>
        Tip: swap &ldquo;um&rdquo; for a half-second pause. It sounds more confident.
      </p>
    </div>
  );
}

const QUESTION = "Tell me about a time you handled an upset customer.";
const REPLY = "A customer's order arrived damaged. I apologised, sent a replacement the same day and followed up the next morning.".split(" ");

/** Question -> your spoken answer -> a follow-up and feedback. 15 s loop. */
export function ConversationDemo({ className = "" }: { className?: string }) {
  const { ref, tick } = useTicker(150, 100, 104);
  const words = Math.max(0, Math.min(REPLY.length, Math.floor((tick - 20) / 2)));
  const followUp = tick >= 80;
  const feedback = tick >= 100;
  return (
    <div ref={ref} className={`${frame} p-5 text-left ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-accent-strong">AI interview</p>
        <span className="rounded-full border border-line px-2.5 py-1 text-[0.68rem] font-medium text-fg-muted">Example</span>
      </div>
      <div className="mt-4 grid gap-3 text-sm">
        <p className="max-w-[88%] rounded-2xl rounded-bl-md bg-accent-softer px-4 py-3 text-fg">{QUESTION}</p>
        <p className={`ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-accent px-4 py-3 text-on-ink transition-opacity duration-300 ${words > 0 ? "opacity-100" : "opacity-0"}`}>
          {REPLY.slice(0, Math.max(words, 1)).join(" ")}
          {words < REPLY.length && words > 0 && <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-bg" />}
        </p>
        <p className={`max-w-[88%] rounded-2xl rounded-bl-md bg-accent-softer px-4 py-3 text-fg transition-all duration-500 ${followUp ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
          Good. What would you do differently next time?
        </p>
      </div>
      <div className={`mt-4 flex flex-wrap gap-2 border-t border-line pt-4 transition-opacity duration-500 ${feedback ? "opacity-100" : "opacity-0"}`}>
        {["Clear structure", "Specific example", "Add the result"].map((t, i) => (
          <span key={t} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${i < 2 ? "bg-accent-softer text-fg-muted" : "bg-accent-soft text-accent-strong"}`}>
            <Icon as={i < 2 ? Check : Sparkles} size="xs" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

const STEPS = ["Choose", "Answer", "Review"] as const;

/** Choose a test -> answer a question -> review the result. 5 s per step. */
export function WalkthroughDemo({ className = "" }: { className?: string }) {
  const { ref, tick, still } = useTicker(150, 100, 40);
  const step = still ? 2 : Math.floor(tick / 50);
  const local = tick % 50;
  return (
    <div ref={ref} className={`${frame} overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 border-b border-line px-5 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-fg/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-fg/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-fg/10" />
        <span className="ml-3 truncate text-xs text-fg-subtle">vocalisai.vercel.app/explore/company-hiring-assessments/tcs-nqt</span>
      </div>
      <div className="grid grid-cols-3 border-b border-line text-xs">
        {STEPS.map((s, i) => (
          <div key={s} className="relative px-5 py-3">
            <span className={i === step ? "font-semibold text-fg" : "text-fg-subtle"}>
              {i + 1}. {s}
            </span>
            {i === step && <span className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-accent" style={{ transform: `scaleX(${still ? 1 : local / 49})` }} />}
          </div>
        ))}
      </div>
      <div className="relative min-h-[17rem] p-5 text-sm">
        {step === 0 && (
          <div className="grid gap-4">
            <p className="text-fg-muted">TCS NQT · Reasoning Ability</p>
            <div className="flex flex-wrap gap-2">
              {["Syllogism", "Seating Arrangement", "Blood Relations", "Coding-Decoding", "Series"].map((t, i) => (
                <span key={t} className={`rounded-full border px-3 py-1 text-xs transition-colors ${i === 0 && local > 12 ? "border-accent bg-accent text-on-ink" : "border-line text-fg-muted"}`}>
                  {t}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {["Beginner", "Intermediate", "Advanced", "Expert"].map((l, i) => (
                <span key={l} className={`rounded-lg border px-2 py-2 text-center transition-colors ${i === 1 && local > 26 ? "border-accent text-fg" : "border-line text-fg-subtle"}`}>
                  {l}
                </span>
              ))}
            </div>
            <span className={`justify-self-start rounded-full px-4 py-2 text-xs font-semibold transition-colors ${local > 38 ? "bg-ink text-on-ink" : "bg-fg/10 text-fg-muted"}`}>Start practice →</span>
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-3">
            <div className="flex items-center justify-between text-xs text-fg-subtle">
              <span>Question 3 of 10</span>
              <span className="inline-flex items-center gap-1">
                <Icon as={Timer} size="xs" /> 0:{String(45 - Math.floor(local / 2)).padStart(2, "0")}
              </span>
            </div>
            <p className="text-fg">All pens are books. All books are bags. Does &ldquo;All pens are bags&rdquo; follow?</p>
            {["Follows", "Does not follow"].map((o, i) => (
              <span key={o} className={`rounded-xl border px-4 py-2.5 transition-colors ${i === 0 && local > 18 ? "border-accent bg-accent-soft text-fg" : "border-line text-fg-muted"}`}>
                {o}
              </span>
            ))}
            <p className={`text-xs text-fg-muted transition-opacity duration-500 ${local > 30 ? "opacity-100" : "opacity-0"}`}>
              <span className="font-semibold text-accent-strong">Correct.</span> Every pen is a book and every book is a bag.
            </p>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-fg-subtle">TCS NQT · Syllogism · Intermediate</p>
                <p className="cine-headline mt-1 text-4xl text-fg">8 / 10</p>
              </div>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs text-accent-strong">80% · 6 min</span>
            </div>
            <ul className="grid gap-2.5 text-xs">
              {[
                ["Syllogism", 90],
                ["Statement & Conclusion", 70],
                ["Data Sufficiency", 45],
              ].map(([n, v], i) => (
                <li key={n as string} className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-3">
                  <span className="text-fg-muted">{n}</span>
                  <span className="relative h-1.5 overflow-hidden rounded-full bg-fg/10">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-700" style={{ width: still || local > 6 + i * 4 ? `${v}%` : "0%" }} />
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-fg-muted">Next: Data Sufficiency at Beginner, your weakest skill.</p>
          </div>
        )}
      </div>
    </div>
  );
}
