import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/audit-log";
import { DIFFICULTIES } from "@/lib/practice-taxonomy";
import { CatalogAdminError, createQuestion, questionStats, QUESTION_STATUSES, statusOf } from "@/lib/catalog-admin";

const PAGE_SIZE = 50;
const filterSchema = z.object({
  subjectId: z.string().max(40).optional(),
  skillId: z.string().max(40).optional(),
  examId: z.string().max(40).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  status: z.enum(QUESTION_STATUSES).optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});

// Catalogue questions (those with a subject), filtered and paged, with usage stats.
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const raw = Object.fromEntries([...new URL(req.url).searchParams.entries()].filter(([, v]) => v !== ""));
  const parsed = filterSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Check the filters." }, { status: 400 });
  const f = parsed.data;

  const where: Prisma.PracticeQuestionWhereInput = {
    subjectId: f.subjectId ?? { not: null },
    ...(f.skillId ? { catalogSkillId: f.skillId } : {}),
    ...(f.examId ? { exams: { some: { examId: f.examId } } } : {}),
    ...(f.difficulty ? { difficulty: f.difficulty } : {}),
    ...(f.status === "ARCHIVED" ? { archivedAt: { not: null } } : f.status ? { archivedAt: null, isActive: f.status === "ACTIVE" } : {}),
    ...(f.q ? { OR: [{ prompt: { contains: f.q, mode: "insensitive" } }, { tags: { has: f.q.toLowerCase() } }, { id: f.q }] } : {}),
  };
  const [total, rows] = await Promise.all([
    db.practiceQuestion.count({ where }),
    db.practiceQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        prompt: true,
        type: true,
        difficulty: true,
        tags: true,
        isActive: true,
        archivedAt: true,
        createdAt: true,
        subject: { select: { name: true } },
        catalogSkill: { select: { name: true } },
        exams: { select: { exam: { select: { name: true } } } },
      },
    }),
  ]);
  const stats = await questionStats(rows.map((r) => r.id));
  return NextResponse.json({
    total,
    page: f.page,
    pageSize: PAGE_SIZE,
    questions: rows.map(({ isActive, archivedAt, exams, ...r }) => ({ ...r, status: statusOf({ isActive, archivedAt }), exams: exams.map((e) => e.exam.name), stats: stats.get(r.id) })),
  });
}

// Adds one question to the catalogue bank.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  try {
    const body = await req.json().catch(() => null);
    const question = await createQuestion(body);
    await logAdminAction({ adminId: admin.adminId, adminEmail: admin.adminEmail, action: "QUESTION_CREATED", targetType: "PracticeQuestion", targetId: question.id, after: body });
    return NextResponse.json({ question });
  } catch (err) {
    if (err instanceof CatalogAdminError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("catalogue: question create failed", err);
    return NextResponse.json({ error: "We couldn't save the question. Please try again." }, { status: 500 });
  }
}
