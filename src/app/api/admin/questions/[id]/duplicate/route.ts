import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/audit-log";

// Copies every content field onto a brand-new row - a real independent
// question, not a reference to the original. Prompt is prefixed so it's
// obviously a copy in the admin list, and the copy is left inactive by
// default: a duplicate is almost always made in order to edit it into a
// variant, and it shouldn't be servable to candidates mid-edit.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const source = await db.practiceQuestion.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const copy = await db.practiceQuestion.create({
    data: {
      category: source.category,
      difficulty: source.difficulty,
      type: source.type,
      prompt: `${source.prompt} (copy)`,
      passage: source.passage,
      options: source.options,
      correctAnswer: source.correctAnswer,
      expectedAnswer: source.expectedAnswer,
      explanation: source.explanation,
      scoringCriteria: source.scoringCriteria,
      timeLimitSeconds: source.timeLimitSeconds,
      source: "SEEDED",
      isActive: false,
    },
  });

  await logAdminAction({
    adminId: session.user.id,
    adminEmail: session.user.email ?? "unknown",
    action: "QUESTION_DUPLICATED",
    targetType: "PracticeQuestion",
    targetId: copy.id,
    before: { duplicatedFrom: source.id },
    after: { prompt: copy.prompt },
  });

  return NextResponse.json({
    ...copy,
    options: copy.options ? JSON.parse(copy.options) : null,
  });
}
