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

// Breaks one segment's text into plain/filler/issue chunks for highlighting.
// Every match comes from real, already-computed data (the deterministic
// filler list, or the AI's own quoted grammar excerpt) - never a new guess.
function highlightChunks(
  text: string,
  fillerWords: string[],
  issueExcerpts: string[]
): { text: string; type: "plain" | "filler" | "issue" }[] {
  type Match = { start: number; end: number; type: "filler" | "issue" };
  const matches: Match[] = [];

  for (const filler of fillerWords) {
    const re = new RegExp(`\\b${filler.replace(" ", "\\s+")}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) matches.push({ start: m.index, end: m.index + m[0].length, type: "filler" });
  }
  for (const excerpt of issueExcerpts) {
    if (!excerpt.trim()) continue;
    const idx = text.toLowerCase().indexOf(excerpt.toLowerCase());
    if (idx !== -1) matches.push({ start: idx, end: idx + excerpt.length, type: "issue" });
  }

  if (matches.length === 0) return [{ text, type: "plain" }];

  matches.sort((a, b) => a.start - b.start);
  const chunks: { text: string; type: "plain" | "filler" | "issue" }[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue; // skip overlapping match
    if (m.start > cursor) chunks.push({ text: text.slice(cursor, m.start), type: "plain" });
    chunks.push({ text: text.slice(m.start, m.end), type: m.type });
    cursor = m.end;
  }
  if (cursor < text.length) chunks.push({ text: text.slice(cursor), type: "plain" });
  return chunks;
}

export function SyncedTranscript({
  recordingId,
  segments,
  fallbackText,
  fillerWords = [],
  issueExcerpts = [],
}: {
  recordingId: string | null;
  segments: TranscriptSegment[];
  fallbackText: string;
  fillerWords?: string[];
  issueExcerpts?: string[];
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
        <>
          {(fillerWords.length > 0 || issueExcerpts.length > 0) && (
            <div className="mt-3 flex gap-4 text-xs text-slate-500">
              {fillerWords.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-100" /> Filler word
                </span>
              )}
              {issueExcerpts.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-red-100" /> Grammar issue
                </span>
              )}
            </div>
          )}
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
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
                {highlightChunks(seg.text.trim(), fillerWords, issueExcerpts).map((chunk, j) => (
                  <span
                    key={j}
                    className={
                      chunk.type === "filler"
                        ? "rounded bg-amber-100 text-amber-800"
                        : chunk.type === "issue"
                          ? "rounded bg-red-100 text-red-700 underline decoration-red-300 decoration-2"
                          : undefined
                    }
                  >
                    {chunk.text}
                  </span>
                ))}{" "}
              </span>
            ))}
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-slate-700">{fallbackText}</p>
      )}
    </div>
  );
}
