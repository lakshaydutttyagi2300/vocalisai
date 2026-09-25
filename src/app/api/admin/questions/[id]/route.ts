import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/audit-log";
import { validateQuestionFields } from "@/lib/question-validation";
import { validatePassageStimulus } from "@/lib/question-stimulus";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const question = await db.practiceQuestion.findUnique({ where: { id } });
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...question,
    options: question.options ? JSON.parse(question.options) : null,
  });
}

// Partial update - only the fields present in the body are changed. The
// rest of the row's current values are merged in before validating, so
// e.g. sending only { isActive: false } to disable a question can't
// accidentally fail validation on fields the admin isn't even touching.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await db.practiceQuestion.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const merged = {
    category: body.category ?? existing.category,
    difficulty: body.difficulty ?? existing.difficulty,
    type: body.type ?? existing.type,
    prompt: body.prompt ?? existing.prompt,
    passage: body.passage !== undefined ? body.passage : existing.passage,
    options: body.options !== undefined ? body.options : existing.options ? JSON.parse(existing.options) : null,
    correctAnswer: body.correctAnswer !== undefined ? body.correctAnswer : existing.correctAnswer,
    expectedAnswer: body.expectedAnswer !== undefined ? body.expectedAnswer : existing.expectedAnswer,
    explanation: body.explanation !== undefined ? body.explanation : existing.explanation,
    scoringCriteria: body.scoringCriteria !== undefined ? body.scoringCriteria : existing.scoringCriteria,
    timeLimitSeconds: body.timeLimitSeconds ?? existing.timeLimitSeconds,
    isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
  };

  // Only a passage the admin is changing is checked, so editing any other
  // field of an existing question behaves exactly as before.
  const validationError =
    validateQuestionFields(merged) ?? (body.passage !== undefined ? validatePassageStimulus(merged.passage) : null);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const updated = await db.practiceQuestion.update({
    where: { id },
    data: {
      category: merged.category,
      difficulty: merged.difficulty,
      type: merged.type,
      prompt: merged.prompt,
      passage: merged.passage,
      options: merged.options ? JSON.stringify(merged.options) : null,
      correctAnswer: merged.correctAnswer,
      expectedAnswer: merged.expectedAnswer,
      explanation: merged.explanation,
      scoringCriteria: merged.scoringCriteria,
      timeLimitSeconds: merged.timeLimitSeconds,
      isActive: merged.isActive,
    },
  });

  await logAdminAction({
    adminId: session.user.id,
    adminEmail: session.user.email ?? "unknown",
    action: existing.isActive !== merged.isActive ? (merged.isActive ? "QUESTION_ACTIVATED" : "QUESTION_DEACTIVATED") : "QUESTION_EDITED",
    targetType: "PracticeQuestion",
    targetId: id,
    before: { prompt: existing.prompt, isActive: existing.isActive, category: existing.category, difficulty: existing.difficulty },
    after: { prompt: updated.prompt, isActive: updated.isActive, category: updated.category, difficulty: updated.difficulty },
  });

  return NextResponse.json({
    ...updated,
    options: updated.options ? JSON.parse(updated.options) : null,
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await db.practiceQuestion.findUnique({
    where: { id },
    include: { _count: { select: { attempts: true, conversationSessions: true, itemResponses: true } } },
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
  // Separate check (and message) so the original one above stays
  // word-for-word unchanged - exam-runner-v2 answers (P1-E) also hold a
  // foreign key to the question.
  if (existing._count.itemResponses > 0) {
    return NextResponse.json(
      { error: `Can't delete: ${existing._count.itemResponses} exam answer(s) already reference this question.` },
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
