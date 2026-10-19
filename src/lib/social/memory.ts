// Memory & Knowledge agent. A service rather than a task runner: every other
// agent reads and writes the shared record through these functions, so there
// is one place that decides what is "fresh", what was already covered, and
// what must never be stored.

import type { SocialStore } from "./store";
import type { Note, Post } from "./types";
import { words } from "./uniqueness";

const SECRET_PATTERNS = [/\bsk-[A-Za-z0-9_-]{16,}/, /\bAIza[0-9A-Za-z_-]{20,}/, /\bBearer\s+[A-Za-z0-9._-]{20,}/i, /\b\d{8,10}:[A-Za-z0-9_-]{30,}\b/, /postgres(ql)?:\/\/\S+/i];

/** Removes anything that looks like a credential before text is stored or shown. */
export function redact(text: string): string {
  return SECRET_PATTERNS.reduce((t, re) => t.replace(new RegExp(re, re.flags.includes("g") ? re.flags : re.flags + "g"), "[redacted]"), text);
}

export const RESEARCH_FRESH_DAYS = 10;

export async function freshResearch(store: SocialStore, now: Date, limit = 20): Promise<Note[]> {
  const cutoff = now.getTime() - RESEARCH_FRESH_DAYS * 864e5;
  return (await store.listNotes("RESEARCH", 80)).filter((n) => n.createdAt.getTime() >= cutoff && (!n.expiresAt || n.expiresAt > now)).slice(0, limit);
}

/** Topics/hooks already used, so the strategist and writer avoid repeating them. */
export async function history(store: SocialStore, limit = 60) {
  const posts = await store.listPosts({ statuses: ["DRAFT", "NEEDS_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHING", "PUBLISHED"], limit });
  return {
    posts,
    topics: posts.map((p) => p.topic),
    hooks: posts.map((p) => p.hookText).filter(Boolean),
    past: posts.filter((p) => p.hookText).map((p) => ({ id: p.id, hook: p.hookText, body: String(p.content.body ?? ""), topic: p.topic })),
  };
}

export function alreadyCovered(topic: string, topics: string[]): boolean {
  const t = new Set(words(topic));
  return topics.some((x) => {
    const w = words(x);
    const shared = w.filter((y) => t.has(y)).length;
    return w.length > 0 && shared / Math.max(w.length, t.size) >= 0.7;
  });
}

export const recordPostSummary = (p: Post) => `${p.platform}/${p.format}: ${p.hookText}`;
