import { useSyncExternalStore } from "react";

// Media helpers. Clips live in /public/media/cine as <name>-1280 / <name>-640
// (.webm and .mp4, seamless 6-second loops) with posters <name>.webp /
// <name>-640.webp; stills in /public/media/stills as <name>.webp,
// <name>-800.webp and <name>.jpg (docs/MEDIA_SOURCES.md).
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

function connection() {
  return (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
}

/** Reduced motion: no autoplay, no rotation. */
export function useReducedMotion() {
  return useMedia("(prefers-reduced-motion: reduce)");
}

/** Save-Data, or a 2G/3G connection: pictures only. */
export function useSlowConnection() {
  return useSyncExternalStore(
    noSubscribe,
    () => {
      const c = connection();
      return Boolean(c?.saveData) || /(^|-)(2g|3g)$/.test(c?.effectiveType ?? "");
    },
    () => false
  );
}

/** True when clips should stay still: reduced motion or a slow / Save-Data connection. */
export function useStillMedia() {
  const reduced = useReducedMotion();
  const slow = useSlowConnection();
  return reduced || slow;
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
