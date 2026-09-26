"use client";

// Natural-voice playback with a device-voice fallback. Asks the server for
// an ElevenLabs clip (POST /api/tts, which checks limits and caches); if
// none is available it speaks the same text with the browser's own voice
// in the chosen accent, so the candidate always hears something.

import { useEffect, useState } from "react";
import { accentLang, DEFAULT_ACCENT, isAccentCode, type AccentCode, type VoiceGender } from "@/lib/tts/accents";

export type SpeechSource =
  | { type: "question"; questionId: string }
  | { type: "improved-answer"; attemptId: string }
  | { type: "conversation-turn"; turnId: string }
  | { type: "phrase"; text: string };

const ACCENT_KEY = "vx-accent";
const ACCENT_EVENT = "vx-accent-change";

function readAccent(): AccentCode {
  try {
    const v = window.localStorage.getItem(ACCENT_KEY);
    return isAccentCode(v) ? v : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

/** The candidate's chosen accent, remembered on this device and shared by every Listen button on the page. */
export function useAccent(): [AccentCode, (a: AccentCode) => void] {
  const [accent, setAccentState] = useState<AccentCode>(DEFAULT_ACCENT);
  useEffect(() => {
    setAccentState(readAccent());
    const sync = () => setAccentState(readAccent());
    window.addEventListener(ACCENT_EVENT, sync);
    return () => window.removeEventListener(ACCENT_EVENT, sync);
  }, []);
  const setAccent = (a: AccentCode) => {
    try {
      window.localStorage.setItem(ACCENT_KEY, a);
    } catch {
      /* private mode - still works for this page */
    }
    setAccentState(a);
    window.dispatchEvent(new Event(ACCENT_EVENT));
  };
  return [accent, setAccent];
}

export interface PlayHandle {
  stop: () => void;
  /** Resolves when playback starts: natural = ElevenLabs clip; otherwise the device voice (with the reason). */
  started: Promise<{ natural: boolean; message?: string }>;
  /** Resolves when playback finishes or is stopped. */
  ended: Promise<void>;
}

function speakWithDevice(text: string, accent: AccentCode, rate: number, onEnd: () => void): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd();
    return () => {};
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const lang = accentLang(accent);
  u.lang = lang;
  const voice = synth.getVoices().find((v) => v.lang === lang) ?? synth.getVoices().find((v) => v.lang.startsWith("en"));
  if (voice) u.voice = voice;
  u.rate = rate;
  u.onend = onEnd;
  u.onerror = onEnd;
  synth.speak(u);
  return () => {
    synth.cancel();
    onEnd();
  };
}

export function playSpeech(opts: { source: SpeechSource; fallbackText: string; accent: AccentCode; gender?: VoiceGender; rate?: number }): PlayHandle {
  let stopFn: () => void = () => {};
  let stopped = false;
  let finish!: () => void;
  const ended = new Promise<void>((r) => (finish = r));

  const started = (async () => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: opts.source, accent: opts.accent, gender: opts.gender ?? "female" }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; message?: string; fallbackText?: string };
      if (stopped) return { natural: false };
      if (res.ok && data.ok && data.url) {
        const audio = new Audio(data.url);
        audio.playbackRate = opts.rate ?? 1;
        audio.onended = () => finish();
        audio.onerror = () => finish();
        stopFn = () => {
          audio.pause();
          finish();
        };
        await audio.play();
        return { natural: true };
      }
      stopFn = speakWithDevice(data.fallbackText || opts.fallbackText, opts.accent, opts.rate ?? 0.95, finish);
      return { natural: false, message: data.message };
    } catch {
      if (stopped) return { natural: false };
      stopFn = speakWithDevice(opts.fallbackText, opts.accent, opts.rate ?? 0.95, finish);
      return { natural: false };
    }
  })();

  return {
    stop: () => {
      stopped = true;
      stopFn();
      finish();
    },
    started,
    ended,
  };
}
