import { BookOpenCheck, Briefcase, Building2, FolderOpen, GraduationCap, Languages, Puzzle, type LucideIcon } from "lucide-react";

// Icons for the catalogue categories (prisma/catalogue/content.mjs).
// A category an admin adds later falls back to a folder.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "company-hiring-assessments": Building2,
  "aptitude-reasoning": Puzzle,
  "english-communication": Languages,
  "workplace-assessments": Briefcase,
  "career-entrance": GraduationCap,
  "professional-certification": BookOpenCheck,
};

export function categoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] ?? FolderOpen;
}
