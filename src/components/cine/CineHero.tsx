"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowRight, Pause, Play } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { CINE, clipSrc, useSmallScreen, useStillMedia } from "./media";
import type { SceneName } from "@/config/mediaLibrary";

export interface CineSlide {
  /** A clip scene from src/config/mediaLibrary.ts (each used once on the site). */
  name: SceneName;
  /** Short label under the slide's progress bar. */
  label: string;
  eyebrow: string;
  title: ReactNode;
  text: string;
  cta: { label: string; href: string };
  alt: string;
  /** Optional product UI floating over the media on large screens. */
  overlay?: ReactNode;
}

// Each clip is a seamless 6-second loop, so a slide lasts one clip and hands
// over just before the loop point: no frozen or black frames.
const SLIDE_SECONDS = 6;
const FADE_MS = 1100;

// The landing hero: a large media canvas whose clips cross-fade with a slow
// zoom, copy that changes with each slide, and progress bars that follow the
// clip itself. The next clip loads half-way through the current one. Posters
// only (no rotation) for reduced motion or Save-Data; it pauses off-screen,
// in a background tab, and with the Pause button.
export function CineHero({ slides, heading, secondary }: { slides: CineSlide[]; heading: string; secondary?: { label: string; href: string } }) {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState<number[]>([0]);
  const [playing, setPlaying] = useState(true);
  const [offscreen, setOffscreen] = useState(false);
  const [hiddenTab, setHiddenTab] = useState(false);
  const [started, setStarted] = useState(false);
  const still = useStillMedia();
  const small = useSmallScreen();
  const rootRef = useRef<HTMLElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const fill = useRef<HTMLSpanElement | null>(null);

  const go = useCallback(
    (to: number) => {
      const next = (to + slides.length) % slides.length;
      setIndex(next);
      setMounted((cur) => (cur.includes(next) ? cur : [...cur, next]));
    },
    [slides.length]
  );

  // Clips wait for the page to finish loading.
  useEffect(() => {
    const start = () => setStarted(true);
    if (document.readyState === "complete") {
      const id = window.setTimeout(start, 150);
      return () => window.clearTimeout(id);
    }
    window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => setOffscreen(!e.isIntersecting), { threshold: 0.15 });
    observer.observe(el);
    const onVisibility = () => setHiddenTab(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const running = !still && playing && !offscreen && !hiddenTab;

  // A slide starts its clip from the first frame; the one before it keeps
  // playing through the cross-fade, then pauses.
  useEffect(() => {
    const v = videos.current[index];
    if (v) {
      v.currentTime = 0;
      if (running) v.play().catch(() => {});
    }
    const others = videos.current.filter((x, i) => x && i !== index);
    const id = window.setTimeout(() => others.forEach((x) => x?.pause()), FADE_MS + 100);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on slide change; play/pause follows `running` below
  }, [index]);

  useEffect(() => {
    const v = videos.current[index];
    if (!v) return;
    if (running) v.play().catch(() => {});
    else v.pause();
  }, [running, index, mounted]);

  // The clock, ticking every 100 ms: the clip's own time when it is playing,
  // otherwise elapsed time (still posters, or a clip that is slow to arrive).
  // A plain timer rather than animation frames, which browsers stop for
  // windows that aren't being drawn.
  useEffect(() => {
    if (!running || !started) return;
    let last = performance.now();
    let wall = 0;
    let waited = 0;
    let preloaded = false;
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const v = videos.current[index];
      let p: number;
      if (v && v.readyState >= 2 && !v.paused && Number.isFinite(v.duration) && v.duration > 0) {
        p = v.currentTime / Math.min(v.duration, SLIDE_SECONDS);
      } else if (v && waited < 2.5) {
        waited += dt;
        p = 0;
      } else {
        wall += dt;
        p = wall / SLIDE_SECONDS;
      }
      if (fill.current) fill.current.style.transform = `scaleX(${Math.min(Math.max(p, 0), 1)})`;
      if (p > 0.45 && !preloaded) {
        preloaded = true;
        const n = (index + 1) % slides.length;
        setMounted((cur) => (cur.includes(n) ? cur : [...cur, n]));
      }
      if (p >= 0.96) {
        window.clearInterval(id);
        go(index + 1);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [running, started, index, go, slides.length]);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowRight") go(index + 1);
    else if (e.key === "ArrowLeft") go(index - 1);
  }

  const slide = slides[index];

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="What VocalisAi does"
      onKeyDown={onKeyDown}
      className="px-2 pt-2 sm:px-3 sm:pt-3"
    >
      <h1 className="sr-only">{heading}</h1>
      <div className="relative h-[calc(100svh-5.5rem)] min-h-[36rem] max-h-[58rem] overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-line">
        {slides.map((s, i) => (
          <div
            key={s.name}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}: ${s.label}`}
            aria-hidden={i !== index}
            data-active={i === index}
            data-scene={s.name}
            className="cine-slide absolute inset-0"
          >
            <div className="cine-slide-media absolute inset-0">
              {(i === 0 || mounted.includes(i)) && (
                <picture>
                  <source media="(max-width: 767px)" srcSet={`${CINE}/${s.name}-640.webp`} />
                  <img
                    src={`${CINE}/${s.name}.webp`}
                    alt={s.alt}
                    width={1280}
                    height={720}
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "auto"}
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </picture>
              )}
              {started && !still && mounted.includes(i) && (
                <video
                  ref={(el) => {
                    videos.current[i] = el;
                  }}
                  key={small ? "s" : "l"}
                  muted
                  playsInline
                  loop
                  preload="auto"
                  aria-hidden="true"
                  tabIndex={-1}
                  className="absolute inset-0 h-full w-full object-cover"
                >
                  <source src={`${CINE}/${s.name}-${small ? 640 : 1280}.webm`} type="video/webm" />
                  <source src={clipSrc(s.name, small)} type="video/mp4" />
                </video>
              )}
            </div>
            {s.overlay && <div className="pointer-events-none absolute right-8 top-1/2 hidden w-[23rem] -translate-y-1/2 xl:block">{s.overlay}</div>}
          </div>
        ))}
        <div aria-hidden="true" className="scrim-left pointer-events-none absolute inset-0 hidden sm:block" />
        <div aria-hidden="true" className="scrim-bottom pointer-events-none absolute inset-0" />

        <div className="absolute inset-x-0 bottom-0 px-6 pb-24 sm:px-12 sm:pb-28 lg:px-16">
          <div key={index} className="cine-copy max-w-3xl" aria-live={running ? "off" : "polite"}>
            <p className="cine-eyebrow">{slide.eyebrow}</p>
            <p className="cine-display mt-5 text-[2.7rem] text-fg sm:text-7xl lg:text-[5.4rem]">{slide.title}</p>
            <div>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg">{slide.text}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={slide.cta.href} className="btn-primary btn-lg">
                  {slide.cta.label}
                  <Icon as={ArrowRight} />
                </Link>
                {secondary && (
                  <Link href={secondary.href} className="btn-secondary btn-lg">
                    {secondary.label}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 px-6 pb-6 sm:px-12 sm:pb-8 lg:px-16">
          <div className="grid flex-1 gap-3" style={{ gridTemplateColumns: `repeat(${slides.length}, minmax(0, 1fr))` }}>
            {slides.map((s, i) => (
              <button
                key={s.name}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show slide ${i + 1}: ${s.label}`}
                aria-current={i === index ? "true" : undefined}
                className="group text-left"
              >
                <span className={`hidden pb-2 text-xs font-medium transition-colors md:block ${i === index ? "text-fg" : "text-fg-subtle group-hover:text-fg-muted"}`}>{s.label}</span>
                <span className="relative block h-[2px] overflow-hidden rounded-full bg-fg/10">
                  {i === index && (
                    <span
                      ref={(el) => {
                        fill.current = el;
                      }}
                      className="absolute inset-0 origin-left rounded-full bg-accent transition-transform duration-100 ease-linear"
                      style={{ transform: still || !playing ? "scaleX(1)" : "scaleX(0)" }}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
          {!still && (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause slideshow" : "Play slideshow"}
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-line bg-surface-muted text-fg backdrop-blur transition-colors hover:bg-fg/10"
            >
              <Icon as={playing ? Pause : Play} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
