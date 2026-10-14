import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndRecordUsage, refundUsage, upgradeMessage } from "@/lib/entitlements";
import { countWords, getTicket, NOTE_WORDS, REPLY_WORDS, TICKET_CATEGORIES, TICKET_PRIORITIES } from "@/lib/ticket-handling/tickets";
import { ticketScore, ticketVerdict, type TicketReviewAi } from "@/lib/ticket-handling/review";
import type { DeskTicket } from "@/lib/ticket-handling/desk";
import { createGeminiTicketProvider } from "@/lib/providers/gemini-ticket-provider";
import { estimateAnalysisCostUsd, GEMINI_FLASH_LITE_3_1, GEMINI_FLASH_LITE_3_5 } from "@/lib/providers/pricing";

const bodySchema = z.object({
  ticketKey: z.string().min(1).max(60),
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
  reply: z.string().max(4000),
  note: z.string().max(2000),
  /** Set when the ticket comes from the candidate's support-desk shift: it is then resolved there. */
  shiftId: z.string().min(1).max(60).optional(),
});

/** Marks the ticket resolved in the candidate's own open shift (if it is in one). Never fails the review. */
async function resolveInShift(shiftId: string, userId: string, ticketKey: string, review: { id: string; score: number }) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const shift = await db.deskShift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.userId !== userId || shift.endedAt) return;
    const tickets = JSON.parse(shift.ticketsJson) as DeskTicket[];
    const t = tickets.find((x) => x.key === ticketKey && x.status !== "resolved");
    if (!t) return;
    Object.assign(t, { status: "resolved", reviewId: review.id, score: review.score, resolvedAt: new Date().toISOString() });
    const saved = await db.deskShift.updateMany({ where: { id: shiftId, ticketsJson: shift.ticketsJson }, data: { ticketsJson: JSON.stringify(tickets) } });
    if (saved.count) return;
  }
}

const FAILED = "We couldn't mark your ticket this time. Your review allowance wasn't used - please try again in a moment.";

function view(r: { id: string; ticketKey: string; category: string; priority: string; score: number; feedbackJson: string; createdAt: Date }) {
  const feedback = JSON.parse(r.feedbackJson) as TicketReviewAi;
  return { id: r.id, ticketKey: r.ticketKey, category: r.category, priority: r.priority, score: r.score, verdict: ticketVerdict(r.score), ...feedback, createdAt: r.createdAt };
}

// Marks one handled ticket (category, priority, reply, internal note) with a
// single AI call. Paid work: counted per user and feature, given back if
// marking fails.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  const ticket = parsed.success ? getTicket(parsed.data.ticketKey) : undefined;
  if (!parsed.success || !ticket) return NextResponse.json({ error: "Choose a category and a priority, then write the reply and the note." }, { status: 400 });
  const reply = parsed.data.reply.trim();
  const note = parsed.data.note.trim();
  const replyWords = countWords(reply);
  const noteWords = countWords(note);
  if (replyWords < REPLY_WORDS.min || replyWords > REPLY_WORDS.max) return NextResponse.json({ error: `Write a reply of ${REPLY_WORDS.min} to ${REPLY_WORDS.max} words.` }, { status: 400 });
  if (noteWords < NOTE_WORDS.min || noteWords > NOTE_WORDS.max) return NextResponse.json({ error: `Write an internal note of ${NOTE_WORDS.min} to ${NOTE_WORDS.max} words.` }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Ticket marking isn't available right now. Please try again later." }, { status: 503 });

  const usage = await checkAndRecordUsage(session.user.id, "TICKET_REVIEW");
  if (!usage.allowed) return NextResponse.json({ error: upgradeMessage(usage, "TICKET_REVIEW") }, { status: 403 });

  let outcome;
  try {
    outcome = await createGeminiTicketProvider(apiKey).reviewTicket(ticket, { category: parsed.data.category, priority: parsed.data.priority, reply, note });
  } catch (err) {
    await refundUsage(usage);
    console.error("ticket review: AI marking failed", { userId: session.user.id, ticketKey: ticket.key, err });
    return NextResponse.json({ error: FAILED }, { status: 502 });
  }

  const pricing = outcome.model === GEMINI_FLASH_LITE_3_5.model ? GEMINI_FLASH_LITE_3_5 : GEMINI_FLASH_LITE_3_1;
  const saved = await db.ticketReview.create({
    data: {
      userId: session.user.id,
      ticketKey: ticket.key,
      category: parsed.data.category,
      priority: parsed.data.priority,
      reply,
      note,
      score: ticketScore(outcome.result.ratings),
      feedbackJson: JSON.stringify(outcome.result),
      costUsd: estimateAnalysisCostUsd(outcome.tokens.input, outcome.tokens.output, 0, pricing),
    },
  });
  if (parsed.data.shiftId) await resolveInShift(parsed.data.shiftId, session.user.id, ticket.key, saved);
  return NextResponse.json({ review: view(saved), remaining: usage.remaining });
}

/** The signed-in user's last 10 reviews, newest first. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const rows = await db.ticketReview.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 10 });
  return NextResponse.json({ reviews: rows.map(view) });
}
