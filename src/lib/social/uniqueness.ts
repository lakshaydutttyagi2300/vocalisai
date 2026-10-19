// Deterministic duplicate detection: the writer is told to be original, but
// this is what actually stops near-copies from being published.

import { createHash } from "node:crypto";

const STOP = new Set(["the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "is", "are", "it", "you", "your", "i", "that", "this", "with", "as", "at", "be"]);

export const words = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);

function shingles(s: string, n = 3): Set<string> {
  const w = words(s).filter((x) => !STOP.has(x));
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  if (!out.size) for (const x of w) out.add(x);
  return out;
}
export function jaccard(a: string, b: string, n = 3): number {
  const A = shingles(a, n), B = shingles(b, n);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}
export const fingerprint = (hook: string, body: string) =>
  createHash("sha256").update(words(hook + " " + body.split(/[.!?]/)[0]).join(" ")).digest("hex").slice(0, 24);

export interface PastPost { id: string; hook: string; body: string; topic: string }

/** Returns the reason a candidate is too similar to past content, or null if it is distinct enough. */
export function findDuplicate(c: { hook: string; body: string; topic: string }, past: PastPost[]): string | null {
  for (const p of past) {
    if (words(c.hook).slice(0, 4).join(" ") === words(p.hook).slice(0, 4).join(" ") && words(c.hook).length >= 4)
      return `Opens the same way as an earlier post ("${p.hook.slice(0, 50)}")`;
    if (jaccard(c.hook, p.hook, 2) >= 0.6) return `Hook is too close to an earlier post ("${p.hook.slice(0, 50)}")`;
    if (jaccard(c.body, p.body) >= 0.3) return `Body repeats an earlier post (${Math.round(jaccard(c.body, p.body) * 100)}% overlap)`;
  }
  const t = words(c.topic).join(" ");
  if (t && past.some((p) => words(p.topic).join(" ") === t)) return "Same topic as an earlier post";
  return null;
}
