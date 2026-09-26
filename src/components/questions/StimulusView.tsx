"use client";

// Renders a question's stimulus (from src/lib/question-stimulus.ts) for a
// candidate: a reading passage, a listening recording (spoken in the
// browser, never shown as text), or a picture-description task. Used by
// every candidate question screen, so no screen ever prints a raw passage.

import { useEffect, useRef, useState } from "react";
import { Headphones, Image as ImageIcon } from "lucide-react";
import type { Stimulus } from "@/lib/question-stimulus";
import { Icon, IconBadge } from "@/components/ui/Icon";

export function StimulusView({ stimulus, resetKey }: { stimulus: Stimulus | null | undefined; resetKey: string }) {
  if (!stimulus || stimulus.kind === "none") return null;
  if (stimulus.kind === "text") {
    return <p className="mb-4 whitespace-pre-line rounded-md bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{stimulus.text}</p>;
  }
  if (stimulus.kind === "image") return <PictureTask description={stimulus.description} features={stimulus.features} />;
  return <ListeningPlayer key={resetKey} stimulus={stimulus} />;
}

function PictureTask({ description, features }: { description: string; features: string[] }) {
  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4" aria-label="Picture">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon as={ImageIcon} />
        The picture
      </div>
      <p className="mt-2 text-sm font-medium leading-relaxed text-ink-900">{description}</p>
      {features.length > 0 && (
        <>
          <p className="mt-3 text-xs text-slate-500">In the picture you can see:</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {features.map((k) => (
              <li key={k} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                {k}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

type AudioStimulus = Extract<Stimulus, { kind: "audio" }>;

// Distinct voices per speaker where the device has them, and a pitch
// difference either way, so a two-person conversation sounds like two people.
const PITCHES = [1, 0.8, 1.2, 0.9];

function pickVoices(speakers: string[]): Map<string, { voice: SpeechSynthesisVoice | null; pitch: number }> {
  const all = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis.getVoices() : [];
  const english = all.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const pool = english.length > 0 ? english : all;
  const map = new Map<string, { voice: SpeechSynthesisVoice | null; pitch: number }>();
  speakers.forEach((s, i) => map.set(s, { voice: pool.length ? pool[i % pool.length] : null, pitch: PITCHES[i % PITCHES.length] }));
  return map;
}

type PlayerState = "idle" | "loading" | "playing" | "error";

// Plays the generated recording when there is one; otherwise (or if it
// fails to load) speaks the script in the browser with a different voice
// per speaker. Either way the candidate sees only the player - never the
// script, speaker ids or any spec field - and a friendly message if
// neither can play. The play limit counts every started play.
function ListeningPlayer({ stimulus }: { stimulus: AudioStimulus }) {
  const [state, setState] = useState<PlayerState>("idle");
  const [playsUsed, setPlaysUsed] = useState(0);
  const [fileFailed, setFileFailed] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const speakers = [...new Set(stimulus.turns.map((t) => t.speaker))];
  const playsLeft = stimulus.playLimit === null ? null : Math.max(0, stimulus.playLimit - playsUsed);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  const useFile = !!stimulus.audioUrl && !fileFailed;

  useEffect(() => {
    if (canSpeak) window.speechSynthesis.getVoices(); // voices load asynchronously in Chrome
    return () => {
      cancelledRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      audioRef.current?.pause();
      if (canSpeak) window.speechSynthesis.cancel();
    };
  }, [canSpeak]);

  // Nothing could be played: show the friendly message and give the play
  // back, so a technical failure never costs the candidate one of their plays.
  function fail() {
    setState("error");
    setPlaysUsed((n) => Math.max(0, n - 1));
  }

  function speakInBrowser(): boolean {
    if (!canSpeak) return false;
    const synth = window.speechSynthesis;
    synth.cancel();
    cancelledRef.current = false;
    const voices = pickVoices(speakers);
    const speakTurn = (i: number) => {
      if (cancelledRef.current) return;
      if (i >= stimulus.turns.length) {
        setState("idle");
        return;
      }
      const turn = stimulus.turns[i];
      const u = new SpeechSynthesisUtterance(turn.text);
      const v = voices.get(turn.speaker);
      if (v?.voice) u.voice = v.voice;
      u.pitch = v?.pitch ?? 1;
      u.rate = stimulus.rate;
      u.onend = () => {
        timeoutRef.current = setTimeout(() => speakTurn(i + 1), stimulus.pauseMs);
      };
      u.onerror = (e) => {
        if (e.error !== "interrupted" && e.error !== "canceled") fail();
      };
      synth.speak(u);
    };
    setState("playing");
    speakTurn(0);
    return true;
  }

  function playFile(): void {
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(stimulus.audioUrl!);
      audio.preload = "auto";
      audioRef.current = audio;
    }
    const a = audio;
    a.onended = () => setState("idle");
    a.onplaying = () => setState("playing");
    a.onerror = () => {
      // The file couldn't load (missing, network) - same play, browser voices.
      setFileFailed(true);
      if (!speakInBrowser()) fail();
    };
    a.currentTime = 0;
    setState("loading");
    a.play().catch(() => {
      setFileFailed(true);
      if (!speakInBrowser()) fail();
    });
  }

  function play() {
    if (state === "playing" || state === "loading" || playsLeft === 0) return;
    if (!useFile && !canSpeak) {
      setState("error");
      return;
    }
    setPlaysUsed((n) => n + 1);
    if (useFile) playFile();
    else speakInBrowser();
  }

  const busy = state === "playing" || state === "loading";

  return (
    <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50/60 p-4" aria-label="Listening recording">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconBadge as={Headphones} tone="solid" />
          <div>
            <p className="text-sm font-semibold text-ink-900">Listening task</p>
            <p className="text-xs text-slate-600">
              {speakers.length > 1 ? `A conversation between ${speakers.length} speakers. ` : ""}
              Listen carefully - the recording is not shown as text.
            </p>
          </div>
        </div>
        <button type="button" onClick={play} disabled={busy || playsLeft === 0} className="btn-primary disabled:opacity-60">
          {state === "loading" ? (
            "Loading..."
          ) : state === "playing" ? (
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Playing...
            </span>
          ) : playsUsed === 0 ? (
            "Play audio"
          ) : (
            "Play again"
          )}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-600" aria-live="polite">
        {state === "error" ? (
          <span role="alert" className="font-medium text-red-700">
            Sorry - this recording can&apos;t be played right now. Please check your sound, or try again in a moment
            {playsLeft !== 0 ? " using the button above" : ""}. If it still doesn&apos;t play, answer as best you can and let us know.
          </span>
        ) : playsLeft === null ? (
          "You can replay this recording."
        ) : playsLeft === 0 ? (
          "You have used all plays for this recording."
        ) : (
          `Plays left: ${playsLeft} of ${stimulus.playLimit}`
        )}
      </p>
      {stimulus.transcript && (
        <div className="mt-3">
          <button type="button" onClick={() => setShowTranscript((v) => !v)} className="text-xs font-semibold text-brand-700 hover:underline">
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>
          {showTranscript && (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {stimulus.transcript.map((t, i) => (
                <li key={i}>
                  <span className="font-semibold">{t.label}:</span> {t.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
