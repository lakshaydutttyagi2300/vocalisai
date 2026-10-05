import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { LIBRARY, PLACEMENTS, sceneSrc, type SceneName } from "@/config/mediaLibrary";

// The media library's promise: every photo and clip has exactly one home on
// the site, its files exist, and no page sneaks in a picture of its own.

const ROOT = join(__dirname, "..", "..");
const scenes = Object.keys(LIBRARY) as SceneName[];
const placements = Object.entries(PLACEMENTS) as [string, readonly SceneName[]][];

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? filesUnder(p) : [p];
  });
}

describe("media library", () => {
  it("places every scene exactly once", () => {
    const uses = new Map<string, string[]>();
    for (const [key, list] of placements) for (const name of list) uses.set(name, [...(uses.get(name) ?? []), key]);
    const twice = [...uses].filter(([, keys]) => keys.length > 1);
    expect(twice, "scenes used in more than one placement").toEqual([]);
    expect(scenes.filter((s) => !uses.has(s)), "scenes in the library but never placed").toEqual([]);
  });

  it("never repeats a scene inside one placement", () => {
    for (const [key, list] of placements) expect(new Set(list).size, key).toBe(list.length);
  });

  it("has every file a scene needs", () => {
    const missing: string[] = [];
    for (const name of scenes) {
      const base = join(ROOT, "public", sceneSrc(name));
      const files = LIBRARY[name].kind === "clip" ? ["-1280.mp4", "-640.mp4", "-1280.webm", "-640.webm", ".webp", "-640.webp"] : [".webp", "-800.webp", ".jpg"];
      for (const suffix of files) if (!existsSync(base + suffix)) missing.push(sceneSrc(name) + suffix);
    }
    expect(missing).toEqual([]);
  });

  it("keeps no media file that isn't in the library", () => {
    const strays = ["cine", "stills"].flatMap((dir) =>
      filesUnder(join(ROOT, "public", "media", dir))
        .map((f) => relative(join(ROOT, "public"), f).replace(/\\/g, "/"))
        .filter((f) => !scenes.some((s) => f.startsWith(sceneSrc(s).slice(1) + "-") || f.startsWith(sceneSrc(s).slice(1) + ".")))
    );
    expect(strays).toEqual([]);
  });

  it("is the only place pages get their pictures from", () => {
    const literal = new RegExp(`(name|clip)(=|: ?)["'](${scenes.map((s) => s.replace(/-/g, "\\-")).join("|")})["']|/media/(cine|stills)/[a-z]`);
    const offenders = filesUnder(join(ROOT, "src"))
      .filter((f) => /\.(tsx?|mjs)$/.test(f) && !f.endsWith("mediaLibrary.ts") && !f.endsWith(join("cine", "media.ts")))
      .filter((f) => literal.test(readFileSync(f, "utf8")))
      .map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
