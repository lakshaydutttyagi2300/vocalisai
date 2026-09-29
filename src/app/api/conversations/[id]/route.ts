import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEffectivePlan, interviewSimulationMaxTurns } from "@/lib/entitlements";

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

  // So a reloaded page knows the conversation is already at its last turn
  // (the turns route refuses further turns) and offers only "End".
  const candidateTurns = convoSession.turns.filter((t) => t.speaker === "candidate").length;
  const reachedMaxTurns = candidateTurns >= interviewSimulationMaxTurns(await getEffectivePlan(session.user.id));

  return NextResponse.json({
    sessionId: convoSession.id,
    role: convoSession.role,
    turns: convoSession.turns,
    reachedMaxTurns,
    ended: !!convoSession.endedAt,
    analysis: convoSession.overallAnalysisJson ? JSON.parse(convoSession.overallAnalysisJson) : null,
  });
}
