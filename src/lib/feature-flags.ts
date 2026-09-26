// Central catalog of every feature the app can gate - a fixed list (same
// discipline as PRACTICE_MODES/PLANS elsewhere), not arbitrary admin-typed
// strings, so a typo can't silently create a flag nobody actually enforces.
//
// Two kinds of key:
//  - a practice category (GRAMMAR, LISTENING, ...) - blocks that category
//    everywhere it's served from, since practice AND mock tests both pull
//    questions through the same /api/practice/questions endpoint.
//  - a named subsystem (MOCK_TEST, INTERVIEW_SIMULATION, ...) - blocks one
//    specific feature's own route(s).
//
// This is enforced in the API routes themselves (isFeatureEnabled checked
// server-side before doing the gated work), not just used to hide UI.

import { db } from "@/lib/db";
import { PRACTICE_MODES } from "@/lib/practice-taxonomy";

export const SUBSYSTEM_FEATURES = [
  { key: "MOCK_TEST", label: "Mock Test", description: "Starting a new full proctored mock assessment." },
  { key: "INTERVIEW_SIMULATION", label: "Interview Simulation", description: "Starting a new AI voice conversation roleplay." },
  { key: "AI_SPEECH_ANALYSIS", label: "AI Speech Analysis", description: "Running AI analysis on a recorded voice attempt." },
  { key: "PROGRESS_DASHBOARD", label: "Progress Dashboard", description: "The candidate-facing /progress page." },
  {
    key: "exam_runner_v2",
    label: "Exam Runner v2",
    description: "New exam-taking screen for templates linked to an exam format (timed papers, autosave, review). Off by default.",
  },
  {
    key: "skills_all_categories",
    label: "All skill categories",
    description: "Show every skill category (Cognitive, Data Interpretation, Business Communication, Digital Skills), not just the v1 set. Off by default.",
  },
] as const;

// Flags that are OFF until an admin explicitly turns them on - the
// opposite of the fail-open default every other flag uses. Only new,
// not-yet-launched features belong here; every pre-existing flag keeps
// its original "missing row = enabled" behaviour exactly.
export const DEFAULT_OFF_FEATURES = new Set<string>(["exam_runner_v2", "skills_all_categories"]);

export function defaultEnabled(key: string): boolean {
  return !DEFAULT_OFF_FEATURES.has(key);
}

export const CATEGORY_FEATURES = PRACTICE_MODES.map((m) => ({
  key: m.category,
  label: m.label,
  description: `The "${m.label}" practice category - used in both solo practice and mock tests.`,
}));

export const FEATURE_CATALOG: { key: string; label: string; description: string }[] = [
  ...SUBSYSTEM_FEATURES,
  ...CATEGORY_FEATURES,
];

const FEATURE_KEYS = new Set(FEATURE_CATALOG.map((f) => f.key));

export function isValidFeatureKey(key: string): boolean {
  return FEATURE_KEYS.has(key);
}

// Missing row = enabled (fail-open). A flag only exists once an admin has
// touched it, so every feature works normally on a fresh database/branch
// until someone explicitly turns it off - this can never be the reason a
// feature looks broken by default.
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({ where: { key } });
  return flag?.enabled ?? defaultEnabled(key);
}

export interface FeatureFlagView {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  updatedAt: string | null;
}

export async function getAllFeatureFlags(): Promise<FeatureFlagView[]> {
  const rows = await db.featureFlag.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return FEATURE_CATALOG.map((f) => {
    const row = byKey.get(f.key);
    return {
      key: f.key,
      label: f.label,
      description: f.description,
      enabled: row?.enabled ?? defaultEnabled(f.key),
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  });
}
