import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PROCTORING_EVENT_LABELS } from "@/lib/proctoring-events";

async function verifyOwnership(sessionId: string, userId: string) {
  const mockTestSession = await db.mockTestSession.findUnique({ where: { id: sessionId } });
  return mockTestSession && mockTestSession.userId === userId;
}

// Accepts a batch of events at once - the client buffers events client-side
// and flushes periodically, rather than firing one request per event.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await verifyOwnership(id, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const events = body?.events;
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "events array is required." }, { status: 400 });
  }

  const rows = events
    .filter((e) => e && typeof e.eventType === "string" && e.eventType in PROCTORING_EVENT_LABELS)
    .map((e: { eventType: string; detail?: string; occurredAt?: string }) => ({
      sessionId: id,
      eventType: e.eventType,
      detail: e.detail ?? null,
      occurredAt: e.occurredAt ? new Date(e.occurredAt) : new Date(),
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid events in batch." }, { status: 400 });
  }

  await db.proctoringEvent.createMany({ data: rows });
  return NextResponse.json({ saved: rows.length });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await verifyOwnership(id, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const events = await db.proctoringEvent.findMany({
    where: { sessionId: id },
    orderBy: { occurredAt: "asc" },
  });

  return NextResponse.json({ events });
}
