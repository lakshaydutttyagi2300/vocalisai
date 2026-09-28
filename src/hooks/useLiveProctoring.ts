"use client";

import { useEffect, useRef, useState } from "react";
import type { ProctoringEventType } from "@/lib/proctoring-events";
import { createFaceSampler, type FaceSampler } from "@/lib/proctoring/face-detector";
import { countFaces, PeopleMonitor, SAMPLE_INTERVAL_MS, type PeopleState } from "@/lib/proctoring/people-monitor";

export interface LoggedProctoringEvent {
  eventType: ProctoringEventType;
  detail: string | null;
  occurredAt: string;
}

type Availability = "ok" | "warning" | "unavailable";

export interface LiveProctoringStatus {
  face: Availability;
  faceDetail: string;
  /** Steady people-in-frame state; null until the camera check is running. */
  people: PeopleState | null;
  peopleCount: number;
  tabFocus: Availability;
  fullscreen: Availability;
  mic: Availability;
}

const FLUSH_INTERVAL_MS = 5000;
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
    people: null,
    peopleCount: 0,
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

  // People in frame: on-device face detection once a second for as long as
  // the exam is on screen (src/lib/proctoring/*). PeopleMonitor smooths the
  // raw counts, so one noisy frame never raises a warning; each episode is
  // logged once, with how long it lasted.
  useEffect(() => {
    if (!cameraStream) return;
    let cancelled = false;
    let sampler: FaceSampler | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;

    const video = document.createElement("video");
    video.srcObject = cameraStream;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});
    const monitor = new PeopleMonitor();
    setStatus((s) => ({ ...s, face: "unavailable", faceDetail: "Starting the camera check...", people: null }));

    createFaceSampler().then((found) => {
      if (cancelled) {
        found?.close();
        return;
      }
      if (!found) {
        setStatus((s) => ({ ...s, face: "unavailable", faceDetail: "The camera check isn't available in this browser.", people: null }));
        return;
      }
      sampler = found;
      let busy = false;
      timer = setInterval(async () => {
        if (busy || video.readyState < 2 || !video.videoWidth) return;
        busy = true;
        try {
          const count = countFaces(await found.detect(video), video.videoWidth);
          const change = monitor.push(count);
          if (change?.kind === "multiple-started") logEvent("MULTIPLE_FACES", `${change.people} people in view`);
          else if (change?.kind === "multiple-ended") logEvent("MULTIPLE_FACES_CLEARED", `after ${change.seconds}s`);
          else if (change?.kind === "face-lost") logEvent("FACE_NOT_DETECTED");
          else if (change?.kind === "face-back") logEvent("FACE_REAPPEARED");

          const people = monitor.state;
          const shown = people === "multiple" ? Math.max(monitor.peak, count) : count;
          setStatus((s) => ({
            ...s,
            people,
            peopleCount: shown,
            face: people === "one" ? "ok" : "warning",
            faceDetail: people === "multiple" ? `${shown} people detected.` : people === "none" ? "Face not visible." : "Only you are visible.",
          }));
        } catch {
          // The detection call itself failed - say so rather than guess.
          setStatus((s) => ({ ...s, face: "unavailable", faceDetail: "The camera check stopped working in this browser.", people: null }));
        } finally {
          busy = false;
        }
      }, SAMPLE_INTERVAL_MS);
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      sampler?.close();
      video.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraStream]);

  return { events, status, flush };
}
