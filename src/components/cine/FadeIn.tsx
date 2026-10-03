"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Content below the fold fades and rises in as it arrives. Rendered visible
// on the server (and without JavaScript); only elements that start off-screen
// are hidden, so nothing on screen ever flashes.
export function FadeIn({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"shown" | "pending">("shown");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let first = true;
    const o = new IntersectionObserver(
      ([e]) => {
        if (first) {
          first = false;
          if (!e.isIntersecting) setState("pending");
          return;
        }
        if (e.isIntersecting) {
          setState("shown");
          o.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    o.observe(el);
    return () => o.disconnect();
  }, []);
  return (
    <div ref={ref} data-state={state} className={`fade-in ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}
