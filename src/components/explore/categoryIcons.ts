import { BookOpenCheck, BriefcaseBusiness, Building2, FolderOpen, GraduationCap, Landmark, Languages, Puzzle, School, ScrollText, Shield, TrainFront, Award, type LucideIcon } from "lucide-react";

// Icons for the seeded catalogue categories (prisma/catalogue/content.mjs).
// A category an admin adds later falls back to a folder.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "government-competitive": Landmark,
  banking: Building2,
  ssc: ScrollText,
  railway: TrainFront,
  "upsc-civil-services": Award,
  "state-government": FolderOpen,
  "police-defence": Shield,
  teaching: School,
  "university-entrance": GraduationCap,
  "campus-placement": BriefcaseBusiness,
  "aptitude-reasoning": Puzzle,
  "english-communication": Languages,
  "professional-certification": BookOpenCheck,
};

export function categoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] ?? FolderOpen;
}
