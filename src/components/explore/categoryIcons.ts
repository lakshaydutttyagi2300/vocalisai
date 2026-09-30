import { Blocks, BookOpen, BriefcaseBusiness, Building2, GraduationCap, Headset, Landmark, Laptop, MessagesSquare, Puzzle, type LucideIcon } from "lucide-react";

// One icon per catalogue category (src/lib/catalogue.ts).
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "government-competitive": Landmark,
  "university-entrance": GraduationCap,
  "campus-career": BriefcaseBusiness,
  "english-communication": MessagesSquare,
  "professional-skills": Headset,
  "technology-it": Laptop,
  "business-management": Building2,
  "reasoning-aptitude": Puzzle,
  "subject-practice": BookOpen,
  "specialised-exams": Blocks,
};
