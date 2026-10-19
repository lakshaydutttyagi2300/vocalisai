// Adds one skill to an existing catalogue subject, so questions can be
// imported under it (scripts/import-questions.mjs). Additive and safe to
// re-run: an existing skill with that slug is left as it is.
//
//   node scripts/add-catalog-skill.mjs <subject-slug> <skill-slug> "<Name>" ["<description>"]
//   DATABASE_URL=... node scripts/add-catalog-skill.mjs ... --production   # REQUIRED for the live DB

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertDevDatabase } from "../prisma/exam-demo/seed.mjs";

const args = process.argv.slice(2);
const production = args.includes("--production");
const [subjectSlug, skillSlug, name, description] = args.filter((a) => !a.startsWith("--"));
if (!subjectSlug || !skillSlug || !name) {
  console.error('Usage: node scripts/add-catalog-skill.mjs <subject-slug> <skill-slug> "<Name>" ["<description>"] [--production]');
  process.exit(1);
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skillSlug)) {
  console.error("The skill slug must be lowercase words joined by hyphens, e.g. conversation-completion.");
  process.exit(1);
}

const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: production });
console.log(`Database: ${host}${production ? "  (PRODUCTION)" : ""}`);
const db = new PrismaClient();
try {
  const subject = await db.catalogSubject.findUnique({ where: { slug: subjectSlug }, select: { id: true, name: true } });
  if (!subject) throw new Error(`No subject "${subjectSlug}". Nothing was changed.`);
  const existing = await db.catalogSkill.findFirst({ where: { subjectId: subject.id, slug: skillSlug }, select: { id: true } });
  if (existing) {
    console.log(`"${skillSlug}" already exists in ${subject.name}. Nothing was changed.`);
  } else {
    const last = await db.catalogSkill.aggregate({ where: { subjectId: subject.id }, _max: { sortOrder: true } });
    await db.catalogSkill.create({ data: { subjectId: subject.id, slug: skillSlug, name, description: description ?? null, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    console.log(`Added the skill "${name}" (${skillSlug}) to ${subject.name}.`);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
