// Types for seed.mjs, so the TypeScript tests can import it (allowJs is off).
import type { PrismaClient } from "@prisma/client";

export const ALLOWED_DB_HOST_PREFIXES: string[];
export function assertDevDatabase(databaseUrl: string | undefined): string;

export interface SeedResult {
  created: boolean;
  variantId: string;
  templateId: string | null;
  familyCreated?: boolean;
  questionTotal?: number;
  assetNotes?: string[];
}

export function seedExamDemo(
  db: PrismaClient,
  opts?: {
    withAssets?: boolean;
    makeDefault?: boolean;
    log?: (msg: string) => void;
    buildGroupAsset?: (group: unknown) => Promise<{ key: string | null; reason: string | null }>;
    familySlug?: string;
  }
): Promise<SeedResult>;

export function removeExamDemo(
  db: PrismaClient,
  opts?: { log?: (msg: string) => void; removeFamily?: boolean; familySlug?: string }
): Promise<{ removed: boolean; questionCount?: number; groupCount?: number; familyRemoved?: boolean }>;
