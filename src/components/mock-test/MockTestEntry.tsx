"use client";

import { useState, type ReactNode } from "react";
import { MockTestSystemCheck } from "@/components/mock-test/MockTestSystemCheck";
import { CandidateRules } from "@/components/mock-test/CandidateRules";
import { MockTestSessionShell } from "@/components/mock-test/MockTestSessionShell";

type Stage = "intro" | "system-check" | "rules" | "session";

export function MockTestEntry() {
  const [stage, setStage] = useState<Stage>("intro");
  const [streams, setStreams] = useState<{ cameraStream: MediaStream | null; micStream: MediaStream | null }>({
    cameraStream: null,
    micStream: null,
  });

  if (stage === "intro") {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <span className="badge badge-skill">Proctored Assessment</span>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink-950">Prepare for your assessment</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          A realistic, timed Voice &amp; Accent assessment - the closest thing to the real hiring
          process you can practice on your own.
        </p>

        <div className="card mt-8 grid grid-cols-3 gap-4 p-5 text-left">
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

  return <MockTestSessionShell cameraStream={streams.cameraStream} micStream={streams.micStream} />;
}

const PREP_ICONS: Record<string, ReactNode> = {
  Camera: (
    <path d="M23 7l-7 5 7 5V7z M1 5h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
  ),
  Microphone: (
    <path d="M12 2a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z M6 11v1a6 6 0 0 0 12 0v-1 M12 19v3" />
  ),
  Environment: <path d="M3 12l9-9 9 9 M5 10v10h14V10 M9 21v-6h6v6" />,
};

function PrepItem({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {PREP_ICONS[label]}
        </svg>
      </span>
      <span className="text-xs font-semibold text-ink-700">{label}</span>
    </div>
  );
}
