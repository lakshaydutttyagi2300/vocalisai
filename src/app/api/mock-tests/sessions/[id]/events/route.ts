import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PROCTORING_EVENT_LABELS } from "@/lib/proctoring-events";

const MAX_EVENTS_PER_BATCH = 200;
/** An event time further than this from the server clock is replaced by the server time. */
const EVENT_CLOCK_WINDOW_MS = 24 * 60 * 60 * 1000;

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
  if (events.length > MAX_EVENTS_PER_BATCH) {
    return NextResponse.json({ error: "Too many events in one batch." }, { status: 400 });
  }

  // Each event is checked on its own: a bad time or detail is replaced, an
  // unknown type is dropped - one odd event never loses the whole batch.
  const now = Date.now();
  const rows = events
    .filter((e) => e && typeof e.eventType === "string" && e.eventType in PROCTORING_EVENT_LABELS)
    .map((e: { eventType: string; detail?: unknown; occurredAt?: unknown }) => {
      const at = typeof e.occurredAt === "string" || typeof e.occurredAt === "number" ? new Date(e.occurredAt) : null;
      const valid = at && Number.isFinite(at.getTime()) && Math.abs(at.getTime() - now) < EVENT_CLOCK_WINDOW_MS;
      return {
        sessionId: id,
        eventType: e.eventType,
        detail: typeof e.detail === "string" ? e.detail.slice(0, 500) : null,
        occurredAt: valid ? at : new Date(now),
      };
    });

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
