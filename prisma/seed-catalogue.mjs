// Exam catalogue - starting structure (idempotent; safe to re-run).
// Categories, exams, shared subjects, their skills and exam sections from
// prisma/catalogue/content.mjs ("create" in prisma/catalogue/sql.mjs): adds
// what is missing and never changes a row that exists, so admin edits in
// /admin/catalogue survive. No questions are created. To bring an existing
// database in line with content.mjs instead, use prisma/catalogue/apply.mjs.
//
//   npm run seed:catalogue                   # dev (.env)
//   DATABASE_URL=... npm run seed:catalogue  # test / staging
//   npm run seed:catalogue -- --production   # REQUIRED for the live DB

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertDevDatabase } from "./exam-demo/seed.mjs";
import { runCatalogueSql } from "./catalogue/sql.mjs";

export async function seedCatalogue(db) {
  return runCatalogueSql(db, "create");
}

if (process.argv[1]?.endsWith("seed-catalogue.mjs")) {
  const production = process.argv.includes("--production");
  const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: production });
  console.log(`Database: ${host}${production ? "  (PRODUCTION)" : ""}`);
  const db = new PrismaClient();
  try {
    console.log("Active after seeding:", await seedCatalogue(db));
  } finally {
    await db.$disconnect();
  }
}
