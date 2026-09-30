// Reading the exam catalogue for candidate pages (docs/CATALOGUE.md). Server-only.

import { db } from "@/lib/db";
import { DIFFICULTIES } from "@/lib/practice-taxonomy";
import { servableWhere } from "@/lib/practice-bank";

/** Active categories with their active exams, in admin order. */
export async function catalogTree() {
  return db.catalogCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      exams: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          keywords: true,
          isPopular: true,
          subjects: { orderBy: { sortOrder: "asc" }, where: { subject: { isActive: true } }, select: { subject: { select: { name: true } } } },
        },
      },
    },
  });
}

export type CatalogTree = Awaited<ReturnType<typeof catalogTree>>;

export async function examDetail(categorySlug: string, examSlug: string) {
  return db.catalogExam.findFirst({
    where: { slug: examSlug, isActive: true, category: { slug: categorySlug, isActive: true } },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      mockMinutes: true,
      category: { select: { slug: true, name: true } },
      subjects: {
        where: { subject: { isActive: true } },
        orderBy: { sortOrder: "asc" },
        select: {
          mockQuestionCount: true,
          subject: {
            select: {
              id: true,
              slug: true,
              name: true,
              description: true,
              legacyCategory: true,
              skills: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
}

export type ExamDetail = NonNullable<Awaited<ReturnType<typeof examDetail>>>;

/** "subjectId:LEVEL" and "subjectId:skillId:LEVEL" -> servable questions for this exam. */
export async function questionCountsForExam(exam: ExamDetail): Promise<Record<string, number>> {
  const subjects = exam.subjects.map((s) => s.subject);
  if (subjects.length === 0) return {};
  const examOpen = { OR: [{ exams: { none: {} } }, { exams: { some: { examId: exam.id } } }] };
  const counts: Record<string, number> = {};
  const add = (key: string, n: number) => (counts[key] = (counts[key] ?? 0) + n);

  const [tagged, legacy] = await Promise.all([
    db.practiceQuestion.groupBy({
      by: ["subjectId", "catalogSkillId", "difficulty"],
      where: { AND: [servableWhere(), examOpen, { subjectId: { in: subjects.map((s) => s.id) } }] },
      _count: { _all: true },
    }),
    db.practiceQuestion.groupBy({
      by: ["category", "difficulty"],
      where: { AND: [servableWhere(), examOpen, { subjectId: null, category: { in: subjects.flatMap((s) => (s.legacyCategory ? [s.legacyCategory] : [])) } }] },
      _count: { _all: true },
    }),
  ]);
  for (const row of tagged) {
    add(`${row.subjectId}:${row.difficulty}`, row._count._all);
    if (row.catalogSkillId) add(`${row.subjectId}:${row.catalogSkillId}:${row.difficulty}`, row._count._all);
  }
  for (const row of legacy) {
    for (const s of subjects.filter((x) => x.legacyCategory === row.category)) add(`${s.id}:${row.difficulty}`, row._count._all);
  }
  for (const s of subjects) for (const d of DIFFICULTIES) counts[`${s.id}:${d}`] ??= 0;
  return counts;
}
