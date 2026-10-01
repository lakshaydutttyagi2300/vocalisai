// Types for content.mjs so TypeScript tests can import it.

export interface CatalogueSubjectSeed {
  slug: string;
  name: string;
  legacy?: string;
  skills: string[];
}

export interface CatalogueSectionSeed {
  name: string | null;
  subjects: string[];
}

export interface CatalogueExamSeed {
  slug: string;
  name: string;
  group?: string;
  description?: string;
  keywords?: string;
  popular?: boolean;
  minutes?: number;
  per?: number;
  sections: CatalogueSectionSeed[];
}

export interface CatalogueCategorySeed {
  slug: string;
  name: string;
  description: string;
  exams: CatalogueExamSeed[];
}

export const SUBJECTS: CatalogueSubjectSeed[];
export const CATEGORIES: CatalogueCategorySeed[];
export const RETIRED: { categories: string[]; subjects: string[] };
export function slugify(name: string): string;
export function examLinks(exam: CatalogueExamSeed): { subject: string; sectionName: string | null; sortOrder: number }[];
export function mockMinutes(exam: CatalogueExamSeed): number;
