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
] as const;

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
  return flag?.enabled ?? true;
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
      enabled: row?.enabled ?? true,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  });
}
