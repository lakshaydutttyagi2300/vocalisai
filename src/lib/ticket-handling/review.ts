// How a handled ticket is marked. One AI call rates five criteria from 1 to
// 5, gives its own view of the right category and priority, and writes
// short feedback (src/lib/providers/gemini-ticket-provider.ts). The overall
// score is worked out here, so it always matches the ratings.

import { z } from "zod";
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from "./tickets";

export const TICKET_CRITERIA = [
  { key: "category", label: "Right category" },
  { key: "priority", label: "Right priority" },
  { key: "reply", label: "Reply to the customer" },
  { key: "note", label: "Internal note" },
  { key: "accuracy", label: "Facts and safety" },
] as const;
export type TicketCriterion = (typeof TICKET_CRITERIA)[number]["key"];

const rating = z.number().int().min(1).max(5);

/** What the AI must return. Anything else is rejected before it is stored or shown. */
export const ticketReviewAiSchema = z.object({
  ratings: z.object({ category: rating, priority: rating, reply: rating, note: rating, accuracy: rating }),
  bestCategory: z.enum(TICKET_CATEGORIES),
  bestPriority: z.enum(TICKET_PRIORITIES),
  priorityReason: z.string().trim().min(1).max(300),
  strengths: z.array(z.string().trim().min(1).max(300)).min(1).max(3),
  fixes: z.array(z.string().trim().min(1).max(300)).min(1).max(3),
  modelNote: z.string().trim().min(5).max(600),
});
export type TicketReviewAi = z.infer<typeof ticketReviewAiSchema>;

/** 0-100 from the five 1-5 ratings: all 5s is 100, all 1s is 0. */
export function ticketScore(ratings: Record<TicketCriterion, number>): number {
  const total = TICKET_CRITERIA.reduce((s, c) => s + ratings[c.key], 0);
  return Math.round(((total - TICKET_CRITERIA.length) / (TICKET_CRITERIA.length * 4)) * 100);
}

export function ticketVerdict(score: number): string {
  if (score >= 80) return "Queue-ready: this is how ticketing teams expect a ticket to be handled.";
  if (score >= 60) return "Good, with a few fixes: work on the points below.";
  if (score >= 40) return "Getting there: compare your note and priority with the suggestions below.";
  return "Start with the basics: read the ticket twice, decide how urgent it is, then reply and note what you did.";
}
