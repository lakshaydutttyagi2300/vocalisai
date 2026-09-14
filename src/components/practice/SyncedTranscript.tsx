"use client";

// Phase 9 (Transcription): a real audio-synced transcript. The segment
// timestamps come directly from the transcription provider's own
// verbose_json response (Groq gives these for free) - already computed for
// long-pause detection since Phase 8, just never persisted or shown until
// now. Nothing here is estimated: clicking a word seeks to that segment's
// real start time, and highlighting follows the audio element's real
// currentTime, not a guess.

import { useEffect, useRef, useState } from "react";

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export function SyncedTranscript({
  recordingId,
  segments,
  fallbackText,
}: {
  recordingId: string | null;
  segments: TranscriptSegment[];
  fallbackText: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || segments.length === 0) return;

    function onTimeUpdate() {
      const t = audio!.currentTime;
      const idx = segments.findIndex((s) => t >= s.start && t < s.end);
      setActiveIndex(idx);
    }
    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, [segments]);

  function seekTo(start: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = start;
    audio.play().catch(() => {});
  }

  if (!recordingId) {
    return <p className="text-sm leading-relaxed text-slate-700">{fallbackText}</p>;
  }

  return (
    <div>
      <audio ref={audioRef} controls src={`/api/practice/recordings/${recordingId}`} className="w-full" />

      {segments.length > 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-slate-700">
          {segments.map((seg, i) => (
            <span
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => seekTo(seg.start)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") seekTo(seg.start);
              }}
              title={`Jump to ${seg.start.toFixed(1)}s`}
              className={`cursor-pointer rounded px-0.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                i === activeIndex ? "bg-brand-100 text-brand-900" : "hover:bg-slate-100"
              }`}
            >
              {seg.text.trim()}{" "}
            </span>
          ))}
        </p>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-slate-700">{fallbackText}</p>
      )}
    </div>
  );
}
