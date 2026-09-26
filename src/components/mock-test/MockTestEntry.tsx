"use client";

import { useEffect, useState } from "react";
import { House, Mic, Video, type LucideIcon } from "lucide-react";
import { IconBadge } from "@/components/ui/Icon";
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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mock-tests/options")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.options)) setOptions(data.options);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const hasChoice = options.length > 1;
  const chosen = options.find((o) => o.templateId === chosenId) ?? options[0] ?? null;

  if (stage === "intro") {
    return (
      <div className={`mx-auto px-6 py-16 text-center ${hasChoice ? "max-w-3xl" : "max-w-lg"}`}>
        <span className="badge badge-skill">Proctored Assessment</span>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink-950">Prepare for your assessment</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {hasChoice
            ? "Choose the test you want to take. Every test is timed and proctored, just like the real thing."
            : "A realistic, timed Voice & Accent assessment - the closest thing to the real hiring process you can practice on your own."}
        </p>

        {hasChoice && (
          <div role="radiogroup" aria-label="Choose a mock test" className="mt-8 grid gap-3 text-left sm:grid-cols-2">
            {options.map((o) => (
              <TestChoice key={o.templateId} option={o} selected={chosen?.templateId === o.templateId} onSelect={() => setChosenId(o.templateId)} />
            ))}
          </div>
        )}
        {hasChoice && chosen?.kind === "exam" && <TrademarkDisclaimer className="mt-3 text-left" />}

        <div className={`card mt-8 grid grid-cols-3 gap-4 p-5 text-left ${hasChoice ? "mx-auto max-w-lg" : ""}`}>
          <PrepItem label="Camera" />
          <PrepItem label="Microphone" />
          <PrepItem label="Environment" />
        </div>

        <p className="mt-4 text-xs text-slate-500">
          We&apos;ll check your camera, microphone, browser and connection first, then ask you to
          confirm the assessment rules.
        </p>

        <button onClick={() => setStage("system-check")} className="btn-primary mt-6">
          Begin system check
        </button>
        <p className="mt-4 text-sm">
          <a href="/mock-tests/history" className="font-medium text-brand-600 hover:underline">
            View my past results &rarr;
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
    />
  );
}

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function TestChoice({ option, selected, onSelect }: { option: MockTestOption; selected: boolean; onSelect: () => void }) {
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
        <span className="font-display text-base font-bold text-ink-950">{option.name}</span>
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-brand-600 bg-brand-600" : "border-slate-300"}`}
        >
          {selected && <span className="h-2 w-2 rounded-full bg-white" />}
        </span>
      </span>
      {option.kind === "standard" ? (
        <span className="mt-1 block text-sm text-slate-600">Our standard assessment: speaking, listening, reading and workplace communication.</span>
      ) : (
        <>
          <span className="mt-1 block text-sm text-slate-600">
            Full exam-style practice test{option.totalMinutes ? ` · ${formatMinutes(option.totalMinutes)} in total` : ""}
          </span>
          {option.papers.length > 0 && (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {option.papers.map((p) => (
                <span key={p.name} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {p.name} {p.minutes} min
                </span>
              ))}
            </span>
          )}
        </>
      )}
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
