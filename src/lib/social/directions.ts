// Creative direction is picked by code so variety is guaranteed and auditable:
// each dimension takes the least-recently-used option (never one of the last
// three), nudged by what the growth agent has found to work, with a random
// tiebreak. The model then writes *inside* this direction.

import type { Direction } from "./types";

export const HOOK_TYPES = [
  "surprising-number", "mistake-callout", "question-to-viewer", "mini-story-opening", "myth-bust",
  "before-after", "challenge", "confession", "contrarian-take", "overheard-line", "tiny-quiz", "if-you-only-remember-one",
];
export const NARRATIVES = [
  "problem-solution", "day-in-the-life", "interview-gone-wrong-then-fixed", "two-voices-debate", "myth-vs-reality",
  "step-by-step-teardown", "listener-question-answered", "before-and-after-rewrite", "ai-coach-explains-to-beginner", "rapid-fire-list",
];
export const CAST = [
  ["Vocalis (calm AI coach)", "Riya (nervous fresher)"],
  ["Vocalis (calm AI coach)", "Arjun (blunt hiring manager)"],
  ["Meera (sceptical senior)", "Echo (cheerful AI debater)"],
  ["Riya (nervous fresher)", "Arjun (blunt hiring manager)"],
  ["Echo (cheerful AI debater)", "Karan (over-confident candidate)"],
  ["Vocalis (calm AI coach)"], // solo explainer
];
export const VISUAL_STYLES = [
  "bold-typography-on-dark", "warm-paper-notebook", "split-screen-wrong-vs-right", "chat-bubble-conversation",
  "minimal-single-word", "checklist-card", "sticky-note-wall", "gradient-spotlight",
];
export const CTAS = [
  "save-this-for-later", "try-this-aloud-tonight", "comment-your-answer", "send-to-a-friend-with-an-interview",
  "follow-for-tomorrows-phrase", "practice-free-at-vocalisai", "reply-with-your-toughest-question",
];
export const PILLARS = ["speaking-fluency", "interview-answers", "workplace-english", "pronunciation", "confidence", "email-and-writing"];
export const VOICE_STYLES = ["warm-and-slow", "quick-and-punchy", "dry-humour", "encouraging-teacher", "no-nonsense-coach"];

type Dim = "hookType" | "narrative" | "visualStyle" | "cta" | "pillar" | "voiceStyle";
const OPTIONS: Record<Dim, string[]> = {
  hookType: HOOK_TYPES, narrative: NARRATIVES, visualStyle: VISUAL_STYLES, cta: CTAS, pillar: PILLARS, voiceStyle: VOICE_STYLES,
};
const NEVER_REPEAT_WITHIN = 3;

export type Weights = Partial<Record<Dim, Record<string, number>>>; // 1 = neutral, >1 = proven better

function pick(options: string[], recent: string[], weights: Record<string, number> | undefined, rng: () => number): string {
  const lastFew = new Set(recent.slice(0, NEVER_REPEAT_WITHIN));
  const pool = options.filter((o) => !lastFew.has(o));
  const candidates = pool.length ? pool : options;
  const use = (o: string) => recent.indexOf(o) === -1 ? Infinity : recent.indexOf(o); // larger = longer ago
  const scored = candidates.map((o) => ({
    o,
    score: (Math.min(use(o), 40) / 40) * (weights?.[o] ?? 1) + rng() * 0.15,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].o;
}

/** `recent` = directions of recent posts, newest first. */
export function chooseDirection(recent: Partial<Direction>[], weights: Weights = {}, rng: () => number = Math.random): Direction {
  const dir = {} as Direction;
  for (const dim of Object.keys(OPTIONS) as Dim[]) {
    dir[dim] = pick(OPTIONS[dim], recent.map((r) => r[dim]).filter((x): x is string => !!x), weights[dim], rng);
  }
  const recentCast = recent.map((r) => (r.characters ?? []).join("|"));
  const castKeys = CAST.map((c) => c.join("|"));
  const castKey = pick(castKeys, recentCast, undefined, rng);
  dir.characters = castKey.split("|");
  return dir;
}

export const directionKey = (d: Partial<Direction>) => [d.hookType, d.narrative, d.visualStyle].join("/");
