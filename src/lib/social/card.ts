// Image cards for posts, rendered with Next's bundled renderer (no new
// dependency, no paid service). The visual style comes from the post's
// direction, so cards differ in look as well as in words.

import fs from "node:fs";
import path from "node:path";

interface Theme { bg: string; fg: string; accent: string; align: "flex-start" | "center"; size: number; weight: 400 | 600 | 700 }
export const THEMES: Record<string, Theme> = {
  "bold-typography-on-dark": { bg: "#0f172a", fg: "#ffffff", accent: "#38bdf8", align: "flex-start", size: 76, weight: 700 },
  "warm-paper-notebook": { bg: "#f6efe2", fg: "#3b2f20", accent: "#b45309", align: "flex-start", size: 64, weight: 600 },
  "split-screen-wrong-vs-right": { bg: "#111827", fg: "#ffffff", accent: "#34d399", align: "center", size: 56, weight: 600 },
  "chat-bubble-conversation": { bg: "#e0f2fe", fg: "#0c4a6e", accent: "#0284c7", align: "flex-start", size: 58, weight: 600 },
  "minimal-single-word": { bg: "#ffffff", fg: "#111111", accent: "#e11d48", align: "center", size: 120, weight: 700 },
  "checklist-card": { bg: "#ecfdf5", fg: "#064e3b", accent: "#059669", align: "flex-start", size: 54, weight: 600 },
  "sticky-note-wall": { bg: "#fde047", fg: "#422006", accent: "#a16207", align: "center", size: 62, weight: 600 },
  "gradient-spotlight": { bg: "linear-gradient(135deg,#4c1d95,#be185d)", fg: "#ffffff", accent: "#fde68a", align: "center", size: 68, weight: 700 },
};

const fontPath = (w: number) => path.join(process.cwd(), "src/lib/certificates/fonts", w >= 600 ? "Inter-600.ttf" : "Inter-400.ttf");

export interface CardInput { text: string; style: string; footer?: string; width?: number; height?: number }

export async function renderCard(input: CardInput): Promise<Buffer> {
  const { ImageResponse } = await import("next/og");
  const t = THEMES[input.style] ?? THEMES["bold-typography-on-dark"];
  const w = input.width ?? 1080, h = input.height ?? 1080;
  const text = input.text.slice(0, 160);
  const size = text.length > 90 ? Math.round(t.size * 0.7) : text.length > 50 ? Math.round(t.size * 0.85) : t.size;
  const [left, right] = input.style === "split-screen-wrong-vs-right" ? text.split("||").map((x) => x.trim()) : [text, ""];
  const div = (style: Record<string, unknown>, children: unknown) => ({ type: "div", props: { style: { display: "flex", ...style }, children } });
  const body = right
    ? div({ flexDirection: "column", width: "100%", gap: 36 }, [
        div({ color: "#f87171", fontSize: size }, "✗ " + left),
        div({ color: t.accent, fontSize: size }, "✓ " + right),
      ])
    : div({ fontSize: size, lineHeight: 1.2 }, left);
  const el = div(
    { width: w, height: h, background: t.bg, color: t.fg, padding: 90, flexDirection: "column", justifyContent: "space-between", fontFamily: "Inter" },
    [
      div({ width: 90, height: 10, background: t.accent }, ""),
      div({ alignItems: "center", justifyContent: t.align, textAlign: t.align === "center" ? "center" : "left", flex: 1 }, body),
      div({ fontSize: 30, color: t.accent }, input.footer ?? "VocalisAi"),
    ],
  );
  const res = new ImageResponse(el as never, {
    width: w, height: h,
    fonts: [{ name: "Inter", data: fs.readFileSync(fontPath(t.weight)), weight: t.weight >= 600 ? 600 : 400, style: "normal" }],
  });
  return Buffer.from(await res.arrayBuffer());
}
