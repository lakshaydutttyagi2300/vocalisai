"use client";

import { useState } from "react";
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
        <h1 className="text-2xl font-semibold text-ink-950">Proctored Mock Test</h1>
        <p className="mt-3 text-sm text-slate-600">
          A realistic, timed assessment environment. Before starting, we&apos;ll check your camera,
          microphone, browser and connection, and you&apos;ll be asked to confirm the candidate rules.
        </p>
        <button onClick={() => setStage("system-check")} className="btn-primary mt-8">
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
