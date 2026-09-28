// Loads the exam library (prisma/exam-library/content.mjs): exam types,
// timed exams, papers, parts, and one template per exam whose sections draw
// fresh questions from the bank. Candidates see them on /mock-tests while
// the exam_runner_v2 flag is on (it is on in production).
//
// Safe to re-run: a missing exam is created in full; an existing one only
// has its names, descriptions and paper timings refreshed - its parts and
// sections are never rebuilt, so nothing in progress can break. Nothing is
// ever deleted. Also makes the General English track assessment distinct
// from the BPO one (content.mjs, GENERAL_ENGLISH_ASSESSMENT).
//
//   npm run seed:exam-library                  # dev database (.env)
//   npm run seed:exam-library -- --dry-run     # show what would change
//   npm run seed:exam-library -- --production  # REQUIRED for the live DB
//
// Refuses unknown databases (same guard as the other seed scripts).

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertDevDatabase } from "./exam-demo/seed.mjs";
import { EXAM_LIBRARY } from "./exam-library/content.mjs";
import { seedExamLibrary } from "./exam-library/seed.mjs";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: args.has("--production") });
console.log(`Database: ${host}${args.has("--production") ? "  (PRODUCTION)" : ""}${dryRun ? "  [dry run]" : ""}`);
const db = new PrismaClient();
try {
  const log = await seedExamLibrary(db, { dryRun });
  console.log(log.length ? log.join("\n") : "Nothing to change - the exam library is up to date.");
  const exams = EXAM_LIBRARY.reduce((n, f) => n + f.exams.length, 0);
  console.log(`\n${EXAM_LIBRARY.length} exam types, ${exams} exams in the library.`);
} finally {
  await db.$disconnect();
}
