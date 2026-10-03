"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { preload } from "react-dom";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useReducedMotion, useSlowConnection, useSmallScreen } from "@/components/cine/media";
import type { HeroMediaItem } from "@/config/heroMedia";

// A page hero that rotates through a few clips and stills (src/config/heroMedia.ts).
//  - 800ms cross-fade; a clip shows for one loop (~6 s), a still for 7 s with a slow zoom.
//  - Progress bars to see and pick slides; pauses on hover, in a background tab,
//    off-screen, and with the Pause button.
//  - Only the current and next clip are loaded; posters first (the first one is
//    preloaded for a fast first paint).
//  - Reduced motion: first picture only, no autoplay or rotation, arrows to step.
//  - Phones, Save-Data and 2G/3G: stills and posters only, never video.
//  - Light treatment: a warm cream gradient behind dark text, never a black overlay.

const IMAGE_SECONDS = 7;
const CLIP_SECONDS = 6;

export interface MediaHeroProps {
  /** A way back to the parent page, shown above the title. */
  back?: { label: string; href: string };
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  cta?: { label: string; href: string };
  secondary?: { label: string; href: string };
  /** Extra actions or a search box under the text. */
  children?: ReactNode;
  stats?: string[];
  /** A widget beside the text (e.g. a readiness ring). */
  side?: ReactNode;
  media: HeroMediaItem[];
  variant?: "full-bleed" | "split";
  size?: "lg" | "md" | "sm";
  /** The visible title is the page's h1 unless the page already has one. */
  headingLevel?: 1 | 2;
}

function poster(item: HeroMediaItem, small: boolean) {
  if (item.type === "video") return `${item.src}${small ? "-640" : ""}.webp`;
  return `${item.src}${small ? "-800" : ""}.webp`;
}

function Picture({ item, priority, className = "" }: { item: HeroMediaItem; priority: boolean; className?: string }) {
  const desktop = poster(item, false);
  const phone = poster(item, true);
  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={phone} type="image/webp" />
      <source srcSet={desktop} type="image/webp" />
      <img
        src={item.type === "image" ? `${item.src}.jpg` : desktop}
        alt={item.alt}
        width={1600}
        height={900}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={`absolute inset-0 h-full w-full object-cover ${className}`}
      />
    </picture>
  );
}

export function MediaHero({
  back,
  eyebrow,
  title,
  subtitle,
  cta,
  secondary,
  children,
  stats,
  side,
  media,
  variant = "full-bleed",
  size = "lg",
  headingLevel = 1,
}: MediaHeroProps) {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState<number[]>([0]);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [hiddenTab, setHiddenTab] = useState(false);
  const [started, setStarted] = useState(false);
  const reduced = useReducedMotion();
  const slow = useSlowConnection();
  const small = useSmallScreen();
  const rootRef = useRef<HTMLElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const fill = useRef<HTMLSpanElement | null>(null);
  const noVideo = reduced || slow || small;
  const many = media.length > 1;
  const rotating = many && !reduced && !paused && !hovered && !offscreen && !hiddenTab;

  const go = useCallback(
    (to: number) => {
      const next = (to + media.length) % media.length;
      setIndex(next);
      setMounted((cur) => (cur.includes(next) ? cur : [...cur, next]));
    },
    [media.length]
  );

  useEffect(() => {
    const start = () => setStarted(true);
    if (document.readyState === "complete") {
      const id = window.setTimeout(start, 120);
      return () => window.clearTimeout(id);
    }
    window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => setOffscreen(!e.isIntersecting), { threshold: 0.1 });
    o.observe(el);
    const onVis = () => setHiddenTab(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      o.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // The current clip plays from its first frame; the others pause after the fade.
  useEffect(() => {
    const v = videos.current[index];
    if (v) v.currentTime = 0;
    const id = window.setTimeout(() => videos.current.forEach((x, n) => n !== index && x?.pause()), 900);
    return () => window.clearTimeout(id);
  }, [index]);

  const playClips = !noVideo && !paused && !offscreen && !hiddenTab;
  useEffect(() => {
    const v = videos.current[index];
    if (!v) return;
    if (playClips) v.play().catch(() => {});
    else v.pause();
  }, [playClips, index, mounted, started]);

  // Slide clock (100 ms ticks): a clip's own time while it plays, else elapsed time.
  useEffect(() => {
    if (!rotating || !started) return;
    let last = performance.now();
    let elapsed = 0;
    let preloaded = false;
    const id = window.setInterval(() => {
      const now = performance.now();
      elapsed += (now - last) / 1000;
      last = now;
      const item = media[index];
      const v = videos.current[index];
      let p: number;
      if (item.type === "video" && v && !noVideo && v.readyState >= 2 && !v.paused && Number.isFinite(v.duration)) {
        p = v.currentTime / Math.min(v.duration, CLIP_SECONDS);
      } else {
        p = elapsed / (item.type === "video" && !noVideo ? CLIP_SECONDS : IMAGE_SECONDS);
      }
      if (fill.current) fill.current.style.transform = `scaleX(${Math.min(Math.max(p, 0), 1)})`;
      if (p > 0.5 && !preloaded) {
        preloaded = true;
        const n = (index + 1) % media.length;
        setMounted((cur) => (cur.includes(n) ? cur : [...cur, n]));
      }
      if (p >= 0.96) {
        window.clearInterval(id);
        go(index + 1);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [rotating, started, index, media, noVideo, go]);

  // The first poster is the page's largest picture: ask for it from the <head>.
  if (media[0]) {
    preload(poster(media[0], true), { as: "image", fetchPriority: "high", media: "(max-width: 767px)" });
    preload(poster(media[0], false), { as: "image", fetchPriority: "high", media: "(min-width: 768px)" });
  }

  const Heading = headingLevel === 1 ? "h1" : "h2";
  const minH = size === "lg" ? "min-h-[55svh] sm:min-h-[70svh]" : size === "md" ? "min-h-[46svh] sm:min-h-[54svh]" : "min-h-[16rem] sm:min-h-[20rem]";

  const slides = (
    <>
      {media.map((item, n) => (
        <div key={item.src + n} aria-hidden={n !== index} data-active={n === index} className="cine-slide absolute inset-0">
          <div className="cine-slide-media absolute inset-0">
            {(n === 0 || mounted.includes(n)) && <Picture item={item} priority={n === 0} />}
            {item.type === "video" && started && !noVideo && mounted.includes(n) && (
              <video
                ref={(el) => {
                  videos.current[n] = el;
                }}
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
                tabIndex={-1}
                poster={poster(item, small)}
                className="absolute inset-0 h-full w-full object-cover"
              >
                <source src={`${item.src}-${small ? 640 : 1280}.webm`} type="video/webm" />
                <source src={`${item.src}-${small ? 640 : 1280}.mp4`} type="video/mp4" />
              </video>
            )}
          </div>
        </div>
      ))}
    </>
  );

  const controls = many && (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-1.5">
        {media.map((item, n) => (
          <button key={item.src + n} type="button" onClick={() => go(n)} aria-label={`Show picture ${n + 1} of ${media.length}`} aria-current={n === index ? "true" : undefined} className="group flex h-6 flex-1 items-center">
            <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-fg/15 transition-colors group-hover:bg-fg/25">
              {n === index && (
                <span
                  ref={(el) => {
                    fill.current = el;
                  }}
                  className="absolute inset-0 origin-left rounded-full bg-accent transition-transform duration-100 ease-linear"
                  style={{ transform: rotating ? "scaleX(0)" : "scaleX(1)" }}
                />
              )}
            </span>
          </button>
        ))}
      </div>
      {reduced ? (
        <span className="flex gap-1.5">
          <button type="button" onClick={() => go(index - 1)} aria-label="Previous picture" className="btn-secondary btn-sm h-8 w-8 px-0">
            <Icon as={ChevronLeft} />
          </button>
          <button type="button" onClick={() => go(index + 1)} aria-label="Next picture" className="btn-secondary btn-sm h-8 w-8 px-0">
            <Icon as={ChevronRight} />
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play hero media" : "Pause hero media"} className="btn-secondary btn-sm h-8 w-8 px-0">
          <Icon as={paused ? Play : Pause} />
        </button>
      )}
    </div>
  );

  const text = (
    <div className="cine-copy min-w-0 max-w-2xl">
      {back && (
        <Link href={back.href} className="btn-ghost btn-sm -ml-3 mb-3">
          <Icon as={ArrowLeft} />
          {back.label}
        </Link>
      )}
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <Heading className={`display mt-3 text-fg ${size === "sm" ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl lg:text-[3.5rem]"}`}>{title}</Heading>
      <div>
        {subtitle && <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg">{subtitle}</p>}
        {stats && stats.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="At a glance">
            {stats.map((s) => (
              <li key={s} className="rounded-full border border-line bg-surface/80 px-3 py-1 text-sm text-fg-muted backdrop-blur">
                {s}
              </li>
            ))}
          </ul>
        )}
        {children && <div className="mt-6">{children}</div>}
        {(cta || secondary) && (
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            {cta && (
              <Link href={cta.href} className="btn-primary btn-lg">
                {cta.label}
                <Icon as={ArrowRight} />
              </Link>
            )}
            {secondary && (
              <Link href={secondary.href} className="btn-secondary btn-lg">
                {secondary.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (variant === "split") {
    const stills = media.filter((m) => m.type === "image").slice(0, 2);
    return (
      <section ref={rootRef} aria-label="Page introduction" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="page-container pt-8 sm:pt-12">
        <div className={`grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 ${size === "sm" ? "" : "min-h-[22rem]"}`}>
          <div className="min-w-0">
            {text}
            {side && <div className="mt-8">{side}</div>}
          </div>
          <div className="pb-6 sm:pb-10 lg:pr-8">
            {/* The overlapping stills hang off the frame, clear of the controls below it. */}
            <div className="relative">
              <div className={`relative overflow-hidden rounded-[1.25rem] border border-line bg-surface-muted shadow-[var(--shadow-lg)] ${size === "sm" ? "aspect-[16/9]" : "aspect-[4/3]"}`}>{slides}</div>
              {stills.length > 1 && size !== "sm" && (
                <>
                  <div className="absolute -bottom-6 -left-6 hidden aspect-[4/3] w-[34%] overflow-hidden rounded-xl border-4 border-surface shadow-[var(--shadow-lg)] sm:block">
                    <Picture item={stills[0]} priority={false} />
                  </div>
                  <div className="absolute -right-2 -top-6 hidden aspect-square w-[24%] overflow-hidden rounded-xl border-4 border-surface shadow-[var(--shadow-lg)] lg:block">
                    <Picture item={stills[1]} priority={false} />
                  </div>
                </>
              )}
            </div>
            {many && <div className={`mt-4 ${stills.length > 1 && size !== "sm" ? "sm:ml-[30%] sm:mt-6" : "sm:mt-6"}`}>{controls}</div>}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={rootRef} aria-label="Page introduction" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="px-2 pt-2 sm:px-3 sm:pt-3">
      <div className={`relative flex rounded-[1.25rem] border border-line bg-surface-muted ${minH}`}>
        {/* Media is clipped on its own layer so a search box's results can grow the hero. */}
        <div className="absolute inset-0 overflow-hidden rounded-[1.25rem]">
          {slides}
          <div aria-hidden="true" className="scrim-left pointer-events-none absolute inset-0 hidden sm:block" />
          <div aria-hidden="true" className="scrim-bottom pointer-events-none absolute inset-0 sm:hidden" />
        </div>
        <div className="page-container relative z-10 flex w-full flex-col justify-end gap-8 pb-16 pt-16 sm:justify-center sm:pb-20 sm:pt-20 lg:flex-row lg:items-center lg:justify-between">
          {text}
          {side && <div className="w-full lg:w-auto lg:min-w-[17rem]">{side}</div>}
        </div>
        {many && <div className="page-container absolute inset-x-0 bottom-0 z-20 pb-4">{controls}</div>}
      </div>
    </section>
  );
}
