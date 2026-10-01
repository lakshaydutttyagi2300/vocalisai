"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

export interface HeroSlide {
  /** File name in /public/media/hero: <name>.webp poster, <name>.webm and <name>.mp4 clip. */
  name: string;
  tag: string;
  title: string;
  text: string;
  /** What the picture shows, for screen readers. */
  alt: string;
}

const SLIDE_MS = 6500;

// The landing hero: short, silent stock clips (docs/MEDIA_SOURCES.md) that
// cross-fade. Fast: posters first (the first one is the page's main image),
// and a slide's clip loads only once the page has loaded and the slide is
// shown. Calm: with reduced motion or Save-Data it stays on posters and never
// rotates by itself; it pauses off-screen, in a background tab, while hovered
// or focused, and with the Pause button. The progress bar's CSS animation
// times each slide, so pausing it pauses the countdown too.
export default function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [motionOk, setMotionOk] = useState(false);
  const [videoOk, setVideoOk] = useState(false);
  const [shown, setShown] = useState<number[]>([0]);
  const [offscreen, setOffscreen] = useState(false);
  const [hiddenTab, setHiddenTab] = useState(false);
  const [held, setHeld] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Decide after mounting (the server can't know), then wait for the page to load before any clip.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const lowData = Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType ?? "");
    const start = () => {
      setMotionOk(!reduced);
      setVideoOk(!reduced && !lowData);
    };
    if (document.readyState === "complete") {
      const id = window.setTimeout(start, 300);
      return () => window.clearTimeout(id);
    }
    window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting), { threshold: 0.2 });
    observer.observe(el);
    const onVisibility = () => setHiddenTab(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  function go(to: number) {
    const next = (to + slides.length) % slides.length;
    setIndex(next);
    setShown((cur) => (cur.includes(next) ? cur : [...cur, next]));
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowRight") go(index + 1);
    else if (e.key === "ArrowLeft") go(index - 1);
  }

  // Posters: the slides seen so far and the next one (so the cross-fade never shows an empty frame).
  const nearby = (i: number) => shown.includes(i) || i === (index + 1) % slides.length;
  const rotating = motionOk && playing;
  const clipsPaused = !playing || offscreen || hiddenTab;
  const slide = slides[index];

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Career moments"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setHeld(false)}
      className="relative min-w-0"
    >
      <div className="relative aspect-[1/1] overflow-hidden rounded-[1.75rem] bg-slate-200 shadow-[var(--shadow-premium)] ring-1 ring-ink-950/5 sm:aspect-[16/11] lg:aspect-[5/4]">
        {slides.map((s, i) => (
          <div
            key={s.name}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}: ${s.title}`}
            aria-hidden={i !== index}
            data-active={i === index}
            className="hero-slide absolute inset-0"
          >
            {nearby(i) && (
              // eslint-disable-next-line @next/next/no-img-element -- posters are already 960px WebP files of ~25 KB; next/image would only re-encode them
              <img
                src={`/media/hero/${s.name}.webp`}
                alt={s.alt}
                width={960}
                height={540}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
                className="hero-media absolute inset-0 h-full w-full object-cover"
              />
            )}
            {videoOk && shown.includes(i) && <SlideClip name={s.name} active={i === index} paused={clipsPaused} />}
          </div>
        ))}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink-950/35 to-transparent" />

        <div className="absolute inset-x-3 bottom-3 sm:inset-x-5 sm:bottom-5">
          <div key={slide.name} className="max-w-sm rounded-2xl bg-white/92 p-4 shadow-lg ring-1 ring-ink-950/5 backdrop-blur-md transition-opacity duration-500 sm:p-5" aria-live={rotating ? "off" : "polite"}>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-brand-600">{slide.tag}</p>
            <p className="mt-1 font-display text-lg font-bold leading-snug text-ink-950 sm:text-xl">{slide.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{slide.text}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex flex-1 gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show slide ${i + 1}: ${s.title}`}
              aria-current={i === index ? "true" : undefined}
              className="group flex h-6 flex-1 items-center"
            >
              <span className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-200 transition-colors group-hover:bg-slate-300">
                {i === index &&
                  (rotating ? (
                    <span
                      key={index}
                      className="hero-progress absolute inset-0 rounded-full bg-brand-600"
                      style={{ ["--hero-duration" as string]: `${SLIDE_MS}ms` }}
                      data-paused={held || offscreen || hiddenTab}
                      onAnimationEnd={() => go(index + 1)}
                    />
                  ) : (
                    <span className="absolute inset-0 rounded-full bg-brand-600" />
                  ))}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-none gap-1.5">
          <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" className="btn-secondary btn-sm h-9 w-9 px-0">
            <Icon as={ChevronLeft} />
          </button>
          {motionOk && (
            <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause slideshow" : "Play slideshow"} className="btn-secondary btn-sm h-9 w-9 px-0">
              <Icon as={playing ? Pause : Play} />
            </button>
          )}
          <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" className="btn-secondary btn-sm h-9 w-9 px-0">
            <Icon as={ChevronRight} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** One slide's clip: silent, looping, restarted each time its slide comes back. */
function SlideClip({ name, active, paused }: { name: string; active: boolean; paused: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) v.currentTime = 0;
  }, [active]);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active && !paused) v.play().catch(() => {});
    else v.pause();
  }, [active, paused]);
  return (
    <video ref={ref} muted playsInline loop preload="auto" aria-hidden="true" tabIndex={-1} poster={`/media/hero/${name}.webp`} className="hero-media absolute inset-0 h-full w-full object-cover">
      <source src={`/media/hero/${name}.webm`} type="video/webm" />
      <source src={`/media/hero/${name}.mp4`} type="video/mp4" />
    </video>
  );
}
