"use client";

import { useEffect, useRef, useState } from "react";
import type { ProctoringEventType } from "@/lib/proctoring-events";

export interface LoggedProctoringEvent {
  eventType: ProctoringEventType;
  detail: string | null;
  occurredAt: string;
}

type Availability = "ok" | "warning" | "unavailable";

export interface LiveProctoringStatus {
  face: Availability;
  faceDetail: string;
  tabFocus: Availability;
  fullscreen: Availability;
  mic: Availability;
}

const FLUSH_INTERVAL_MS = 5000;
const FACE_POLL_INTERVAL_MS = 3000;
const SILENCE_THRESHOLD_LEVEL = 4; // out of 0-100 from useMicLevel's scale
const SILENCE_DURATION_MS = 8000;

// Real detection only. Multi-voice/"additional person speaking" detection is
// deliberately not attempted here - it needs real speaker-diarization audio
// analysis that can't be done reliably client-side, so per the "don't claim
// capabilities that don't exist" rule, it's left out entirely rather than
// faked with a weak heuristic.
export function useLiveProctoring({
  sessionId,
  cameraStream,
  micStream,
  expectFullscreen,
}: {
  sessionId: string | null;
  cameraStream: MediaStream | null;
  micStream: MediaStream | null;
  expectFullscreen: boolean;
}) {
  const [events, setEvents] = useState<LoggedProctoringEvent[]>([]);
  const [status, setStatus] = useState<LiveProctoringStatus>({
    face: "unavailable",
    faceDetail: "Checking...",
    tabFocus: "ok",
    fullscreen: expectFullscreen ? "warning" : "unavailable",
    mic: "ok",
  });

  const bufferRef = useRef<LoggedProctoringEvent[]>([]);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  function logEvent(eventType: ProctoringEventType, detail?: string) {
    const entry: LoggedProctoringEvent = {
      eventType,
      detail: detail ?? null,
      occurredAt: new Date().toISOString(),
    };
    bufferRef.current.push(entry);
    setEvents((prev) => [...prev, entry]);
  }

  async function flush() {
    if (bufferRef.current.length === 0 || !sessionIdRef.current) return;
    const batch = bufferRef.current;
    bufferRef.current = [];
    try {
      await fetch(`/api/mock-tests/sessions/${sessionIdRef.current}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
      });
    } catch {
      // Best-effort: put unsent events back so the next flush retries them.
      bufferRef.current = [...batch, ...bufferRef.current];
    }
  }

  // Periodic flush.
  useEffect(() => {
    const interval = setInterval(flush, FLUSH_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tab/window focus.
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        logEvent("TAB_HIDDEN");
        setStatus((s) => ({ ...s, tabFocus: "warning" }));
      } else {
        logEvent("TAB_VISIBLE");
        setStatus((s) => ({ ...s, tabFocus: "ok" }));
      }
    }
    function onBlur() {
      logEvent("WINDOW_BLUR");
    }
    function onFocus() {
      logEvent("WINDOW_FOCUS");
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Fullscreen exit.
  useEffect(() => {
    if (!expectFullscreen) return;
    function onFullscreenChange() {
      if (!document.fullscreenElement) {
        logEvent("FULLSCREEN_EXIT");
        setStatus((s) => ({ ...s, fullscreen: "warning" }));
      } else {
        setStatus((s) => ({ ...s, fullscreen: "ok" }));
      }
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [expectFullscreen]);

  // Navigation attempts: real browser navigation/reload/close, and back/forward.
  // Cannot detect or prevent an in-app Link click, and modern browsers don't
  // allow a custom beforeunload message - this only proves an attempt happened.
  useEffect(() => {
    function onBeforeUnload() {
      logEvent("NAVIGATION_ATTEMPT", "beforeunload");
    }
    function onPopState() {
      logEvent("NAVIGATION_ATTEMPT", "back/forward");
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  // Copy/paste/cut - only detectable while focus is inside this page; we
  // cannot see clipboard activity that happens in another tab or app.
  useEffect(() => {
    const onCopy = () => logEvent("COPY_ATTEMPT");
    const onPaste = () => logEvent("PASTE_ATTEMPT");
    const onCut = () => logEvent("CUT_ATTEMPT");
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("cut", onCut);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("cut", onCut);
    };
  }, []);

  // Microphone disconnect.
  useEffect(() => {
    const track = micStream?.getAudioTracks()[0];
    if (!track) return;
    function onEnded() {
      logEvent("MIC_DISCONNECTED");
      setStatus((s) => ({ ...s, mic: "warning" }));
    }
    track.addEventListener("ended", onEnded);
    return () => track.removeEventListener("ended", onEnded);
  }, [micStream]);

  // Extended silence, using the same real Web Audio level analysis as the
  // system check's meter - not simulated.
  useEffect(() => {
    if (!micStream) return;
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(micStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    let silenceStartedAt: number | null = null;
    let alreadyLoggedThisEpisode = false;
    let frame: number;

    function tick() {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
      const level = Math.min(100, Math.round((avg / 255) * 100 * 2.2));

      if (level < SILENCE_THRESHOLD_LEVEL) {
        if (silenceStartedAt === null) silenceStartedAt = Date.now();
        const elapsed = Date.now() - silenceStartedAt;
        if (elapsed >= SILENCE_DURATION_MS && !alreadyLoggedThisEpisode) {
          logEvent("EXTENDED_SILENCE", `${Math.round(elapsed / 1000)}s`);
          alreadyLoggedThisEpisode = true;
        }
      } else {
        silenceStartedAt = null;
        alreadyLoggedThisEpisode = false;
      }
      frame = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      audioContext.close();
    };
  }, [micStream]);

  // Face presence, using the native Shape Detection API where it exists.
  // This is Chromium-only and inconsistently available even there - when
  // absent, we say so plainly instead of faking a result.
  useEffect(() => {
    if (!cameraStream) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const FaceDetectorCtor = (window as any).FaceDetector;
    if (!FaceDetectorCtor) {
      setStatus((s) => ({ ...s, face: "unavailable", faceDetail: "Face detection isn't available in this browser." }));
      return;
    }

    const video = document.createElement("video");
    video.srcObject = cameraStream;
    video.muted = true;
    video.play().catch(() => {});

    const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 4 });
    let lastState: "none" | "one" | "multiple" = "one";

    const interval = setInterval(async () => {
      if (video.readyState < 2) return;
      try {
        const faces = await detector.detect(video);
        const count = faces.length;
        let nextState: "none" | "one" | "multiple" = count === 0 ? "none" : count === 1 ? "one" : "multiple";

        if (nextState !== lastState) {
          if (nextState === "none") logEvent("FACE_NOT_DETECTED");
          else if (nextState === "multiple") logEvent("MULTIPLE_FACES", `${count} faces`);
          else logEvent("FACE_REAPPEARED");
          lastState = nextState;
        }

        setStatus((s) => ({
          ...s,
          face: nextState === "one" ? "ok" : "warning",
          faceDetail:
            nextState === "one"
              ? "One face detected."
              : nextState === "none"
                ? "No face detected."
                : `${count} faces detected.`,
        }));
      } catch {
        // Detection call itself failed - report as unavailable rather than guessing.
        setStatus((s) => ({ ...s, face: "unavailable", faceDetail: "Face detection isn't working in this browser." }));
      }
    }, FACE_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [cameraStream]);

  return { events, status, flush };
}
