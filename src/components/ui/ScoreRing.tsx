"use client";

// Reusable circular score indicator - pure presentation, no data logic.
// The caller always passes a real, already-computed number (or null); this
// component never invents one. `null` renders as an honest dash, not 0.
// The number counts up to that real value on mount/change (a tasteful,
// one-time reveal, not a looping animation), skipped entirely when the
// viewer has requested reduced motion.

import { useEffect, useRef, useState } from "react";

const SIZE = 132;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({
  value,
  label,
  tone = "brand",
  size = SIZE,
}: {
  value: number | null;
  label: string;
  tone?: "brand" | "amber";
  size?: number;
}) {
  const scale = size / SIZE;
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
  const strokeColor = tone === "amber" ? "var(--color-amber-500)" : "var(--color-brand-600)";

  const [displayed, setDisplayed] = useState<number | null>(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === null) {
      setDisplayed(null);
      return;
    }
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setDisplayed(value);
      return;
    }

    const target = value;
    const duration = 700;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayed(Math.round(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-slate-100)" strokeWidth={STROKE} />
        {value !== null && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={strokeColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 700ms ease" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-extrabold text-ink-900" style={{ fontSize: 30 * scale }}>
          {displayed === null ? "—" : displayed}
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      </div>
    </div>
  );
}
