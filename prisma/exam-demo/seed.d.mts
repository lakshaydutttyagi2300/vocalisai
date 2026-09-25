// Types for seed.mjs, so the TypeScript tests can import it (allowJs is off).
import type { PrismaClient } from "@prisma/client";
import type { PracticeTest } from "./content.mjs";

export const ALLOWED_DB_HOST_PREFIXES: string[];
export const PRODUCTION_DB_HOST_PREFIX: string;
export function assertDevDatabase(databaseUrl: string | undefined, opts?: { allowProduction?: boolean }): string;

export interface TestSeedResult {
  created: boolean;
  variantId: string;
  templateId: string | null;
  questionTotal: number;
  assetNotes: string[];
}

export interface SeedResult {
  created: boolean;
  familyCreated: boolean;
  tests: TestSeedResult[];
  questionTotal: number;
  assetNotes: string[];
}

export function seedExamDemo(
  db: PrismaClient,
  opts?: {
    withAssets?: boolean;
    makeDefault?: boolean;
    log?: (msg: string) => void;
    buildGroupAsset?: (group: unknown) => Promise<{ key: string | null; reason: string | null }>;
    familySlug?: string;
    tests?: PracticeTest[];
  }
): Promise<SeedResult>;

export function removeExamDemo(
  db: PrismaClient,
  opts?: { log?: (msg: string) => void; removeFamily?: boolean; familySlug?: string; tests?: PracticeTest[] }
): Promise<{ removed: boolean; testCount?: number; questionCount?: number; groupCount?: number; familyRemoved?: boolean }>;
