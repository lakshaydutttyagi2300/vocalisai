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
        const wanted = new URLSearchParams(window.location.search).get("template");
        const match = wanted ? list.find((o) => o.versionTemplateIds.includes(wanted)) : null;
        if (match) setChosenId(match.templateId);
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

  if (stage === "intro") {
    return (
      <div className={`mx-auto px-6 py-16 text-center ${hasChoice ? "max-w-4xl pb-32" : "max-w-lg"}`}>
        <span className="badge badge-skill">Proctored Assessment</span>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink-950">Prepare for your assessment</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {hasChoice
            ? "Choose the test you want to take. Every test is timed and proctored, just like the real thing."
            : "A realistic, timed Voice & Accent assessment - the closest thing to the real hiring process you can practice on your own."}
        </p>

        {showFilters && (
          // One sideways-scrolling row on phones; wraps on wider screens.
          <div
            role="group"
            aria-label="Exam type"
            className="-mx-6 mt-8 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
          >
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
                    active ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {label} <span className={active ? "text-brand-100" : "text-slate-400"}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {hasChoice && (
          <div role="radiogroup" aria-label="Choose a mock test" className={`${showFilters ? "mt-5" : "mt-8"} grid gap-3 text-left sm:grid-cols-2`}>
            {visible.map((o) => (
              <TestChoice key={o.templateId} option={o} selected={chosen?.templateId === o.templateId} onSelect={() => setChosenId(o.templateId)} />
            ))}
          </div>
        )}
        {hasChoice && chosen?.kind === "exam" && isBrandStyle(chosen) && <TrademarkDisclaimer className="mt-3 text-left" />}

        <div className={`card mt-8 grid grid-cols-3 gap-4 p-5 text-left ${hasChoice ? "mx-auto max-w-lg" : ""}`}>
          <PrepItem label="Camera" />
          <PrepItem label="Microphone" />
          <PrepItem label="Environment" />
        </div>

        <p className="mt-4 text-xs text-slate-500">
          We&apos;ll check your camera, microphone, browser and connection first, then ask you to
          confirm the assessment rules.
        </p>

        {hasChoice ? (
          // Always in reach while scrolling a long list of exams.
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
            <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 flex-1 text-left text-sm">
                <span className="block text-xs text-slate-500">Selected</span>
                <span className="line-clamp-2 font-semibold text-ink-950">{chosen?.name}</span>
              </p>
              <button onClick={() => setStage("system-check")} className="btn-primary btn-lg">
                <Icon as={ShieldCheck} />
                Begin system check
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setStage("system-check")} className="btn-primary btn-lg mt-6">
            <Icon as={ShieldCheck} />
            Begin system check
          </button>
        )}
        <p className="mt-4 text-sm">
          <a href="/mock-tests/history" className="btn-ghost btn-sm text-brand-700">
            View my past results
            <Icon as={ArrowRight} />
          </a>
        </p>
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

function TestChoice({ option, selected, onSelect }: { option: MockTestOption; selected: boolean; onSelect: () => void }) {
  const versions = option.versionTemplateIds.length;
  const meta = [
    option.totalMinutes ? `${formatMinutes(option.totalMinutes)} in total` : "Each question timed",
    option.questionCount ? `${option.questionCount} questions` : null,
    option.levels.length ? option.levels.join(" - ") : null,
  ].filter(Boolean);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`rounded-xl border-2 p-4 text-left transition ${
        selected ? "border-brand-600 bg-brand-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-wide text-brand-700">{option.typeName}</span>
          <span className="mt-0.5 block font-display text-base font-bold text-ink-950">{option.name}</span>
        </span>
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-brand-600 bg-brand-600" : "border-slate-300"}`}
        >
          {selected && <span className="h-2 w-2 rounded-full bg-white" />}
        </span>
      </span>
      {option.trackName && <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">For {option.trackName}</span>}
      {option.description && <span className="mt-1.5 block text-sm text-slate-600">{option.description}</span>}
      <span className="mt-2 block text-xs font-medium text-slate-700">{meta.join(" · ")}</span>
      {option.papers.length > 0 && (
        <span className="mt-2 flex flex-wrap gap-1.5">
          {option.papers.map((p) => (
            <span key={p.name} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {p.name} {p.minutes} min
            </span>
          ))}
        </span>
      )}
      {versions > 1 && <span className="mt-2 block text-xs text-slate-500">{versions} versions - you&apos;ll get one you haven&apos;t taken yet.</span>}
    </button>
  );
}

const PREP_ICONS: Record<string, LucideIcon> = {
  Camera: Video,
  Microphone: Mic,
  Environment: House,
};

function PrepItem({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <IconBadge as={PREP_ICONS[label]} />
      <span className="text-xs font-semibold text-ink-700">{label}</span>
    </div>
  );
}
