// Types for content.mjs and ../seed-catalogue.mjs so TypeScript tests can import them.

export interface CatalogueSubjectSeed {
  slug: string;
  name: string;
  legacy?: string;
  skills: string[];
}

export type CatalogueExamSeed = [slug: string, name: string, subjects: string[], opts?: { popular?: boolean; keywords?: string; minutes?: number; per?: number }];

export interface CatalogueCategorySeed {
  slug: string;
  name: string;
  description: string;
  exams: CatalogueExamSeed[];
}

export const SUBJECTS: CatalogueSubjectSeed[];
export const CATEGORIES: CatalogueCategorySeed[];
export function slugify(name: string): string;
