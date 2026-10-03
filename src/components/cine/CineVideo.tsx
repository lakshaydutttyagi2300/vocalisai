"use client";

import { useEffect, useRef, useState } from "react";
import { CINE, clipSrc, useCanHover, useSmallScreen, useStillMedia } from "./media";

// A silent, seamlessly looping clip that fills its (positioned) parent.
// The poster shows first; the clip loads only when it comes near the screen,
// plays only while visible (or while hovered, for mode="hover" on devices
// with a mouse), pauses otherwise, and never loads for reduced motion or
// Save-Data. `priority` is for the one clip at the top of a page.
export function CineVideo({
  name,
  alt,
  priority = false,
  mode = "view",
  className = "",
}: {
  name: string;
  alt: string;
  priority?: boolean;
  mode?: "view" | "hover";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(priority);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [ready, setReady] = useState(false);
  const still = useStillMedia();
  const small = useSmallScreen();
  const canHover = useCanHover();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nearBy = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "300px 0px" });
    const onScreen = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    nearBy.observe(el);
    onScreen.observe(el);
    return () => {
      nearBy.disconnect();
      onScreen.disconnect();
    };
  }, []);

  const wantsPlay = mode === "hover" && canHover ? hovered : visible;
  const play = !still && near && wantsPlay;

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (play) v.play().catch(() => {});
    else v.pause();
  }, [play]);

  return (
    <div
      ref={ref}
      className={`absolute inset-0 ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <picture>
        <source media="(max-width: 767px)" srcSet={`${CINE}/${name}-640.webp`} />
        <img
          src={`${CINE}/${name}.webp`}
          alt={alt}
          width={1280}
          height={720}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      {!still && near && (
        <video
          ref={video}
          key={small ? "s" : "l"}
          src={clipSrc(name, small)}
          muted
          playsInline
          loop
          preload={priority ? "auto" : "metadata"}
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setReady(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
