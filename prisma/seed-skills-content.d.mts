// Types for seed-skills-content.mjs so TypeScript tests can import it (allowJs is off).
import type { PrismaClient } from "@prisma/client";

export const STARTER_SOURCE: string;
export const CATEGORY_FOR_SKILL: Record<string, string>;
export function difficultyForLevel(level: number): string;

export interface StarterQuestionRow {
  category: string;
  difficulty: string;
  type: string;
  prompt: string;
  passage: string | null;
  options: string | null;
  correctAnswer: string | null;
  expectedAnswer: string | null;
  explanation: string | null;
  scoringCriteria: string | null;
  timeLimitSeconds: number;
  source: string;
  skillId: string;
  skillPrecision: string;
  skillSource: string;
  level: number;
  format: string;
  distractorReasons: string | null;
  hint: string | null;
  bankStatus: string;
}

export function starterQuestions(): StarterQuestionRow[];
export function bankKey(q: { prompt: string; passage?: string | null }): string;

export function seedStarterContent(
  db: PrismaClient,
  opts?: { dryRun?: boolean; log?: (m: string) => void }
): Promise<{ total: number; created: number; updated: number; retired: number; skipped: number }>;
