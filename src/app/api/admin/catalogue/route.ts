import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

// The whole catalogue for the admin editor, including switched-off items,
// with question counts per subject.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const [categories, subjects, perSubject] = await Promise.all([
    db.catalogCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        exams: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: { subjects: { orderBy: { sortOrder: "asc" }, select: { subjectId: true, mockQuestionCount: true } }, _count: { select: { tests: true, questions: true } } },
        },
      },
    }),
    db.catalogSubject.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { skills: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { questions: true } } } }, _count: { select: { exams: true } } },
    }),
    db.practiceQuestion.groupBy({ by: ["subjectId"], where: { subjectId: { not: null } }, _count: { _all: true } }),
  ]);
  const questionCount = new Map(perSubject.map((r) => [r.subjectId, r._count._all]));
  return NextResponse.json({
    categories,
    subjects: subjects.map((s) => ({ ...s, questionCount: questionCount.get(s.id) ?? 0 })),
  });
}
