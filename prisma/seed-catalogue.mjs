// Exam catalogue - starting structure (idempotent; safe to re-run).
// Categories, exams, shared subjects, their skills and exam-subject links
// from prisma/catalogue/content.mjs. Creates what is missing and never
// changes a row that exists, so admin edits in /admin/catalogue survive.
// No questions are created.
//
//   npm run seed:catalogue                   # dev (.env)
//   DATABASE_URL=... npm run seed:catalogue  # test / staging
//   npm run seed:catalogue -- --production   # REQUIRED for the live DB

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertDevDatabase } from "./exam-demo/seed.mjs";
import { CATEGORIES, SUBJECTS, slugify } from "./catalogue/content.mjs";

export async function seedCatalogue(db) {
  const counts = { categories: 0, exams: 0, subjects: 0, skills: 0, links: 0 };

  const subjectIds = new Map();
  for (const [i, s] of SUBJECTS.entries()) {
    let row = await db.catalogSubject.findUnique({ where: { slug: s.slug } });
    if (!row) {
      row = await db.catalogSubject.create({ data: { slug: s.slug, name: s.name, legacyCategory: s.legacy ?? null, sortOrder: i } });
      counts.subjects++;
    }
    subjectIds.set(s.slug, row.id);
    for (const [j, name] of s.skills.entries()) {
      const slug = slugify(name);
      const exists = await db.catalogSkill.findUnique({ where: { subjectId_slug: { subjectId: row.id, slug } } });
      if (!exists) {
        await db.catalogSkill.create({ data: { subjectId: row.id, slug, name, sortOrder: j } });
        counts.skills++;
      }
    }
  }

  for (const [i, c] of CATEGORIES.entries()) {
    let category = await db.catalogCategory.findUnique({ where: { slug: c.slug } });
    if (!category) {
      category = await db.catalogCategory.create({ data: { slug: c.slug, name: c.name, description: c.description, sortOrder: i } });
      counts.categories++;
    }
    for (const [j, [slug, name, subjects, opts = {}]] of c.exams.entries()) {
      let exam = await db.catalogExam.findUnique({ where: { slug } });
      if (!exam) {
        const per = opts.per ?? 10;
        exam = await db.catalogExam.create({
          data: {
            slug,
            name,
            categoryId: category.id,
            keywords: opts.keywords ?? null,
            isPopular: opts.popular ?? false,
            sortOrder: j,
            mockMinutes: opts.minutes ?? Math.ceil(subjects.length * per * 0.75),
          },
        });
        counts.exams++;
        for (const [k, subjectSlug] of subjects.entries()) {
          const subjectId = subjectIds.get(subjectSlug);
          if (!subjectId) throw new Error(`Exam ${slug}: unknown subject ${subjectSlug}`);
          await db.catalogExamSubject.create({ data: { examId: exam.id, subjectId, sortOrder: k, mockQuestionCount: per } });
          counts.links++;
        }
      }
    }
  }
  return counts;
}

if (process.argv[1]?.endsWith("seed-catalogue.mjs")) {
  const production = process.argv.includes("--production");
  const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: production });
  console.log(`Database: ${host}${production ? "  (PRODUCTION)" : ""}`);
  const db = new PrismaClient();
  try {
    const counts = await seedCatalogue(db);
    console.log("Created:", counts);
  } finally {
    await db.$disconnect();
  }
}
