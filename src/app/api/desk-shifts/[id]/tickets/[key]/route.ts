import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DeskTicket } from "@/lib/ticket-handling/desk";

const bodySchema = z.object({ action: z.enum(["hold", "resume"]) });

// Puts one ticket in the candidate's own open shift on hold, or back in the queue.
export async function POST(req: Request, { params }: { params: Promise<{ id: string; key: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const { id, key } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That change couldn't be made. Please try again." }, { status: 400 });

  const shift = await db.deskShift.findUnique({ where: { id } });
  if (!shift || shift.userId !== session.user.id) return NextResponse.json({ error: "That shift wasn't found." }, { status: 404 });
  if (shift.endedAt) return NextResponse.json({ error: "This shift has ended. Start a new one." }, { status: 409 });
  const tickets = JSON.parse(shift.ticketsJson) as DeskTicket[];
  const ticket = tickets.find((t) => t.key === key);
  if (!ticket) return NextResponse.json({ error: "That ticket isn't in your queue." }, { status: 404 });
  if (ticket.status === "resolved") return NextResponse.json({ error: "That ticket is already resolved." }, { status: 409 });

  ticket.status = parsed.data.action === "hold" ? "on_hold" : "open";
  const saved = await db.deskShift.updateMany({ where: { id, ticketsJson: shift.ticketsJson }, data: { ticketsJson: JSON.stringify(tickets) } });
  if (saved.count === 0) return NextResponse.json({ error: "Your queue changed meanwhile. Please try again." }, { status: 409 });
  return NextResponse.json({ tickets });
}
