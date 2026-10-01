// Reading the exam catalogue for candidate pages (docs/CATALOGUE.md). Server-only.

import { db } from "@/lib/db";
import { DIFFICULTIES } from "@/lib/practice-taxonomy";
import { servableWhere } from "@/lib/practice-bank";

/** Categories whose subjects are offered skill-first ("Practice by skill"), in this order. */
export const SKILL_FIRST_CATEGORIES = ["aptitude-reasoning", "english-communication", "workplace-assessments"];
/** The category shown first on Explore, with providers and companies. */
export const HIRING_CATEGORY = "company-hiring-assessments";

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
          groupName: true,
          isPopular: true,
          subjects: {
            orderBy: { sortOrder: "asc" },
            where: { subject: { isActive: true } },
            select: { sectionName: true, subject: { select: { slug: true, name: true } } },
          },
        },
      },
    },
  });
}

export type CatalogTree = Awaited<ReturnType<typeof catalogTree>>;

/** An exam's section names in order (a subject's own name when the exam doesn't name the section). */
export function sectionNames(links: { sectionName: string | null; subject: { name: string } }[]): string[] {
  return [...new Set(links.map((l) => l.sectionName ?? l.subject.name))];
}

/** Practice areas for "Practice by skill": active subjects used by the skill-first categories' exams. */
export async function skillFirstAreas() {
  const categories = await db.catalogCategory.findMany({
    where: { slug: { in: SKILL_FIRST_CATEGORIES }, isActive: true },
    select: {
      slug: true,
      name: true,
      exams: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          subjects: {
            where: { subject: { isActive: true } },
            orderBy: { sortOrder: "asc" },
            select: { subject: { select: { slug: true, name: true, description: true, _count: { select: { skills: { where: { isActive: true } } } } } } },
          },
        },
      },
    },
  });
  const seen = new Set<string>();
  return SKILL_FIRST_CATEGORIES.map((slug) => categories.find((c) => c.slug === slug))
    .filter((c) => c !== undefined)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      subjects: c.exams
        .flatMap((e) => e.subjects.map((s) => s.subject))
        .filter((s) => !seen.has(s.slug) && seen.add(s.slug))
        .map((s) => ({ slug: s.slug, name: s.name, description: s.description, skillCount: s._count.skills })),
    }))
    .filter((c) => c.subjects.length > 0);
}

export async function examDetail(categorySlug: string, examSlug: string) {
  return db.catalogExam.findFirst({
    where: { slug: examSlug, isActive: true, category: { slug: categorySlug, isActive: true } },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      mockMinutes: true,
      groupName: true,
      category: { select: { slug: true, name: true } },
      subjects: {
        where: { subject: { isActive: true } },
        orderBy: { sortOrder: "asc" },
        select: {
          mockQuestionCount: true,
          sectionName: true,
          subject: {
            select: {
              id: true,
              slug: true,
              name: true,
              description: true,
              legacyCategory: true,
              skills: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, slug: true, name: true } },
            },
          },
        },
      },
    },
  });
}

export type ExamDetail = NonNullable<Awaited<ReturnType<typeof examDetail>>>;

/** Where an exam lives now: its active category's slug, or null if it's no longer offered. */
export async function currentExamCategory(examSlug: string): Promise<string | null> {
  const exam = await db.catalogExam.findFirst({ where: { slug: examSlug, isActive: true, category: { isActive: true } }, select: { category: { select: { slug: true } } } });
  return exam?.category.slug ?? null;
}

/** One practice area (subject) and its skills, for skill-first practice. */
export async function subjectDetail(slug: string) {
  return db.catalogSubject.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      legacyCategory: true,
      skills: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, slug: true, name: true } },
    },
  });
}

export type SubjectDetail = NonNullable<Awaited<ReturnType<typeof subjectDetail>>>;

/**
 * "subjectId:LEVEL" and "subjectId:skillId:LEVEL" -> servable questions,
 * limited to what an exam may use when `examId` is given.
 */
export async function questionCounts(subjects: { id: string; legacyCategory: string | null }[], examId: string | null): Promise<Record<string, number>> {
  if (subjects.length === 0) return {};
  const examOpen = examId ? { OR: [{ exams: { none: {} } }, { exams: { some: { examId } } }] } : {};
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

export function questionCountsForExam(exam: ExamDetail) {
  return questionCounts(
    exam.subjects.map((s) => s.subject),
    exam.id
  );
}
