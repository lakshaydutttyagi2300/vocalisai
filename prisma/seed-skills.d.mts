// Types for seed-skills.mjs so TypeScript tests can import it (allowJs is off).
import type { PrismaClient } from "@prisma/client";

export const RUBRICS: { key: string; name: string; method: string; dimensions: { key: string; label: string; weight: number }[] }[];
export const GOAL_TRACKS: { slug: string; name: string; description: string; enabled: boolean; weights: Record<string, number> }[];
export const EXISTING_EXAM_BLUEPRINTS: { slug: string; name: string; track: string; template: string }[];
export const DIAGNOSTIC_CATEGORIES: string[];

export function seedSkills(
  db: PrismaClient,
  opts?: { dryRun?: boolean; log?: (m: string) => void }
): Promise<{ skills: number; mapped: number; leveled: number; unmapped: string[]; attempts: number; legacyCategories: number }>;
