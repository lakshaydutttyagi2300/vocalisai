"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveProctoring } from "@/hooks/useLiveProctoring";
import { describeProctoringEvent } from "@/lib/proctoring-events";
import { MockTestQuestionRunner } from "@/components/mock-test/MockTestQuestionRunner";

interface TemplateSection {
  order: number;
  category: string;
  difficulty: string;
  questionCount: number;
}

export function MockTestSessionShell({
  cameraStream,
  micStream,
}: {
  cameraStream: MediaStream | null;
  micStream: MediaStream | null;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionCreatedRef = useRef(false);
  const endingRef = useRef(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sections, setSections] = useState<TemplateSection[] | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const { events, status } = useLiveProctoring({
    sessionId,
    cameraStream,
    micStream,
    expectFullscreen: true,
  });

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = cameraStream;
  }, [cameraStream]);

  async function startSession() {
    setStartError(null);
    try {
      const res = await fetch("/api/mock-tests/sessions", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setStartError(data.error || "Couldn't start the mock test. Please try again.");
        return;
      }
      setSessionId(data.sessionId);
      setSections(data.template?.sections ?? []);
    } catch {
      setStartError("Network error while starting the mock test. Please try again.");
    }
  }

  useEffect(() => {
    // Guards against React's dev-mode double-invoke of mount effects
    // creating two session rows for one real test session.
    if (!sessionCreatedRef.current) {
      sessionCreatedRef.current = true;
      startSession();
    }

    document.documentElement.requestFullscreen?.().catch(() => {});

    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    // Deliberately NOT stopping cameraStream/micStream tracks here: this
    // stream is a prop, not something this effect created, so a cleanup
    // that stops it collides with React's dev-mode double-invoke (mount ->
    // cleanup -> mount, all synchronous) and kills the stream before the
    // test even starts. endTest() and returnToDashboard-equivalent exits
    // already stop tracks explicitly on the real, user-driven exit paths.
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function endTest() {
    if (endingRef.current || !sessionId) return;
    endingRef.current = true;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    await fetch(`/api/mock-tests/sessions/${sessionId}`, { method: "PATCH" });
    cameraStream?.getTracks().forEach((t) => t.stop());
    micStream?.getTracks().forEach((t) => t.stop());
    router.push(`/mock-tests/results/${sessionId}`);
  }

  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const ss = String(elapsedSeconds % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-2 text-sm font-medium text-red-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          Recording
        </div>
        <div className="font-mono text-sm text-slate-300">{mm}:{ss}</div>
        <button onClick={endTest} className="rounded-md border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10">
          End test
        </button>
      </div>

      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[1fr_240px]">
        <div className="flex flex-col items-center">
          {startError ? (
            <div className="text-center">
              <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {startError}
              </p>
              <button
                onClick={startSession}
                className="mt-4 rounded-md border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
              >
                Try again
              </button>
            </div>
          ) : !sections ? (
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : sections.length === 0 ? (
            <p className="text-center text-sm text-slate-300">
              No assessment template is configured yet. Ask an admin to set one up.
            </p>
          ) : (
            sessionId && (
              <MockTestQuestionRunner
                sections={sections}
                mockTestSessionId={sessionId}
                micStream={micStream}
                onAllSectionsComplete={endTest}
              />
            )
          )}

          <div className="mt-8 aspect-video w-48 overflow-hidden rounded-md border border-white/10 bg-black">
            {cameraStream && <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-slate-400">Live status</h2>
          <div className="mt-3 space-y-2">
            <StatusRow label="Face" state={status.face} detail={status.faceDetail} />
            <StatusRow label="Tab focus" state={status.tabFocus} detail={status.tabFocus === "ok" ? "In view" : "Away"} />
            <StatusRow
              label="Fullscreen"
              state={status.fullscreen}
              detail={status.fullscreen === "unavailable" ? "Not supported here" : status.fullscreen === "ok" ? "Active" : "Exited"}
            />
            <StatusRow label="Microphone" state={status.mic} detail={status.mic === "ok" ? "Connected" : "Disconnected"} />
          </div>

          <h2 className="mt-6 text-sm font-medium text-slate-400">Event log ({events.length})</h2>
          <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto text-xs text-slate-400">
            {events.length === 0 && <li className="text-slate-500">No events yet.</li>}
            {[...events].reverse().map((e, i) => (
              <li key={i} className="flex justify-between gap-2 border-b border-white/5 pb-1">
                <span>{describeProctoringEvent(e.eventType)}</span>
                <span className="whitespace-nowrap text-slate-500">
                  {new Date(e.occurredAt).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  state,
  detail,
}: {
  label: string;
  state: "ok" | "warning" | "unavailable";
  detail: string;
}) {
  const styles = {
    ok: "bg-green-500/20 text-green-300",
    warning: "bg-amber-500/20 text-amber-300",
    unavailable: "bg-slate-500/20 text-slate-400",
  };
  return (
    <div className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2 text-sm">
      <span className="text-slate-300">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[state]}`}>{detail}</span>
    </div>
  );
}
