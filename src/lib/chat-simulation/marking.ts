// How a chat is played and marked. The AI customer's replies and the final
// marking are untrusted AI output, checked with these schemas before they
// are stored or shown; the overall score and the reply speed are worked out
// here in code.

import { z } from "zod";
import { TARGET_REPLY_SECONDS } from "./scenarios";

export interface ChatTurn {
  from: "customer" | "agent";
  text: string;
  /** ISO time the server stored it - reply speed is measured from these. */
  at: string;
  /** Customer turns only: the customer considers the problem solved. */
  satisfied?: boolean;
}

/** The AI customer's next message, and whether their problem is now solved. */
export const customerReplySchema = z.object({
  message: z.string().trim().min(1).max(600),
  satisfied: z.boolean(),
});

export const CHAT_CRITERIA = [
  { key: "tone", label: "Tone and empathy" },
  { key: "grammar", label: "Grammar and spelling" },
  { key: "accuracy", label: "Correct information" },
  { key: "problemSolving", label: "Problem solving" },
  { key: "closing", label: "Opening and closing" },
] as const;
export type ChatCriterion = (typeof CHAT_CRITERIA)[number]["key"];

const rating = z.number().int().min(1).max(5);
export const chatMarkingSchema = z.object({
  ratings: z.object({ tone: rating, grammar: rating, accuracy: rating, problemSolving: rating, closing: rating }),
  strengths: z.array(z.string().trim().min(1).max(300)).min(1).max(3),
  fixes: z.array(z.string().trim().min(1).max(300)).min(1).max(3),
  betterLine: z.string().trim().min(5).max(600),
});
export type ChatMarking = z.infer<typeof chatMarkingSchema>;

/** 0-100 from the five 1-5 ratings: all 5s is 100, all 1s is 0. */
export function chatScore(ratings: Record<ChatCriterion, number>): number {
  const total = CHAT_CRITERIA.reduce((s, c) => s + ratings[c.key], 0);
  return Math.round(((total - CHAT_CRITERIA.length) / (CHAT_CRITERIA.length * 4)) * 100);
}

/** Average seconds from each customer message to the agent's next reply. */
export function averageReplySeconds(turns: readonly ChatTurn[]): number | null {
  const gaps: number[] = [];
  for (let i = 1; i < turns.length; i++) {
    if (turns[i].from === "agent" && turns[i - 1].from === "customer") {
      gaps.push(Math.max(0, (Date.parse(turns[i].at) - Date.parse(turns[i - 1].at)) / 1000));
    }
  }
  return gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
}

export function chatVerdict(score: number, replySeconds: number | null): string {
  const speed = replySeconds !== null && replySeconds > TARGET_REPLY_SECONDS ? ` Try to reply within ${TARGET_REPLY_SECONDS} seconds - customers in chat expect quick answers.` : "";
  if (score >= 80) return `Chat-ready: this is the standard chat support teams expect.${speed}`;
  if (score >= 60) return `Good, with a few fixes: work on the points below.${speed}`;
  if (score >= 40) return `Getting there: see the better line below for what a strong reply looks like.${speed}`;
  return `Start with the basics: greet, say sorry, give the facts, and close politely.${speed}`;
}
