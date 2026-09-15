import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRoleDef } from "@/lib/conversation-roles";
import { isValidDifficulty } from "@/lib/practice-taxonomy";
import { checkAndRecordUsage, checkDifficultyAccess, upgradeMessage } from "@/lib/entitlements";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const role = body?.role;
  const difficulty = body?.difficulty;

  const roleDef = getRoleDef(role);
  if (!roleDef) return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  if (!difficulty || !isValidDifficulty(difficulty)) {
    return NextResponse.json({ error: "Invalid or missing difficulty." }, { status: 400 });
  }

  const hasDifficultyAccess = await checkDifficultyAccess(session.user.id, difficulty);
  if (!hasDifficultyAccess) {
    return NextResponse.json(
      { error: "This difficulty level isn't included on your current plan. Upgrade to unlock it." },
      { status: 403 }
    );
  }
  const usage = await checkAndRecordUsage(session.user.id, "INTERVIEW_SIMULATION");
  if (!usage.allowed) {
    return NextResponse.json({ error: upgradeMessage(usage, "INTERVIEW_SIMULATION") }, { status: 403 });
  }

  const pool = await db.practiceQuestion.findMany({
    where: { category: roleDef.category, difficulty },
  });
  if (pool.length === 0) {
    return NextResponse.json({ error: "No scenarios available for this selection yet." }, { status: 404 });
  }
  const question = pool[Math.floor(Math.random() * pool.length)];
  const openingLine = question.passage ?? question.prompt;

  const conversationSession = await db.conversationSession.create({
    data: {
      userId: session.user.id,
      role: roleDef.role,
      questionId: question.id,
      turns: { create: [{ turnIndex: 0, speaker: "ai", text: openingLine }] },
    },
    include: { turns: true },
  });

  return NextResponse.json({
    sessionId: conversationSession.id,
    role: roleDef.role,
    scenario: openingLine,
    turns: conversationSession.turns,
  });
}
