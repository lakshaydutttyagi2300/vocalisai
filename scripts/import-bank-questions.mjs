// Loads a question-bank CSV (the Admin "file import" template: Question,
// Category, Difficulty, Question Type, ...) through the same rowToQuestion()
// and processQuestionBatch() the Admin file upload uses. For Speaking and
// other non-catalogue questions; catalogue rows use import-questions.mjs.
//
//   node scripts/import-bank-questions.mjs <file.csv>                 # check only (dry run), dev database (.env)
//   node scripts/import-bank-questions.mjs <file.csv> --save          # check, then save
//   DATABASE_URL=... node scripts/import-bank-questions.mjs <file.csv> --save --production   # REQUIRED for the live DB
//   ... --skip-duplicates   save the other rows and list the near-duplicates skipped (never forced in)
//
// Nothing is saved unless every row passes the check: an invalid row stops
// the load, and so does a near-duplicate unless --skip-duplicates is given.
// Additive only: it creates questions and never changes or deletes one.

import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createJiti } from "jiti";
import { assertDevDatabase } from "../prisma/exam-demo/seed.mjs";
import { parseCsv } from "./import-questions.mjs";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const save = args.includes("--save");
  const production = args.includes("--production");
  const skipDuplicates = args.includes("--skip-duplicates");
  if (!file) throw new Error("Usage: node scripts/import-bank-questions.mjs <file.csv> [--save] [--production]");

  const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: production });
  console.log(`Database: ${host}${production ? "  (PRODUCTION)" : ""}  ·  ${save ? "check, then save" : "check only (dry run)"}`);

  const jiti = createJiti(import.meta.url, { alias: { "@/": `${resolve("src").replace(/\\/g, "/")}/` } });
  const { rowToQuestion, TEMPLATE_COLUMNS } = await jiti.import("../src/lib/question-file-format.ts");
  const { processQuestionBatch } = await jiti.import("../src/lib/question-import.ts");
  const { db } = await jiti.import("../src/lib/db.ts");

  try {
    const [header, ...body] = parseCsv(readFileSync(file, "utf8"));
    const unknown = header.filter((h) => !TEMPLATE_COLUMNS.includes(h));
    if (unknown.length) throw new Error(`Unknown columns: ${unknown.join(", ")}`);
    const inputs = body.map((cells) => rowToQuestion(Object.fromEntries(header.map((h, k) => [h, cells[k] ?? ""]))));
    console.log(`${inputs.length} rows read from ${file}`);

    // 1. Check everything first (line numbers: header = line 1).
    const check = await processQuestionBatch(inputs, { insert: false });
    const errors = check.results.filter((r) => r.status === "error");
    const duplicates = check.results.filter((r) => r.status === "duplicate");
    for (const p of [...errors, ...duplicates].slice(0, 20)) console.log(`  line ${p.index + 2}: ${p.status === "duplicate" ? "near-duplicate, would be skipped" : p.error}  (${p.prompt.slice(0, 70)})`);
    if (errors.length || (duplicates.length && !skipDuplicates)) throw new Error(`${errors.length + duplicates.length} rows have problems (listed above). Nothing was saved.`);
    if (!save) return console.log(`Check passed: ${inputs.length - duplicates.length} rows valid, ${duplicates.length} near-duplicates to skip. Nothing was saved (dry run). Add --save to load.`);

    // 2. Save (processQuestionBatch re-checks every row itself).
    const saved = await processQuestionBatch(inputs, { insert: true });
    const skipped = saved.results.filter((r) => r.status !== "valid").length;
    console.log(`Done: ${saved.insertedCount} questions created${skipped ? `, ${skipped} skipped` : ""}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
