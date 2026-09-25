"use client";

import { useEffect, useState } from "react";

// Display-only countdown to a SERVER deadline. `clockOffsetMs` is
// (server time - this browser's time) measured on the last state fetch,
// so a wrong local clock doesn't shift the display. The server never
// trusts this number - every write re-checks the real deadline.
export function useRemainingSeconds(deadlineIso: string | null, clockOffsetMs: number): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  if (!deadlineIso) return null;
  return Math.max(0, Math.ceil((Date.parse(deadlineIso) - (now + clockOffsetMs)) / 1000));
}

export function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function Countdown({ label, seconds, warnBelow = 60 }: { label: string; seconds: number | null; warnBelow?: number }) {
  if (seconds === null) return null;
  const warn = seconds <= warnBelow;
  return (
    <div className="text-right">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`font-mono text-sm font-semibold ${warn ? "text-red-400" : "text-slate-100"}`} aria-live={warn ? "polite" : "off"}>
        {formatSeconds(seconds)}
      </div>
    </div>
  );
}
