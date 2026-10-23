"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mic, Sparkles } from "lucide-react";
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

// Each page that shows the analysis demo gets its own example, so the same
// panel never repeats across the site.
const ANALYSIS_EXAMPLES = {
  interview: {
    title: "Interview answer · Intermediate",
    answer: "So, um, in my last project I led a team of four, and, like, I made sure everyone knew what they owned each week.",
    fillers: ["um,", "like,"],
    seconds: 18,
    scores: [
      { name: "Pronunciation", band: "Strong", value: 86 },
      { name: "Fluency", band: "Adequate · 2 fillers", value: 64 },
      { name: "Grammar", band: "Strong", value: 90 },
      { name: "Pace", band: "142 wpm · balanced", value: 78 },
    ],
    tip: "Tip: swap “um” for a half-second pause. It sounds more confident.",
  },
  presentation: {
    title: "Presentation opening · Advanced",
    answer: "Good morning, everyone. Today I'll walk you through, uh, three changes that cut our response time by a third.",
    fillers: ["uh,"],
    seconds: 14,
    scores: [
      { name: "Pronunciation", band: "Strong", value: 88 },
      { name: "Fluency", band: "Strong · 1 filler", value: 81 },
      { name: "Grammar", band: "Strong", value: 92 },
      { name: "Pace", band: "171 wpm · a little fast", value: 58 },
    ],
    tip: "Tip: slow down on the number. Pause before “a third” so it lands.",
  },
  readAloud: {
    title: "Read aloud · Beginner",
    answer: "The meeting has been moved to Thursday, so, like, please bring the updated report and your questions.",
    fillers: ["like,"],
    seconds: 11,
    scores: [
      { name: "Pronunciation", band: "Adequate · “Thursday”", value: 68 },
      { name: "Fluency", band: "Adequate · 1 filler", value: 70 },
      { name: "Grammar", band: "Strong", value: 94 },
      { name: "Pace", band: "128 wpm · balanced", value: 82 },
    ],
    tip: "Tip: say “Thurz-day” with the stress on the first part.",
  },
} as const;

/** A spoken answer being analysed: recording, transcript, then ratings. 14 s loop. */
export function AnalysisDemo({ className = "", example = "interview" }: { className?: string; example?: keyof typeof ANALYSIS_EXAMPLES }) {
  const { ref, tick } = useTicker(140, 100, 104);
  const ex = ANALYSIS_EXAMPLES[example];
  const ANSWER = ex.answer.split(" ");
  const FILLERS = new Set<string>(ex.fillers);
  const recording = tick < 35;
  const words = recording ? 0 : Math.min(ANSWER.length, Math.floor((tick - 35) / 1.6));
  const rated = tick >= 75;
  const scores = ex.scores;
  return (
    <div ref={ref} className={`${frame} p-5 text-left ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-accent-strong">Speech analysis</p>
          <p className="mt-1 truncate text-sm font-semibold text-fg">{ex.title}</p>
        </div>
        <span className="rounded-full border border-line px-2.5 py-1 text-[0.68rem] font-medium text-fg-muted">Example</span>
      </div>
      <div className="mt-4 flex h-12 items-center gap-3">
        <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${recording ? "bg-accent text-on-ink" : "bg-fg/10 text-fg-muted"}`}>
          <Icon as={Mic} />
        </span>
        <Waveform bars={36} paused={!recording} className={`h-10 flex-1 ${recording ? "" : "opacity-40"}`} />
        <span className="num w-10 flex-none text-right text-xs text-fg-muted">0:{String(Math.min(ex.seconds, Math.floor(tick / 2))).padStart(2, "0")}</span>
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
        {ex.tip}
      </p>
    </div>
  );
}

const CONVERSATION_EXAMPLES = {
  customer: {
    label: "AI interview",
    question: "Tell me about a time you worked to a tight deadline.",
    reply: "Our project demo moved up by a week. I split the remaining work by strengths, we checked in daily and finished a day early.",
    followUp: "Good. What would you do differently next time?",
    notes: ["Clear structure", "Specific example", "Add the result"],
  },
  jobInterview: {
    label: "AI interview",
    question: "Why do you want to join our team?",
    reply: "I've followed your product for two years, and the role uses exactly the data skills I built in my final-year project.",
    followUp: "Tell me more about that project. What was your part?",
    notes: ["Researched the company", "Links to the role", "Name one result"],
  },
} as const;

/** Question -> your spoken answer -> a follow-up and feedback. 15 s loop. */
export function ConversationDemo({ className = "", example = "customer" }: { className?: string; example?: keyof typeof CONVERSATION_EXAMPLES }) {
  const { ref, tick } = useTicker(150, 100, 104);
  const ex = CONVERSATION_EXAMPLES[example];
  const QUESTION = ex.question;
  const REPLY = ex.reply.split(" ");
  const words = Math.max(0, Math.min(REPLY.length, Math.floor((tick - 20) / 2)));
  const followUp = tick >= 80;
  const feedback = tick >= 100;
  return (
    <div ref={ref} className={`${frame} p-5 text-left ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-accent-strong">{ex.label}</p>
        <span className="rounded-full border border-line px-2.5 py-1 text-[0.68rem] font-medium text-fg-muted">Example</span>
      </div>
      <div className="mt-4 grid gap-3 text-sm">
        <p className="max-w-[88%] rounded-2xl rounded-bl-md bg-accent-softer px-4 py-3 text-fg">{QUESTION}</p>
        <p className={`ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-accent px-4 py-3 text-on-ink transition-opacity duration-300 ${words > 0 ? "opacity-100" : "opacity-0"}`}>
          {REPLY.slice(0, Math.max(words, 1)).join(" ")}
          {words < REPLY.length && words > 0 && <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-bg" />}
        </p>
        <p className={`max-w-[88%] rounded-2xl rounded-bl-md bg-accent-softer px-4 py-3 text-fg transition-all duration-500 ${followUp ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
          {ex.followUp}
        </p>
      </div>
      <div className={`mt-4 flex flex-wrap gap-2 border-t border-line pt-4 transition-opacity duration-500 ${feedback ? "opacity-100" : "opacity-0"}`}>
        {ex.notes.map((t, i) => (
          <span key={t} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${i < 2 ? "bg-accent-softer text-fg-muted" : "bg-accent-soft text-accent-strong"}`}>
            <Icon as={i < 2 ? Check : Sparkles} size="xs" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

const STEPS = ["Choose", "Speak", "Review"] as const;
const GOALS = ["Interview Preparation", "General English", "Campus Placement"] as const;
const ANSWER = "I'm a final-year commerce student. In my internship I helped a small team track their monthly sales, and I enjoyed explaining the numbers to them.";

/** Choose a goal -> answer out loud -> review the feedback. 5 s per step. */
export function WalkthroughDemo({ className = "" }: { className?: string }) {
  const { ref, tick, still } = useTicker(150, 100, 40);
  const step = still ? 2 : Math.floor(tick / 50);
  const local = tick % 50;
  const words = ANSWER.split(" ");
  const shown = still ? words.length : Math.min(words.length, Math.floor((local / 40) * words.length));
  return (
    <div ref={ref} className={`${frame} overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 border-b border-line px-5 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-fg/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-fg/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-fg/10" />
        <span className="ml-3 truncate text-xs text-fg-subtle">vocalisai.vercel.app/practice/interview · Example</span>
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
            <p className="text-fg-muted">What are you preparing for?</p>
            <div className="grid gap-2">
              {GOALS.map((g, i) => (
                <span key={g} className={`rounded-xl border px-4 py-2.5 text-xs transition-colors ${i === 0 && local > 12 ? "border-accent bg-accent-soft font-semibold text-fg" : "border-line text-fg-muted"}`}>
                  {g}
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
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-3">
            <div className="flex items-center justify-between text-xs text-fg-subtle">
              <span>Interview question</span>
              <span className="inline-flex items-center gap-1 text-accent-strong">
                <Icon as={Mic} size="xs" /> Recording 0:{String(Math.min(45, 5 + Math.floor(local / 2))).padStart(2, "0")}
              </span>
            </div>
            <p className="font-semibold text-fg">&ldquo;Tell me about yourself.&rdquo;</p>
            <Waveform bars={40} className="h-8 opacity-70" />
            <p className="min-h-[4.5rem] text-fg-muted">{words.slice(0, shown).join(" ")}</p>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-fg-subtle">Interview answer · Intermediate</p>
                <p className="cine-headline mt-1 text-2xl text-fg">Clear and specific</p>
              </div>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs text-accent-strong">138 wpm</span>
            </div>
            <ul className="grid gap-2.5 text-xs">
              {[
                ["Grammar", 90],
                ["Delivery", 76],
                ["Fluency", 62],
              ].map(([n, v], i) => (
                <li key={n as string} className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3">
                  <span className="text-fg-muted">{n}</span>
                  <span className="relative h-1.5 overflow-hidden rounded-full bg-fg/10">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-700" style={{ width: still || local > 6 + i * 4 ? `${v}%` : "0%" }} />
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-fg-muted">Add one result from your internship. Next up: fluency practice, your weakest area.</p>
          </div>
        )}
      </div>
    </div>
  );
}
