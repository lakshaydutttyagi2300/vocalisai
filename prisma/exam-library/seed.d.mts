// Types for seed.mjs so TypeScript tests can import it (allowJs is off).
import type { PrismaClient } from "@prisma/client";
import type { LibraryFamily, LibrarySection } from "./content.mjs";

export function seedExamLibrary(
  db: PrismaClient,
  options?: { dryRun?: boolean; library?: LibraryFamily[]; generalEnglish?: { name: string; sections: LibrarySection[] } }
): Promise<string[]>;
