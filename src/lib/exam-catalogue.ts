// Single source of truth for the exam-catalogue's plain-string fields
// (ExamFamily.slug, ExamPaper.navigationMode), the same
// validated-in-TS-not-in-the-DB discipline as practice-taxonomy.ts. Every
// model here is additive and currently unreferenced by any existing flow -
// MockTestTemplate.examVariantId / MockTestTemplateSection.examPartId are
// both nullable, so nothing in the app behaves differently until an admin
// deliberately attaches a template to a real ExamVariant (P1-G).

export const EXAM_FAMILY_SLUGS = [
  "IELTS_STYLE",
  "SELT_STYLE",
  "PTE_STYLE",
  "CAMBRIDGE_STYLE",
  "APTITUDE",
  "EMPLOYMENT",
  "GENERAL_ENGLISH",
] as const;

export type ExamFamilySlug = (typeof EXAM_FAMILY_SLUGS)[number];

export function isValidExamFamilySlug(value: string): value is ExamFamilySlug {
  return (EXAM_FAMILY_SLUGS as readonly string[]).includes(value);
}

// Seed data for P1-G's admin CRUD and P1-H's demo seed - deliberately
// styled as "-style"/generic names, never the real trademarked exam name,
// per the "no implied official affiliation" requirement. Real trademark
// names only ever appear in TrademarkDisclaimer.tsx's disclaimer text.
export const EXAM_FAMILY_SEED: { slug: ExamFamilySlug; name: string; description: string }[] = [
  { slug: "IELTS_STYLE", name: "IELTS-style", description: "Academic and General Training style four-skill English proficiency testing." },
  { slug: "SELT_STYLE", name: "UK SELT-style", description: "UK Secure English Language Test style assessments, including Life Skills levels." },
  { slug: "PTE_STYLE", name: "PTE-style", description: "Computer-delivered, integrated-skills English proficiency testing." },
  { slug: "CAMBRIDGE_STYLE", name: "Cambridge-style", description: "Cambridge English qualification style assessments." },
  { slug: "APTITUDE", name: "Aptitude", description: "General aptitude, reasoning and situational-judgement assessments." },
  { slug: "EMPLOYMENT", name: "Employment & Recruitment", description: "Recruitment, pre-employment and role-specific assessments, including BPO/MNC interviews." },
  { slug: "GENERAL_ENGLISH", name: "General English", description: "General English proficiency, placement and workplace-communication assessments." },
];

export const NAVIGATION_MODES = ["LOCKED_SEQUENTIAL", "FREE_WITHIN_SECTION"] as const;
export type NavigationMode = (typeof NAVIGATION_MODES)[number];

export function isValidNavigationMode(value: string): value is NavigationMode {
  return (NAVIGATION_MODES as readonly string[]).includes(value);
}

export interface ExamFamilyFields {
  slug: string;
  name: string;
}

export function validateExamFamilyFields(f: ExamFamilyFields): string | null {
  if (!isValidExamFamilySlug(f.slug)) return `Invalid exam family slug "${f.slug}".`;
  if (!f.name || f.name.trim().length < 2) return "name is required.";
  return null;
}

export interface ExamVariantFields {
  slug: string;
  name: string;
  scoreScale: string;
}

// scoreScale is checked against SCORE_SCALE_KEYS once P1-F exists (that
// file will re-export this validator with the real check added); kept
// separate here so P1-A has no dependency on P1-F's not-yet-written code.
export function validateExamVariantFields(f: ExamVariantFields): string | null {
  if (!f.slug || !/^[A-Z0-9_]+$/.test(f.slug)) return `Invalid variant slug "${f.slug}" - use A-Z, 0-9, underscore.`;
  if (!f.name || f.name.trim().length < 2) return "name is required.";
  if (!f.scoreScale || f.scoreScale.trim().length === 0) return "scoreScale is required.";
  return null;
}

export interface ExamPaperFields {
  name: string;
  durationSeconds: number;
  navigationMode: string;
}

export function validateExamPaperFields(f: ExamPaperFields): string | null {
  if (!f.name || f.name.trim().length < 2) return "name is required.";
  if (!Number.isFinite(f.durationSeconds) || f.durationSeconds < 30 || f.durationSeconds > 4 * 60 * 60) {
    return "durationSeconds must be between 30 and 14400 (4 hours).";
  }
  if (!isValidNavigationMode(f.navigationMode)) return `Invalid navigationMode "${f.navigationMode}".`;
  return null;
}

export interface ExamPartFields {
  name: string;
  prepSeconds?: number | null;
  responseSeconds?: number | null;
}

export function validateExamPartFields(f: ExamPartFields): string | null {
  if (!f.name || f.name.trim().length < 2) return "name is required.";
  if (f.prepSeconds != null && (!Number.isFinite(f.prepSeconds) || f.prepSeconds < 0)) return "prepSeconds must be a non-negative number.";
  if (f.responseSeconds != null && (!Number.isFinite(f.responseSeconds) || f.responseSeconds < 0)) {
    return "responseSeconds must be a non-negative number.";
  }
  return null;
}
