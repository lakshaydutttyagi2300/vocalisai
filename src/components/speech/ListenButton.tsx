"use client";

import { useEffect, useRef, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { ACCENTS } from "@/lib/tts/accents";
import { playSpeech, useAccent, type PlayHandle, type SpeechSource } from "@/components/speech/speech";

// "Listen" in a natural voice, in the candidate's chosen accent. Falls back
// to the device's voice (with a one-line note) when a natural clip isn't
// available - it never fails silently.
export function ListenButton({
  source,
  fallbackText,
  label = "Listen",
  size = "sm",
  rate,
}: {
  source: SpeechSource;
  fallbackText: string;
  label?: string;
  size?: "sm" | "md";
  rate?: number;
}) {
  const [accent] = useAccent();
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const [note, setNote] = useState<string | null>(null);
  const handle = useRef<PlayHandle | null>(null);

  useEffect(() => () => handle.current?.stop(), []);

  async function toggle() {
    if (state !== "idle") {
      handle.current?.stop();
      setState("idle");
      return;
    }
    setNote(null);
    setState("loading");
    const h = playSpeech({ source, fallbackText, accent, rate });
    handle.current = h;
    const started = await h.started;
    if (handle.current !== h) return;
    setState("playing");
    if (!started.natural) setNote(`${started.message ?? "Natural voice unavailable."} Playing with your device's voice instead.`);
    await h.ended;
    if (handle.current === h) setState("idle");
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        data-loading={state === "loading" || undefined}
        className={`btn-secondary ${size === "sm" ? "btn-sm" : ""}`}
        aria-label={state === "idle" ? `${label} (${ACCENTS.find((a) => a.code === accent)?.label})` : "Stop"}
      >
        <Icon as={state === "playing" ? Square : Volume2} />
        {state === "idle" ? label : state === "loading" ? "Loading..." : "Stop"}
      </button>
      {note && <span className="text-xs text-slate-500">{note}</span>}
    </span>
  );
}

/** Pick the accent every Listen button on the page uses (remembered on this device). */
export function AccentPicker({ className = "" }: { className?: string }) {
  const [accent, setAccent] = useAccent();
  return (
    <div className={`inline-flex items-center gap-2 text-xs text-slate-600 ${className}`} role="radiogroup" aria-label="Voice accent">
      <span className="font-medium">Voice:</span>
      {ACCENTS.map((a) => (
        <button
          key={a.code}
          type="button"
          role="radio"
          aria-checked={accent === a.code}
          onClick={() => setAccent(a.code)}
          className={`rounded-full border px-2.5 py-1 font-semibold transition ${
            accent === a.code ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
          title={a.label}
        >
          {a.short}
        </button>
      ))}
    </div>
  );
}
