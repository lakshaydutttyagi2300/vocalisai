// How an email reply is marked. The AI rates five criteria from 1 to 5 and
// writes short feedback (src/lib/providers/gemini-email-review-provider.ts);
// the overall score is worked out here, so it is always consistent with the
// ratings and never invented. No imports apart from zod, so the page can
// show the same criteria.

import { z } from "zod";

export const EMAIL_CRITERIA = [
  { key: "tone", label: "Tone and empathy" },
  { key: "structure", label: "Structure" },
  { key: "grammar", label: "Grammar and spelling" },
  { key: "clarity", label: "Clarity" },
  { key: "resolution", label: "Solves the problem" },
] as const;
export type EmailCriterion = (typeof EMAIL_CRITERIA)[number]["key"];

const rating = z.number().int().min(1).max(5);

/** What the AI must return. Anything else is rejected before it is stored or shown. */
export const emailReviewAiSchema = z.object({
  ratings: z.object({ tone: rating, structure: rating, grammar: rating, clarity: rating, resolution: rating }),
  strengths: z.array(z.string().trim().min(1).max(300)).min(1).max(3),
  fixes: z.array(z.string().trim().min(1).max(300)).min(1).max(3),
  modelReply: z.string().trim().min(20).max(2500),
});
export type EmailReviewAi = z.infer<typeof emailReviewAiSchema>;

/** 0-100 from the five 1-5 ratings: all 5s is 100, all 1s is 0. */
export function emailScore(ratings: Record<EmailCriterion, number>): number {
  const total = EMAIL_CRITERIA.reduce((s, c) => s + ratings[c.key], 0);
  return Math.round(((total - EMAIL_CRITERIA.length) / (EMAIL_CRITERIA.length * 4)) * 100);
}

export function emailVerdict(score: number): string {
  if (score >= 80) return "Ready to send: this is the standard chat and email teams expect.";
  if (score >= 60) return "Good, with a few fixes: work on the points below.";
  if (score >= 40) return "Getting there: use the model reply to see what a strong answer looks like.";
  return "Start with the basics: greet, say sorry, give the solution, and close politely.";
}
