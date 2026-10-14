import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { newShiftTickets, type DeskTicket } from "@/lib/ticket-handling/desk";

const parse = (json: string) => JSON.parse(json) as DeskTicket[];
const view = (s: { id: string; ticketsJson: string; startedAt: Date; endedAt: Date | null }) => ({ id: s.id, tickets: parse(s.ticketsJson), startedAt: s.startedAt, endedAt: s.endedAt });

/** The candidate's current shift (if any) and the scores from their last 30 resolved tickets. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const [shift, recent] = await Promise.all([
    db.deskShift.findFirst({ where: { userId: session.user.id, endedAt: null }, orderBy: { startedAt: "desc" } }),
    db.ticketReview.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 30, select: { score: true } }),
  ]);
  return NextResponse.json({ shift: shift ? view(shift) : null, recentScores: recent.map((r) => r.score) });
}

// Starts a new shift: a queue of tickets with staggered due times. Free: the
// marking of each ticket is what uses an AI ticket review. Any shift still
// open is closed first, so there is only ever one.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const userId = session.user.id;
  const previous = await db.deskShift.findFirst({ where: { userId }, orderBy: { startedAt: "desc" }, select: { ticketsJson: true } });
  const now = new Date();
  await db.deskShift.updateMany({ where: { userId, endedAt: null }, data: { endedAt: now } });
  const tickets = newShiftTickets(now, Math.random, previous ? parse(previous.ticketsJson).map((t) => t.key) : []);
  const shift = await db.deskShift.create({ data: { userId, ticketsJson: JSON.stringify(tickets), startedAt: now } });
  return NextResponse.json({ shift: view(shift) });
}
