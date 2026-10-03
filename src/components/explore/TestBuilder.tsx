"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookmarkCheck, Check, ClipboardList, Clock, Layers, Lock, RotateCcw, Target, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
type Mode = "PRACTICE" | "TIMED" | "WEAK_AREAS" | "REVISION" | "BOOKMARKS" | "FULL_MOCK";

const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: "BEGINNER", label: "Beginner", hint: "Fundamentals" },
  { id: "INTERMEDIATE", label: "Intermediate", hint: "Real understanding" },
  { id: "ADVANCED", label: "Advanced", hint: "Multi-step, harder" },
  { id: "EXPERT", label: "Expert", hint: "Exam-level mastery" },
];

const MODES: Record<Mode, { label: string; hint: string; icon: LucideIcon }> = {
  PRACTICE: { label: "Practice", hint: "Untimed. See the answer and explanation after each question.", icon: Check },
  TIMED: { label: "Timed test", hint: "Against the clock. Answers and explanations at the end.", icon: Clock },
  WEAK_AREAS: { label: "Weak areas", hint: "Your lowest-accuracy skills, picked for you.", icon: Target },
  REVISION: { label: "Revision", hint: "Questions you've seen before, the ones you got wrong first.", icon: RotateCcw },
  BOOKMARKS: { label: "Bookmarks", hint: "Only the questions you bookmarked.", icon: BookmarkCheck },
  FULL_MOCK: { label: "Full mock test", hint: "Every subject, timed like the real exam.", icon: ClipboardList },
};

export interface BuilderSubject {
  id: string;
  name: string;
  description: string | null;
  mockQuestionCount: number;
  skills: { id: string; name: string }[];
  /** The exam's own section heading for this subject (null: no heading). */
  section?: string | null;
}

export function TestBuilder({
  examId,
  mockMinutes,
  subjects,
  counts,
  allowedLevels,
  signedIn,
  loginHref,
  initialSkillId = null,
}: {
  /** Null for skill-first practice (one practice area, no exam). */
  examId: string | null;
  mockMinutes: number | null;
  subjects: BuilderSubject[];
  counts: Record<string, number>;
  allowedLevels: Level[];
  signedIn: boolean;
  loginHref: string;
  initialSkillId?: string | null;
}) {
  const router = useRouter();
  const preselected = initialSkillId ? subjects.find((s) => s.skills.some((k) => k.id === initialSkillId)) : undefined;
  const [scope, setScope] = useState<string>(preselected?.id ?? subjects[0]?.id ?? "EXAM"); // a subject id, or "EXAM"
  const [skillId, setSkillId] = useState<string | null>(preselected ? initialSkillId : null);
  const [level, setLevel] = useState<Level>("BEGINNER");
  const [mode, setMode] = useState<Mode>("PRACTICE");
  const [count, setCount] = useState(10);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subject = subjects.find((s) => s.id === scope) ?? null;
  const available = (lv: Level) => {
    if (scope === "EXAM") return subjects.reduce((sum, s) => sum + (counts[`${s.id}:${lv}`] ?? 0), 0);
    return counts[skillId ? `${scope}:${skillId}:${lv}` : `${scope}:${lv}`] ?? 0;
  };
  const modes: Mode[] = scope === "EXAM" ? ["FULL_MOCK", "WEAK_AREAS", "REVISION", "BOOKMARKS"] : ["PRACTICE", "TIMED", "WEAK_AREAS", "REVISION", "BOOKMARKS"];
  const activeMode = modes.includes(mode) ? mode : modes[0];
  const mockTotal = subjects.reduce((sum, s) => sum + s.mockQuestionCount, 0);
  const levelLocked = !allowedLevels.includes(level) && activeMode !== "BOOKMARKS";
  const needsQuestions = activeMode === "PRACTICE" || activeMode === "TIMED" || activeMode === "FULL_MOCK";
  const empty = needsQuestions && available(level) === 0;

  function chooseScope(next: string) {
    setScope(next);
    setSkillId(null);
    setError(null);
  }

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/practice-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId,
          subjectId: scope === "EXAM" ? null : scope,
          skillId,
          difficulty: level,
          mode: activeMode === "TIMED" ? "PRACTICE" : activeMode,
          timed: activeMode === "TIMED",
          count,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "We couldn't start your test. Please try again.");
        setStarting(false);
        return;
      }
      router.push(`/practice-tests/${data.testId}`);
    } catch {
      setError("Network error. Please try again.");
      setStarting(false);
    }
  }

  const step = (n: number, title: string) => (
    <h2 className="flex items-center gap-3 text-sm font-semibold text-ink-950">
      <span className="num flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">{n}</span>
      {title}
    </h2>
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid min-w-0 gap-8">
        <section>
          {step(1, examId ? "Choose a section, subject or skill" : "Choose a skill")}
          <div role="radiogroup" aria-label="Subject" className="sheet mt-3 divide-y divide-slate-100 overflow-hidden">
            {subjects.map((s, i) => {
              const selected = scope === s.id;
              const heading = s.section && s.section !== subjects[i - 1]?.section ? s.section : null;
              return (
                <div key={s.id} className={selected ? "bg-accent-softer" : undefined}>
                  {heading && <p className="eyebrow bg-slate-50 px-5 pb-2 pt-3 text-slate-500">{heading}</p>}
                  <button type="button" role="radio" aria-checked={selected} onClick={() => chooseScope(s.id)} className="flex w-full items-center gap-4 px-5 py-4 text-left">
                    <span aria-hidden="true" className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${selected ? "border-brand-600 bg-brand-600" : "border-slate-300"}`}>
                      {selected && <span className="h-2 w-2 rounded-full bg-surface" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink-950">{s.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {counts[`${s.id}:${level}`] ?? 0} questions at {LEVELS.find((l) => l.id === level)!.label}
                        {s.skills.length > 0 && ` · ${s.skills.length} skills`}
                      </span>
                    </span>
                  </button>
                  {selected && s.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-5 pb-4 pl-14" role="group" aria-label={`${s.name} skills`}>
                      {[{ id: null as string | null, name: "All skills" }, ...s.skills].map((k) => {
                        const on = skillId === k.id;
                        const n = k.id ? (counts[`${s.id}:${k.id}:${level}`] ?? 0) : null;
                        return (
                          <button
                            key={k.id ?? "all"}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setSkillId(k.id)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${on ? "border-accent bg-accent-soft text-fg" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}
                          >
                            {k.name}
                            {n !== null && <span className={on ? "text-fg-muted" : "text-slate-400"}> {n}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {examId && (
            <button type="button" role="radio" aria-checked={scope === "EXAM"} onClick={() => chooseScope("EXAM")} className={`flex w-full items-center gap-4 px-5 py-4 text-left ${scope === "EXAM" ? "bg-brand-50/60" : ""}`}>
              <span aria-hidden="true" className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${scope === "EXAM" ? "border-brand-600 bg-brand-600" : "border-slate-300"}`}>
                {scope === "EXAM" && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold text-ink-950">
                  <Icon as={Layers} size="xs" className="text-brand-600" />
                  Whole exam
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">Full mock tests, weak areas and revision across every section</span>
              </span>
            </button>
            )}
          </div>
        </section>

        <section>
          {step(2, "Choose your level")}
          <div role="radiogroup" aria-label="Level" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LEVELS.map((l) => {
              const on = level === l.id;
              const locked = !allowedLevels.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setLevel(l.id)}
                  data-selected={on} className="choice flex flex-col p-3 text-left text-fg"
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                    {l.label}
                    {locked && <Icon as={Lock} size="xs" className={on ? "text-accent-strong" : "text-fg-subtle"} />}
                  </span>
                  <span className="mt-0.5 text-xs text-fg-muted">{l.hint}</span>
                  <span className="num mt-2 text-xs text-fg-muted">{available(l.id)} questions</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          {step(3, "Choose how to practise")}
          <div role="radiogroup" aria-label="Mode" className="mt-3 grid gap-2 sm:grid-cols-2">
            {modes.map((m) => {
              const on = activeMode === m;
              const def = MODES[m];
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setMode(m)}
                  data-selected={on} className="choice flex items-start gap-3 p-4 text-left"
                >
                  <Icon as={def.icon} className={on ? "mt-0.5 text-accent-strong" : "mt-0.5 text-fg-subtle"} />
                  <span>
                    <span className="block text-sm font-semibold text-ink-950">{def.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                      {m === "FULL_MOCK" ? `${mockTotal} questions${mockMinutes ? `, ${mockMinutes} minutes` : ""}. ${def.hint}` : def.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {activeMode !== "FULL_MOCK" && (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium text-slate-700">Questions</span>
              <div role="radiogroup" aria-label="Number of questions" className="flex gap-2">
                {[5, 10, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={count === n}
                    onClick={() => setCount(n)}
                    className={`num rounded-lg border px-3 py-1.5 text-sm font-semibold ${count === n ? "border-accent bg-accent-soft text-fg" : "border-slate-200 bg-white text-slate-700"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <aside aria-label="Your selection" className="panel-ink sticky top-24 overflow-hidden rounded-xl p-6">
        <p className="eyebrow eyebrow-on-ink">Ready to start</p>
        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="text-xs text-fg-muted">Practising</dt>
            <dd className="font-semibold">{scope === "EXAM" ? "Whole exam" : `${subject?.name}${skillId ? ` · ${subject?.skills.find((k) => k.id === skillId)?.name}` : ""}`}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-muted">Level</dt>
            <dd className="font-semibold">{LEVELS.find((l) => l.id === level)!.label}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-muted">Mode</dt>
            <dd className="font-semibold">{MODES[activeMode].label}</dd>
          </div>
        </dl>
        {!signedIn ? (
          <Link href={loginHref} className="btn-primary btn-lg mt-6 w-full">
            Sign in to start
            <Icon as={ArrowRight} />
          </Link>
        ) : levelLocked ? (
          <Link href="/billing" className="btn-primary btn-lg mt-6 w-full">
            <Icon as={Lock} />
            Unlock {LEVELS.find((l) => l.id === level)!.label}
          </Link>
        ) : (
          <button onClick={start} disabled={starting || empty} data-loading={starting || undefined} className="btn-primary btn-lg mt-6 w-full">
            {empty ? "No questions yet" : "Start"}
            {!empty && <Icon as={ArrowRight} />}
          </button>
        )}
        {empty && signedIn && !levelLocked && <p className="mt-3 text-xs leading-relaxed text-fg-muted">Questions for this choice are being added. Try another level or subject.</p>}
        {error && (
          <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-xs leading-relaxed text-danger-strong">
            {error}
          </p>
        )}
      </aside>
    </div>
  );
}
