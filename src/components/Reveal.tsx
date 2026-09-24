"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Lightweight scroll-in fade/rise, used only on the landing page. No
// animation library - just IntersectionObserver toggling a data attribute
// that globals.css transitions. Renders revealed immediately if JS hasn't
// run yet (e.g. no-JS), so content is never stuck invisible.
export default function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          window.setTimeout(() => setRevealed(true), delayMs);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delayMs]);

  return (
    <div ref={ref} data-reveal={revealed ? "revealed" : undefined} className={className}>
      {children}
    </div>
  );
}
