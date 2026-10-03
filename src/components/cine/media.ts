import { useSyncExternalStore } from "react";

// Media helpers for the cinematic pages. Clips live in /public/media/cine as
// <name>-1280.mp4 / <name>-640.mp4 (seamless 6-second loops, H.264,
// faststart) with posters <name>.webp / <name>-640.webp
// (docs/MEDIA_SOURCES.md).
export const CINE = "/media/cine";

function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

const noSubscribe = () => () => {};

/** True when clips should stay still: reduced motion, Save-Data or a 2G connection. */
export function useStillMedia() {
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const lowData = useSyncExternalStore(
    noSubscribe,
    () => {
      const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
      return Boolean(c?.saveData) || /(^|-)2g$/.test(c?.effectiveType ?? "");
    },
    () => false
  );
  return reduced || lowData;
}

/** Phones get the 640px clips. */
export function useSmallScreen() {
  return useMedia("(max-width: 767px)");
}

/** Devices with a real hover (mouse or trackpad). */
export function useCanHover() {
  return useMedia("(hover: hover) and (pointer: fine)");
}

export function clipSrc(name: string, small: boolean) {
  return `${CINE}/${name}-${small ? 640 : 1280}.mp4`;
}
