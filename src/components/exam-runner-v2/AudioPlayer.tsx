"use client";

import { Play, RotateCcw, Volume2 } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useRef, useState } from "react";

// Play-limited audio. Every play is granted by the server first
// (/audio-play), which enforces the limit and keeps the count across
// refreshes; only then is the audio fetched and played. No seek bar -
// real listening papers play straight through.
export function AudioPlayer({
  sessionId,
  itemGroupId,
  playLimit,
  initialPlaysUsed,
}: {
  sessionId: string;
  itemGroupId: string;
  playLimit: number | null;
  initialPlaysUsed: number;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playsUsed, setPlaysUsed] = useState(initialPlaysUsed);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = playLimit === null ? null : Math.max(0, playLimit - playsUsed);
  const exhausted = remaining === 0;

  async function play() {
    setError(null);
    const res = await fetch(`/api/exam-sessions/${sessionId}/audio-play`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemGroupId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Couldn't play the recording.");
      if (typeof data?.playsUsed === "number") setPlaysUsed(data.playsUsed);
      return;
    }
    setPlaysUsed(data.playsUsed);
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = `/api/exam-sessions/${sessionId}/assets/${itemGroupId}?play=${data.playsUsed}`;
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setError("Your browser blocked playback. Please press play again.");
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <audio ref={audioRef} onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} preload="none" />
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={play} disabled={playing || exhausted} className="btn-primary">
          <Icon as={playing ? Volume2 : playsUsed === 0 ? Play : RotateCcw} className={playing ? "animate-pulse" : ""} />
          {playing ? "Playing..." : playsUsed === 0 ? "Play recording" : "Play again"}
        </button>
        <span className="text-xs text-slate-500">
          {remaining === null ? "Unlimited plays" : exhausted ? "No plays left" : `${remaining} play${remaining === 1 ? "" : "s"} left`}
        </span>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
