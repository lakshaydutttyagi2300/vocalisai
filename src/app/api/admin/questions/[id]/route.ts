import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/audit-log";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await db.practiceQuestion.findUnique({
    where: { id },
    include: { _count: { select: { attempts: true, conversationSessions: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing._count.attempts > 0 || existing._count.conversationSessions > 0) {
    return NextResponse.json(
      {
        error: `Can't delete: ${existing._count.attempts} attempt(s) and ${existing._count.conversationSessions} conversation session(s) already reference this question.`,
      },
      { status: 409 }
    );
  }

  await db.practiceQuestion.delete({ where: { id } });

  await logAdminAction({
    adminId: session.user.id,
    adminEmail: session.user.email ?? "unknown",
    action: "QUESTION_DELETED",
    targetType: "PracticeQuestion",
    targetId: id,
    before: { category: existing.category, difficulty: existing.difficulty, prompt: existing.prompt },
  });

  return NextResponse.json({ deleted: true });
}
