import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function loadOwnedSession(sessionId: string, userId: string) {
  const mockTestSession = await db.mockTestSession.findUnique({ where: { id: sessionId } });
  if (!mockTestSession || mockTestSession.userId !== userId) return null;
  return mockTestSession;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const owned = await loadOwnedSession(id, session.user.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.mockTestSession.update({ where: { id }, data: { endedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
