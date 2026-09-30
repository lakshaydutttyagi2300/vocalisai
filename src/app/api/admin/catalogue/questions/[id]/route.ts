import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/audit-log";
import { CatalogAdminError, questionStats, removeQuestion, statusOf, updateQuestion } from "@/lib/catalog-admin";

type Params = { params: Promise<{ id: string }> };

// One catalogue question with its usage, performance and latest attempts.
export async function GET(_req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { id } = await params;
  const q = await db.practiceQuestion.findFirst({
    where: { id, subjectId: { not: null } },
    include: { exams: { select: { examId: true } } },
  });
  if (!q) return NextResponse.json({ error: "That question isn't part of the exam catalogue." }, { status: 404 });
  const [stats, attempts] = await Promise.all([
    questionStats([id]),
    db.practiceAttempt.findMany({
      where: { questionId: id },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, createdAt: true, isCorrect: true, timeTakenSeconds: true, responseText: true, user: { select: { name: true, email: true } } },
    }),
  ]);
  return NextResponse.json({
    question: {
      id: q.id,
      subjectId: q.subjectId,
      skillId: q.catalogSkillId,
      examIds: q.exams.map((e) => e.examId),
      difficulty: q.difficulty,
      type: q.type,
      prompt: q.prompt,
      passage: q.passage,
      options: q.options ? JSON.parse(q.options) : null,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      tags: q.tags,
      status: statusOf(q),
      timeLimitSeconds: q.timeLimitSeconds,
      createdAt: q.createdAt,
    },
    stats: stats.get(id),
    attempts,
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { id } = await params;
  try {
    const { before, after } = await updateQuestion(id, await req.json().catch(() => ({})));
    const action = before.status !== after.status ? `QUESTION_${after.status}` : "QUESTION_EDITED";
    await logAdminAction({ adminId: admin.adminId, adminEmail: admin.adminEmail, action, targetType: "PracticeQuestion", targetId: id, before, after });
    return NextResponse.json({ saved: true });
  } catch (err) {
    if (err instanceof CatalogAdminError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("catalogue: question update failed", err);
    return NextResponse.json({ error: "We couldn't save the question. Please try again." }, { status: 500 });
  }
}

// Deletes a never-answered question; one with answers is archived instead.
export async function DELETE(_req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { id } = await params;
  try {
    const outcome = await removeQuestion(id);
    await logAdminAction({ adminId: admin.adminId, adminEmail: admin.adminEmail, action: outcome === "deleted" ? "QUESTION_DELETED" : "QUESTION_ARCHIVED", targetType: "PracticeQuestion", targetId: id });
    return NextResponse.json({ outcome });
  } catch (err) {
    if (err instanceof CatalogAdminError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("catalogue: question delete failed", err);
    return NextResponse.json({ error: "We couldn't remove the question. Please try again." }, { status: 500 });
  }
}
