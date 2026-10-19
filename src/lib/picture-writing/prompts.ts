// Picture writing prompts: one real workplace photo each, never repeated.
// Safe for the browser: the photo, its alt text and labels only. What the AI
// marks against (the scene and its details) lives in scenes.ts, server-side.
//
// To add a prompt: put <key>.webp (1200 px wide) and <key>-640.webp in
// public/media/picture-test/, add an entry here and in scenes.ts, and credit
// the photo in docs/MEDIA_SOURCES.md. tests/unit/picture-writing.test.ts
// checks every prompt has its files, its scene and a unique photo.

import type { Difficulty } from "@/lib/practice-taxonomy";

export type PictureCategory = "Customer service" | "Teamwork" | "Meetings" | "Problem solving" | "Helping others" | "Healthcare" | "Logistics" | "Safety and site work";

export interface PicturePrompt {
  key: string;
  /** Short accessible description of the photo (does not interpret it). */
  alt: string;
  category: PictureCategory;
  difficulty: Difficulty;
  /** Pexels photo id, for the credit. */
  pexels: string;
}

export const PICTURE_PROMPTS: readonly PicturePrompt[] = [
  { key: "cafe-payment", alt: "A café counter with a staff member in an apron and a customer", category: "Customer service", difficulty: "BEGINNER", pexels: "3907119" },
  { key: "cafe-menu", alt: "A customer holding a menu at a café counter, talking to a staff member", category: "Customer service", difficulty: "INTERMEDIATE", pexels: "4921155" },
  { key: "shop-receipt", alt: "A shopkeeper in an apron and a customer at a shop till", category: "Customer service", difficulty: "BEGINNER", pexels: "8422734" },
  { key: "bakery-counter", alt: "A customer and a staff member at a bright café counter", category: "Customer service", difficulty: "INTERMEDIATE", pexels: "6281429" },
  { key: "flipchart-meeting", alt: "A woman at a flipchart and colleagues around a table", category: "Meetings", difficulty: "BEGINNER", pexels: "5324980" },
  { key: "glass-board", alt: "People behind a glass wall covered in sticky notes", category: "Teamwork", difficulty: "ADVANCED", pexels: "9301825" },
  { key: "warehouse-check", alt: "A woman with a tablet among stacked cardboard boxes", category: "Logistics", difficulty: "INTERMEDIATE", pexels: "6169659" },
  { key: "van-delivery", alt: "Two people with boxes at the back of a delivery van", category: "Logistics", difficulty: "BEGINNER", pexels: "5025667" },
  { key: "clinic-reception", alt: "Three people at a clinic reception desk", category: "Healthcare", difficulty: "INTERMEDIATE", pexels: "7108317" },
  { key: "screen-surprise", alt: "A man at a computer in an open-plan office, with a colleague nearby", category: "Problem solving", difficulty: "ADVANCED", pexels: "3755700" },
  { key: "site-plans", alt: "Two workers in hard hats looking at papers on a building site", category: "Safety and site work", difficulty: "INTERMEDIATE", pexels: "1216589" },
  { key: "site-team", alt: "A group in hard hats and high-visibility vests around a table with plans", category: "Safety and site work", difficulty: "ADVANCED", pexels: "37198881" },
  { key: "repair-workshop", alt: "A man working on a machine in a workshop full of equipment", category: "Problem solving", difficulty: "ADVANCED", pexels: "33388380" },
  { key: "doctor-nurse", alt: "A doctor holding a folder and a nurse talking in a corridor", category: "Healthcare", difficulty: "INTERMEDIATE", pexels: "6129589" },
  { key: "boardroom", alt: "Three people in suits at a conference table with a laptop", category: "Meetings", difficulty: "ADVANCED", pexels: "8133996" },
  { key: "desk-help", alt: "Colleagues looking at a computer screen together in an office", category: "Helping others", difficulty: "BEGINNER", pexels: "5621960" },
  { key: "loft-meeting", alt: "An older man standing at a table with seated colleagues and laptops", category: "Meetings", difficulty: "INTERMEDIATE", pexels: "3860648" },
  { key: "clinic-chat", alt: "Two women standing and talking in a bright waiting area", category: "Helping others", difficulty: "BEGINNER", pexels: "4266948" },
];

export const PICTURE_SECONDS = 120;
export const MIN_PICTURE_WORDS = 20;
export const MAX_PICTURE_WORDS = 400;
export const PICTURE_INSTRUCTION =
  "Study the image carefully and describe what is happening. Explain the situation, the people involved, their possible objectives, and what you think might happen next.";

export function getPicturePrompt(key: string): PicturePrompt | undefined {
  return PICTURE_PROMPTS.find((p) => p.key === key);
}

export function pictureSrc(key: string, small = false): string {
  return `/media/picture-test/${key}${small ? "-640" : ""}.webp`;
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
