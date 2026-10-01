// SQL that brings a database's exam catalogue in line with content.mjs.
//
//   mode "create": only adds what is missing (fresh databases; never changes
//                  existing rows, so admin edits survive).
//   mode "sync":   also updates the listed categories, exams, subjects and
//                  skills to match the file, replaces those exams' sections,
//                  and switches off everything in RETIRED (never deletes).
//
// Rows are matched by slug, so ids differ between databases. Pure: returns
// statements; prisma/seed-catalogue.mjs and prisma/catalogue/apply.mjs run them.

import { CATEGORIES, RETIRED, SUBJECTS, examLinks, mockMinutes, slugify } from "./content.mjs";

const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const list = (values) => values.map(q).join(",");

export function catalogueStatements(mode) {
  const sync = mode === "sync";
  const allExams = CATEGORIES.flatMap((c) => c.exams.map((e, j) => ({ ...e, category: c.slug, order: j })));
  const st = [];

  st.push(`INSERT INTO "CatalogSubject" (id, slug, name, "legacyCategory", "sortOrder", "isActive", "updatedAt")
SELECT gen_random_uuid()::text, v.slug, v.name, v.leg, v.ord, true, now()
FROM (VALUES ${SUBJECTS.map((s, i) => `(${q(s.slug)}, ${q(s.name)}, ${q(s.legacy ?? null)}, ${i})`).join(", ")}) AS v(slug, name, leg, ord)
ON CONFLICT (slug) DO ${sync ? `UPDATE SET name = EXCLUDED.name, "legacyCategory" = EXCLUDED."legacyCategory", "sortOrder" = EXCLUDED."sortOrder", "isActive" = true, "updatedAt" = now()` : "NOTHING"}`);

  st.push(`INSERT INTO "CatalogSkill" (id, "subjectId", slug, name, "sortOrder", "isActive", "updatedAt")
SELECT gen_random_uuid()::text, s.id, v.slug, v.name, v.ord, true, now()
FROM (VALUES ${SUBJECTS.flatMap((s) => s.skills.map((k, j) => `(${q(s.slug)}, ${q(slugify(k))}, ${q(k)}, ${j})`)).join(", ")}) AS v(subject, slug, name, ord)
JOIN "CatalogSubject" s ON s.slug = v.subject
ON CONFLICT ("subjectId", slug) DO ${sync ? `UPDATE SET name = EXCLUDED.name, "sortOrder" = EXCLUDED."sortOrder", "isActive" = true, "updatedAt" = now()` : "NOTHING"}`);

  st.push(`INSERT INTO "CatalogCategory" (id, slug, name, description, "sortOrder", "isActive", "updatedAt")
SELECT gen_random_uuid()::text, v.slug, v.name, v.description, v.ord, true, now()
FROM (VALUES ${CATEGORIES.map((c, i) => `(${q(c.slug)}, ${q(c.name)}, ${q(c.description)}, ${i})`).join(", ")}) AS v(slug, name, description, ord)
ON CONFLICT (slug) DO ${sync ? `UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, "sortOrder" = EXCLUDED."sortOrder", "isActive" = true, "updatedAt" = now()` : "NOTHING"}`);

  st.push(`INSERT INTO "CatalogExam" (id, slug, "categoryId", name, description, keywords, "groupName", "isPopular", "sortOrder", "mockMinutes", "isActive", "updatedAt")
SELECT gen_random_uuid()::text, v.slug, c.id, v.name, v.description, v.keywords, v.grp, v.popular, v.ord, v.minutes, true, now()
FROM (VALUES ${allExams.map((e) => `(${q(e.category)}, ${q(e.slug)}, ${q(e.name)}, ${q(e.description ?? null)}, ${q(e.keywords ?? null)}, ${q(e.group ?? null)}, ${e.popular ? "true" : "false"}, ${e.order}, ${mockMinutes(e)})`).join(", ")}) AS v(category, slug, name, description, keywords, grp, popular, ord, minutes)
JOIN "CatalogCategory" c ON c.slug = v.category
ON CONFLICT (slug) DO ${
    sync
      ? `UPDATE SET "categoryId" = EXCLUDED."categoryId", name = EXCLUDED.name, description = COALESCE(EXCLUDED.description, "CatalogExam".description), keywords = EXCLUDED.keywords, "groupName" = EXCLUDED."groupName", "isPopular" = EXCLUDED."isPopular", "sortOrder" = EXCLUDED."sortOrder", "mockMinutes" = EXCLUDED."mockMinutes", "isActive" = true, "updatedAt" = now()`
      : "NOTHING"
  }`);

  const links = allExams.flatMap((e) => examLinks(e).map((l) => `(${q(e.slug)}, ${q(l.subject)}, ${q(l.sectionName)}, ${l.sortOrder}, ${e.per ?? 10})`));
  if (sync) st.push(`DELETE FROM "CatalogExamSubject" WHERE "examId" IN (SELECT id FROM "CatalogExam" WHERE slug IN (${list(allExams.map((e) => e.slug))}))`);
  st.push(`INSERT INTO "CatalogExamSubject" ("examId", "subjectId", "sectionName", "sortOrder", "mockQuestionCount")
SELECT e.id, s.id, v.section, v.ord, v.per
FROM (VALUES ${links.join(", ")}) AS v(exam, subject, section, ord, per)
JOIN "CatalogExam" e ON e.slug = v.exam
JOIN "CatalogSubject" s ON s.slug = v.subject
${sync ? "" : `WHERE NOT EXISTS (SELECT 1 FROM "CatalogExamSubject" x WHERE x."examId" = e.id)`}
ON CONFLICT ("examId", "subjectId") DO NOTHING`);

  if (sync) {
    // After the moves above: whatever is still in a retired category goes off.
    st.push(`UPDATE "CatalogExam" SET "isActive" = false, "isPopular" = false, "updatedAt" = now() WHERE "categoryId" IN (SELECT id FROM "CatalogCategory" WHERE slug IN (${list(RETIRED.categories)}))`);
    st.push(`UPDATE "CatalogCategory" SET "isActive" = false, "updatedAt" = now() WHERE slug IN (${list(RETIRED.categories)})`);
    st.push(`UPDATE "CatalogSubject" SET "isActive" = false, "updatedAt" = now() WHERE slug IN (${list(RETIRED.subjects)})`);
  }
  return st;
}

/** Runs the statements in one transaction with a PrismaClient. */
export async function runCatalogueSql(db, mode) {
  const statements = catalogueStatements(mode);
  await db.$transaction(statements.map((sql) => db.$executeRawUnsafe(sql)));
  const [categories, exams, subjects, skills, links] = await Promise.all([
    db.catalogCategory.count({ where: { isActive: true } }),
    db.catalogExam.count({ where: { isActive: true, category: { isActive: true } } }),
    db.catalogSubject.count({ where: { isActive: true } }),
    db.catalogSkill.count({ where: { subject: { isActive: true } } }),
    db.catalogExamSubject.count({ where: { exam: { isActive: true } } }),
  ]);
  return { categories, exams, subjects, skills, links };
}
