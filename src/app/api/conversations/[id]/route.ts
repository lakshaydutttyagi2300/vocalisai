import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const convoSession = await db.conversationSession.findUnique({
    where: { id },
    include: { turns: { orderBy: { turnIndex: "asc" } } },
  });
  if (!convoSession || convoSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    sessionId: convoSession.id,
    role: convoSession.role,
    turns: convoSession.turns,
    ended: !!convoSession.endedAt,
    analysis: convoSession.overallAnalysisJson ? JSON.parse(convoSession.overallAnalysisJson) : null,
  });
}
