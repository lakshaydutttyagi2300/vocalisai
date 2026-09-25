"use client";

import { useEffect, useRef, useState } from "react";
import { useMicLevel } from "@/hooks/useMicLevel";
import { uploadRecording } from "@/lib/upload-recording-client";
import { formatSeconds } from "./Countdown";

type Phase = "ready" | "prep" | "recording" | "uploading" | "done" | "error";

// TIMED_SPEAKING: a preparation countdown, then recording starts
// automatically and stops when the response time runs out (or earlier,
// if the candidate stops it). The upload reuses the existing recording
// flow (R2 direct or server fallback) unchanged; the answer is just the
// resulting recordingId, which the server checks belongs to this user.
// These two timers are client-driven - the PAPER deadline around them is
// still enforced server-side.
export function TimedSpeaking({
  micStream,
  prepSeconds,
  responseSeconds,
  alreadyAnswered,
  onRecorded,
}: {
  micStream: MediaStream | null;
  prepSeconds: number;
  responseSeconds: number;
  alreadyAnswered: boolean;
  onRecorded: (recordingId: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>(alreadyAnswered ? "done" : "ready");
  const [secondsLeft, setSecondsLeft] = useState(prepSeconds);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const micLevel = useMicLevel(phase === "recording" ? micStream : null);

  useEffect(() => {
    if (phase !== "prep" && phase !== "recording") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          if (phase === "prep") startRecording();
          else stopRecording();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function startRecording() {
    if (!micStream) {
      setError("No microphone is available.");
      setPhase("error");
      return;
    }
    chunksRef.current = [];
    const recorder = new MediaRecorder(micStream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      setPhase("uploading");
      try {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const recordingId = await uploadRecording(blob, duration);
        onRecorded(recordingId);
        setPhase("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save your recording.");
        setPhase("error");
      }
    };
    recorder.start();
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    setSecondsLeft(responseSeconds);
    setPhase("recording");
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  return (
    <div className="mt-4 rounded-md border border-slate-200 p-4">
      {phase === "ready" && (
        <div>
          <p className="text-sm text-slate-600">
            You&apos;ll have {formatSeconds(prepSeconds)} to prepare, then {formatSeconds(responseSeconds)} to speak. Recording starts automatically.
          </p>
          <button type="button" onClick={() => { setSecondsLeft(prepSeconds); setPhase("prep"); }} className="btn-primary mt-3">
            Start preparation
          </button>
        </div>
      )}
      {phase === "prep" && (
        <div>
          <p className="text-sm font-semibold text-ink-900">Preparation time: {formatSeconds(secondsLeft)}</p>
          <button type="button" onClick={startRecording} className="btn-secondary mt-3">
            I&apos;m ready - start speaking now
          </button>
        </div>
      )}
      {phase === "recording" && (
        <div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-red-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" /> Recording
            </span>
            <span className="font-mono text-sm font-semibold text-ink-900">{formatSeconds(secondsLeft)}</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-red-400 transition-all duration-100" style={{ width: `${micLevel}%` }} />
          </div>
          <button type="button" onClick={stopRecording} className="btn-secondary mt-3">
            Finish speaking
          </button>
        </div>
      )}
      {phase === "uploading" && <p className="text-sm text-slate-500">Saving your recording...</p>}
      {phase === "done" && <p className="text-sm font-medium text-brand-700">Your response has been recorded and saved.</p>}
      {phase === "error" && (
        <div>
          <p role="alert" className="text-sm text-red-600">{error}</p>
          <button type="button" onClick={() => { setError(null); setSecondsLeft(prepSeconds); setPhase("ready"); }} className="btn-secondary mt-3">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
