// How a picture description is marked. The AI rates five criteria from 1 to
// 5 and writes short feedback (src/lib/providers/gemini-picture-review-provider.ts);
// the overall score is worked out here, so it always matches the ratings.
// There is no single right answer: any reasonable reading of the photo is
// accepted. No imports apart from zod, so the page can show the criteria.

import { z } from "zod";

export const PICTURE_CRITERIA = [
  { key: "clarity", label: "Clarity of expression" },
  { key: "grammar", label: "Grammar and sentence structure" },
  { key: "interpretation", label: "Logical interpretation" },
  { key: "detail", label: "Attention to visual details" },
  { key: "professionalism", label: "Professionalism and coherence" },
] as const;
export type PictureCriterion = (typeof PICTURE_CRITERIA)[number]["key"];

const rating = z.number().int().min(1).max(5);

/** What the AI must return. Anything else is rejected before it is stored or shown. */
export const pictureReviewAiSchema = z.object({
  ratings: z.object({ clarity: rating, grammar: rating, interpretation: rating, detail: rating, professionalism: rating }),
  strengths: z.array(z.string().trim().min(1).max(300)).min(1).max(3),
  fixes: z.array(z.string().trim().min(1).max(300)).min(1).max(3),
  missedDetails: z.array(z.string().trim().min(1).max(120)).max(4),
  modelAnswer: z.string().trim().min(20).max(1500),
});
export type PictureReviewAi = z.infer<typeof pictureReviewAiSchema>;

/** 0-100 from the five 1-5 ratings: all 5s is 100, all 1s is 0. */
export function pictureScore(ratings: Record<PictureCriterion, number>): number {
  const total = PICTURE_CRITERIA.reduce((s, c) => s + ratings[c.key], 0);
  return Math.round(((total - PICTURE_CRITERIA.length) / (PICTURE_CRITERIA.length * 4)) * 100);
}

export function pictureVerdict(score: number): string {
  if (score >= 80) return "Excellent: clear, accurate and well organised - the standard assessors look for.";
  if (score >= 60) return "Good, with a few fixes: work on the points below.";
  if (score >= 40) return "Getting there: compare your answer with the model description.";
  return "Start with the basics: who is there, what they are doing, why, and what happens next.";
}
