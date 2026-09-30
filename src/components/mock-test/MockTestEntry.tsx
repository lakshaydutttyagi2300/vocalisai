"use client";

import { useEffect, useState } from "react";
import { ArrowRight, House, Mic, ShieldCheck, Video, type LucideIcon } from "lucide-react";
import { Icon, IconBadge } from "@/components/ui/Icon";
import { MockTestSystemCheck } from "@/components/mock-test/MockTestSystemCheck";
import { CandidateRules } from "@/components/mock-test/CandidateRules";
import { MockTestSessionShell } from "@/components/mock-test/MockTestSessionShell";
import { TrademarkDisclaimer } from "@/components/exam/TrademarkDisclaimer";
import type { MockTestOption } from "@/lib/mock-test-options";

type Stage = "intro" | "system-check" | "rules" | "session";

export function MockTestEntry() {
  const [stage, setStage] = useState<Stage>("intro");
  const [streams, setStreams] = useState<{ cameraStream: MediaStream | null; micStream: MediaStream | null }>({
    cameraStream: null,
    micStream: null,
  });
  // Choices from /api/mock-tests/options. With one option (or if the list
  // can't be loaded) nothing extra is shown and the default test is used,
  // exactly as before; the chooser only appears when there's a real choice.
  const [options, setOptions] = useState<MockTestOption[]>([]);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mock-tests/options")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data?.options)) return;
        const list = data.options as MockTestOption[];
        setOptions(list);
        // A goal plan links straight to its exam: /mock-tests?template=<id>.
        const query = new URLSearchParams(window.location.search);
        const wanted = query.get("template");
        const match = wanted ? list.find((o) => o.versionTemplateIds.includes(wanted)) : null;
        if (match) setChosenId(match.templateId);
        // An Explore exam page links to its exam type: /mock-tests?type=<family slug>.
        const type = query.get("type");
        const firstOfType = type ? list.find((o) => o.typeKey === type) : null;
        if (firstOfType) {
          setTypeFilter(type!);
          if (!match) setChosenId(firstOfType.templateId);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const hasChoice = options.length > 1;
  const chosen = options.find((o) => o.templateId === chosenId) ?? options[0] ?? null;
  const types = [...new Map(options.map((o) => [o.typeKey, o.typeName])).entries()];
  const showFilters = options.length > 6 && types.length > 1;
  const visible = typeFilter === "ALL" ? options : options.filter((o) => o.typeKey === typeFilter);

  if (stage === "intro" && !hasChoice) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="eyebrow">Proctored assessment</p>
        <h1 className="headline mt-4 text-3xl text-ink-950">Prepare for your assessment</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          A realistic, timed Voice &amp; Accent assessment - the closest thing to the real hiring process you can practice on your own.
        </p>
        <PrepChecks className="mt-8" />
        <button onClick={() => setStage("system-check")} className="btn-primary btn-lg mt-6">
          <Icon as={ShieldCheck} />
          Begin system check
        </button>
        <p className="mt-4 text-sm">
          <a href="/mock-tests/history" className="btn-ghost btn-sm text-brand-700">
            View my past results
            <Icon as={ArrowRight} />
          </a>
        </p>
      </div>
    );
  }

  if (stage === "intro") {
    return (
      <div className="mx-auto max-w-6xl px-5 pb-36 pt-8 sm:px-6 sm:pt-10 lg:pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Proctored mock exams</p>
            <h1 className="headline mt-3 text-3xl text-ink-950 sm:text-4xl">Prepare for your assessment</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Choose the test you want to take. Every test is timed and proctored, just like the real thing.
            </p>
          </div>
          <a href="/mock-tests/history" className="btn-secondary btn-sm">
            My past results
            <Icon as={ArrowRight} />
          </a>
        </div>

        {showFilters && (
          // One sideways-scrolling row on phones; wraps on wider screens.
          <div role="group" aria-label="Exam type" className="-mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {[["ALL", "All exams"] as [string, string], ...types].map(([key, label]) => {
              const count = key === "ALL" ? options.length : options.filter((o) => o.typeKey === key).length;
              const active = typeFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTypeFilter(key)}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active ? "border-ink-950 bg-ink-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {label} <span className={active ? "text-amber-300" : "text-slate-400"}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <div role="radiogroup" aria-label="Choose a mock test" className="grid items-start gap-8 md:grid-cols-2">
              {groupOptions(visible, typeFilter === "ALL").map((g) => (
                <section key={g.title} aria-label={g.title} className={g.wide ? "md:col-span-2" : undefined}>
                  <h2 className="eyebrow text-slate-500">{g.title}</h2>
                  <div className="sheet mt-3 divide-y divide-slate-100 overflow-hidden">
                    {g.options.map((o) => (
                      <TestChoice key={o.templateId} option={o} selected={chosen?.templateId === o.templateId} onSelect={() => setChosenId(o.templateId)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
            {chosen?.kind === "exam" && isBrandStyle(chosen) && <TrademarkDisclaimer className="mt-4" />}
          </div>

          {chosen && (
            <aside aria-label="Your test" className="sticky top-24 hidden lg:block">
              <div className="panel-ink overflow-hidden rounded-[1.25rem] p-6 text-white">
                <p className="eyebrow eyebrow-on-ink">Selected</p>
                <p className="headline mt-3 text-2xl">{chosen.name}</p>
                <p className="mt-1 text-sm text-slate-400">{chosen.typeName}</p>
                {chosen.description && <p className="mt-4 text-sm leading-relaxed text-slate-300">{chosen.description}</p>}
                <TestShape option={chosen} />
                <button onClick={() => setStage("system-check")} className="btn-primary btn-lg mt-6 w-full">
                  <Icon as={ShieldCheck} />
                  Begin system check
                </button>
              </div>
              <PrepChecks className="mt-4" />
            </aside>
          )}
        </div>

        {/* Phones and tablets: the start button stays in reach while scrolling. */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-left text-sm">
              <span className="block text-xs text-slate-500">Your test</span>
              <span className="line-clamp-2 font-semibold text-ink-950">{chosen?.name}</span>
            </p>
            <button onClick={() => setStage("system-check")} className="btn-primary btn-lg">
              <Icon as={ShieldCheck} />
              Begin system check
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "system-check") {
    return (
      <MockTestSystemCheck
        onReady={(s) => {
          setStreams(s);
          setStage("rules");
        }}
      />
    );
  }

  if (stage === "rules") {
    return <CandidateRules onConfirm={() => setStage("session")} />;
  }

  return (
    <MockTestSessionShell
      cameraStream={streams.cameraStream}
      micStream={streams.micStream}
      // Only send a choice when one was actually offered - otherwise the
      // request is byte-for-byte what it was before (default template).
      templateId={hasChoice ? chosen?.templateId ?? null : null}
      // Several versions behind one card: the server picks one not taken yet.
      anyVersion={hasChoice && (chosen?.versionTemplateIds.length ?? 1) > 1}
    />
  );
}

// The brand disclaimer only belongs next to "-style" exams (IELTS-style, ...).
function isBrandStyle(o: MockTestOption): boolean {
  return /_STYLE$/.test(o.typeKey) || /-style/i.test(o.typeName) || /-style/i.test(o.name);
}

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// Goal-linked tests first (when showing everything), then one group per exam type.
const GOAL_GROUP = "Built for a goal";

function groupOptions(options: MockTestOption[], withGoals: boolean): { title: string; options: MockTestOption[]; wide: boolean }[] {
  const groups = new Map<string, MockTestOption[]>();
  const goal = withGoals ? options.filter((o) => o.trackName) : [];
  if (goal.length > 0) groups.set(GOAL_GROUP, goal);
  for (const o of options) {
    if (goal.includes(o)) continue;
    groups.set(o.typeName, [...(groups.get(o.typeName) ?? []), o]);
  }
  return [...groups.entries()].map(([title, list]) => ({ title, options: list, wide: title === GOAL_GROUP || options.length === list.length }));
}

function metaLine(option: MockTestOption): string {
  return [
    option.totalMinutes ? `${formatMinutes(option.totalMinutes)} in total` : "Each question timed",
    option.questionCount ? `${option.questionCount} questions` : null,
    option.levels.length ? option.levels.join(" - ") : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function TestChoice({ option, selected, onSelect }: { option: MockTestOption; selected: boolean; onSelect: () => void }) {
  const versions = option.versionTemplateIds.length;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors ${selected ? "bg-brand-50" : "bg-white hover:bg-slate-50"}`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-brand-600 bg-brand-600" : "border-slate-300"}`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-ink-950">{option.name}</span>
          {option.trackName && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">For {option.trackName}</span>}
        </span>
        <span className="mt-1 block text-xs text-slate-500">
          {metaLine(option)}
          {versions > 1 && ` · ${versions} versions`}
        </span>
        {/* Below lg there is no side panel: the chosen test explains itself in place. */}
        {selected && (
          <span className="block lg:hidden">
            {option.description && <span className="mt-2 block text-sm leading-relaxed text-slate-600">{option.description}</span>}
            {option.papers.length > 0 && (
              <span className="mt-2 flex flex-wrap gap-1.5">
                {option.papers.map((p) => (
                  <span key={p.name} className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                    {p.name} {p.minutes} min
                  </span>
                ))}
              </span>
            )}
            {versions > 1 && <span className="mt-2 block text-xs text-slate-500">You&apos;ll get a version you haven&apos;t taken yet.</span>}
          </span>
        )}
      </span>
    </button>
  );
}

// The selected test's papers as a to-scale timeline, or its skills for a question-timed test.
function TestShape({ option }: { option: MockTestOption }) {
  const total = option.papers.reduce((sum, p) => sum + p.minutes, 0);
  const versions = option.versionTemplateIds.length;
  return (
    <div className="mt-6 border-t border-white/10 pt-5">
      <p className="text-xs text-slate-400">{metaLine(option)}</p>
      {option.papers.length > 0 && total > 0 ? (
        <>
          <div className="mt-3 flex h-2 gap-1 overflow-hidden rounded-full">
            {option.papers.map((p, i) => (
              <span key={p.name} className={i % 2 ? "bg-amber-400" : "bg-brand-300"} style={{ width: `${(p.minutes / total) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-3 grid gap-1.5 text-sm">
            {option.papers.map((p, i) => (
              <li key={p.name} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-slate-200">
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${i % 2 ? "bg-amber-400" : "bg-brand-300"}`} />
                  {p.name}
                </span>
                <span className="num text-slate-400">{p.minutes} min</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        option.skills.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {option.skills.map((s) => (
              <li key={s} className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-slate-200">
                {s}
              </li>
            ))}
          </ul>
        )
      )}
      {versions > 1 && <p className="mt-4 text-xs text-slate-400">You&apos;ll get a version you haven&apos;t taken yet.</p>}
    </div>
  );
}

const PREP_ICONS: Record<string, LucideIcon> = {
  Camera: Video,
  Microphone: Mic,
  Environment: House,
};

// What the system check looks at before the test starts.
function PrepChecks({ className = "" }: { className?: string }) {
  return (
    <div className={`sheet p-5 text-left ${className}`}>
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(PREP_ICONS).map(([label, icon]) => (
          <div key={label} className="flex flex-col items-center gap-2 text-center">
            <IconBadge as={icon} />
            <span className="text-xs font-semibold text-ink-700">{label}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        We&apos;ll check your camera, microphone, browser and connection first, then ask you to confirm the assessment rules.
      </p>
    </div>
  );
}
