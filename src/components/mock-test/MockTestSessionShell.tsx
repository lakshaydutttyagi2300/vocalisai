"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLiveProctoring, type LiveProctoringStatus } from "@/hooks/useLiveProctoring";
import { describeProctoringEvent } from "@/lib/proctoring-events";
import { MockTestQuestionRunner } from "@/components/mock-test/MockTestQuestionRunner";
import { ExamRunnerV2 } from "@/components/exam-runner-v2/ExamRunnerV2";
import { RotateCcw, ScanFace, SquareX, UsersRound } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

const ACTIVE_V2_SESSION_KEY = "vocalisai:activeExamSession";

function forgetActiveV2Session() {
  try {
    localStorage.removeItem(ACTIVE_V2_SESSION_KEY);
  } catch {
    // storage blocked - nothing to forget
  }
}

interface TemplateSection {
  order: number;
  category: string;
  difficulty: string;
  questionCount: number;
}

export function MockTestSessionShell({
  cameraStream,
  micStream,
  templateId = null,
  anyVersion = false,
}: {
  cameraStream: MediaStream | null;
  micStream: MediaStream | null;
  // The test chosen on the Mock Tests page; null = the default template.
  templateId?: string | null;
  // The chosen exam has several versions: start one not taken yet.
  anyVersion?: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionCreatedRef = useRef(false);
  const endingRef = useRef(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sections, setSections] = useState<TemplateSection[] | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  // The plan's allowance is used up: offer the plans, not "Try again".
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [ending, setEnding] = useState(false);
  // Decided server-side (api/mock-tests/sessions): "v2" only for a
  // template linked to an exam format with the exam_runner_v2 flag on.
  // Anything else - including an older server that doesn't send the
  // field at all - uses today's runner.
  const [runner, setRunner] = useState<"v1" | "v2">("v1");

  const { events, status } = useLiveProctoring({
    sessionId,
    cameraStream,
    micStream,
    expectFullscreen: true,
  });

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = cameraStream;
  }, [cameraStream]);

  // P1-E resume: a refresh (or browser crash) re-mounts this shell, which
  // would otherwise create a brand-new session and spend another
  // MOCK_ASSESSMENT allowance. For a v2 exam, the session id is
  // remembered here and - if the server confirms it's still in progress
  // AND belongs to whoever is signed in now (ownership-checked route) - it
  // is resumed instead. v1 sessions never write this key, so today's
  // runner behaves exactly as before.
  async function tryResumeV2(): Promise<boolean> {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(ACTIVE_V2_SESSION_KEY);
    } catch {
      return false;
    }
    if (!stored) return false;
    try {
      const res = await fetch(`/api/exam-sessions/${stored}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.status === "IN_PROGRESS") {
        setSessionId(stored);
        setRunner("v2");
        setSections([]);
        return true;
      }
    } catch {
      // fall through to a fresh session
    }
    forgetActiveV2Session();
    return false;
  }

  async function startSession() {
    setStartError(null);
    if (await tryResumeV2()) return;
    try {
      const res = templateId
        ? await fetch("/api/mock-tests/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(anyVersion ? { templateId, anyVersion: true } : { templateId }),
          })
        : await fetch("/api/mock-tests/sessions", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setStartError(data.error || "Couldn't start the mock test. Please try again.");
        setNeedsUpgrade(data.upgrade === true);
        if (data.upgrade === true) releaseDevices(); // nothing to proctor
        return;
      }
      setSessionId(data.sessionId);
      setSections(data.template?.sections ?? []);
      const nextRunner = data.runner === "v2" ? "v2" : "v1";
      setRunner(nextRunner);
      if (nextRunner === "v2") {
        try {
          localStorage.setItem(ACTIVE_V2_SESSION_KEY, data.sessionId);
        } catch {
          // storage blocked - the exam still runs, it just can't auto-resume
        }
      }
    } catch {
      setStartError("Network error while starting the mock test. Please try again.");
    }
  }

  // During an exam the site menu scrolls away and this shell's own bar
  // (timer + End assessment) stays pinned instead - otherwise the sticky
  // site menu covers End assessment as soon as the candidate scrolls.
  useEffect(() => {
    document.documentElement.dataset.examSession = "true";
    return () => {
      delete document.documentElement.dataset.examSession;
    };
  }, []);

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

  function releaseDevices() {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    cameraStream?.getTracks().forEach((t) => t.stop());
    micStream?.getTracks().forEach((t) => t.stop());
  }

  async function endTest() {
    if (endingRef.current) return;
    endingRef.current = true;
    setEnding(true);
    // The test never started (e.g. the plan's allowance is used up): there is
    // nothing to save, so just leave - never a button that silently does nothing.
    if (!sessionId) {
      releaseDevices();
      router.push("/mock-tests");
      return;
    }
    // Saves the end time (and, for a timed exam, submits the open section)
    // before showing the results; a network failure still leaves the
    // candidate on their results page, which finishes the session itself.
    await fetch(`/api/mock-tests/sessions/${sessionId}`, { method: "PATCH" }).catch(() => null);
    if (runner === "v2") forgetActiveV2Session();
    releaseDevices();
    router.push(runner === "v2" ? `/exam/results/${sessionId}` : `/mock-tests/results/${sessionId}`);
  }

  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const ss = String(elapsedSeconds % 60).padStart(2, "0");

  return (
    <div className="focus-surface min-h-screen">
      <div className="sticky top-0 z-30">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Recording
          </div>
          <div className="font-mono text-sm text-fg-muted">{mm}:{ss} elapsed</div>
          <button onClick={endTest} data-loading={ending || undefined} className="btn-danger btn-sm">
            <Icon as={SquareX} />
            End assessment
          </button>
        </div>
        <CameraWarning status={status} />
      </div>

      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[1fr_240px]">
        <div className="flex flex-col items-center">
          {startError ? (
            <div className="text-center">
              <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-strong">
                {startError}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {needsUpgrade ? (
                  <Link href="/pricing" className="btn-primary btn-sm">
                    See plans and pricing
                  </Link>
                ) : (
                  <button onClick={startSession} className="btn-secondary btn-sm">
                    <Icon as={RotateCcw} />
                    Try again
                  </button>
                )}
                <button onClick={endTest} className="btn-dark btn-sm">
                  Back to Mock Exams
                </button>
              </div>
            </div>
          ) : runner === "v2" && sessionId ? (
            // v2 gets its questions from its own server-held plan, not
            // from template sections, so it's checked before the
            // sections-based branches below (a resumed v2 session has none).
            <ExamRunnerV2 sessionId={sessionId} micStream={micStream} onComplete={endTest} />
          ) : !sections ? (
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : sections.length === 0 ? (
            <p className="text-center text-sm text-fg-muted">
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

          <div className="mt-8 aspect-video w-48 overflow-hidden rounded-md border border-line bg-surface-muted">
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
              <li key={i} className="flex justify-between gap-2 border-b border-line pb-1">
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

// Shown the moment the camera check sees someone else in frame (or nobody),
// and gone as soon as that's resolved. Logging happens in useLiveProctoring.
function CameraWarning({ status }: { status: LiveProctoringStatus }) {
  if (status.people === "multiple") {
    return (
      <div role="alert" className="flex items-start gap-3 bg-danger px-6 py-3 text-on-ink shadow-lg">
        <Icon as={UsersRound} size="md" className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Multiple people detected. Only the candidate should be visible.</p>
          <p className="text-sm opacity-90">
            {status.peopleCount} people are in view of your camera. This has been recorded, and the warning clears as soon as only you are in view.
          </p>
        </div>
      </div>
    );
  }
  if (status.people === "none") {
    return (
      <div role="status" className="flex items-start gap-3 bg-warning-soft px-6 py-3 text-warning-strong shadow-lg">
        <Icon as={ScanFace} size="md" className="mt-0.5 shrink-0" />
        <p className="font-semibold">We can&apos;t see your face. Please sit facing the camera.</p>
      </div>
    );
  }
  return null;
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
    ok: "bg-success-soft text-success-strong",
    warning: "bg-warning-soft text-warning-strong",
    unavailable: "bg-surface text-fg-muted",
  };
  return (
    <div className="flex items-center justify-between rounded-md bg-surface-muted px-3 py-2 text-sm">
      <span className="text-fg-muted">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[state]}`}>{detail}</span>
    </div>
  );
}
