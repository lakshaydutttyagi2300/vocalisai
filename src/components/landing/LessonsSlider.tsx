"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

export interface Lesson {
  topic: string;
  title: string;
  body: string;
  // Optional short product clip (our own screen recordings; docs/MEDIA_SOURCES.md).
  video?: { src: string; poster: string; label: string };
}

// A touch-friendly rail (CSS scroll-snap) with previous/next buttons and
// arrow-key support. Videos never autoplay: they load and play only when
// the viewer presses play.
export default function LessonsSlider({ lessons }: { lessons: Lesson[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function go(to: number) {
    const rail = railRef.current;
    if (!rail) return;
    const clamped = Math.max(0, Math.min(lessons.length - 1, to));
    const slide = rail.children[clamped] as HTMLElement | undefined;
    if (slide) rail.scrollTo({ left: slide.offsetLeft - rail.offsetLeft, behavior: "smooth" });
    setIndex(clamped);
  }

  function onScroll() {
    const rail = railRef.current;
    if (!rail) return;
    const slides = Array.from(rail.children) as HTMLElement[];
    const nearest = slides.reduce(
      (best, s, i) => {
        const d = Math.abs(s.offsetLeft - rail.offsetLeft - rail.scrollLeft);
        return d < best.d ? { i, d } : best;
      },
      { i: 0, d: Infinity }
    );
    setIndex(nearest.i);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    }
  }

  return (
    <div role="region" aria-roledescription="carousel" aria-label="English micro-lessons">
      <div className="flex items-center justify-between gap-4">
        <p className="num text-sm text-slate-400" aria-live="polite">
          {String(index + 1).padStart(2, "0")} <span className="text-slate-600">/ {String(lessons.length).padStart(2, "0")}</span>
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn-dark btn-sm" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous lesson">
            <Icon as={ChevronLeft} />
          </button>
          <button type="button" className="btn-dark btn-sm" onClick={() => go(index + 1)} disabled={index === lessons.length - 1} aria-label="Next lesson">
            <Icon as={ChevronRight} />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        tabIndex={0}
        className="rail mt-6 [grid-auto-columns:minmax(17rem,1fr)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 sm:[grid-auto-columns:minmax(20rem,24rem)]"
      >
        {lessons.map((lesson, i) => (
          <article
            key={lesson.title}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${lessons.length}: ${lesson.title}`}
            className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
          >
            {lesson.video && <LessonVideo video={lesson.video} />}
            <div className="flex flex-1 flex-col p-6">
              <p className="eyebrow eyebrow-on-ink">{lesson.topic}</p>
              <h3 className="headline mt-3 text-xl text-white">{lesson.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{lesson.body}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function LessonVideo({ video }: { video: NonNullable<Lesson["video"]> }) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure>
      <div className="relative aspect-video bg-ink-900">
        {playing ? (
          <video src={video.src} poster={video.poster} controls autoPlay muted playsInline preload="none" className="h-full w-full object-cover">
            {video.label}
          </video>
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 h-full w-full" aria-label={`Play video: ${video.label}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a static poster from /public; next/image adds nothing for a click-to-load placeholder */}
            <img src={video.poster} alt="" loading="lazy" className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-ink-950 shadow-lg transition-transform group-hover:scale-105">
                <Icon as={Play} />
              </span>
            </span>
          </button>
        )}
      </div>
      <figcaption className="px-6 pt-3 text-xs text-slate-400">{video.label}</figcaption>
    </figure>
  );
}
