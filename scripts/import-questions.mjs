// Loads a question CSV (the Admin import format, any number of rows) through
// the same importQuestions() the Admin import page uses, one subject at a
// time in batches of at most IMPORT_MAX_ROWS (2,000).
//
//   node scripts/import-questions.mjs <file.csv>                 # check only (dry run), dev database (.env)
//   node scripts/import-questions.mjs <file.csv> --save          # check, then save
//   DATABASE_URL=... node scripts/import-questions.mjs <file.csv> --save --production   # REQUIRED for the live DB
//
// Every batch is checked first; nothing is saved unless every batch passes.
// Rows already in the bank ("Already in the question bank") are skipped, so
// re-running after a partial load is safe and never saves a question twice.
// Additive only: it creates questions and never changes or deletes one.

import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createJiti } from "jiti";
import { assertDevDatabase } from "../prisma/exam-demo/seed.mjs";

/** RFC 4180 CSV: quoted cells may hold commas, quotes ("") and line breaks. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim()));
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const save = args.includes("--save");
  const production = args.includes("--production");
  if (!file) throw new Error("Usage: node scripts/import-questions.mjs <file.csv> [--save] [--production]");

  const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: production });
  console.log(`Database: ${host}${production ? "  (PRODUCTION)" : ""}  ·  ${save ? "check, then save" : "check only (dry run)"}`);

  const jiti = createJiti(import.meta.url, { alias: { "@/": `${resolve("src").replace(/\\/g, "/")}/` } });
  const { importQuestions, IMPORT_COLUMNS, IMPORT_MAX_ROWS } = await jiti.import("../src/lib/catalog-admin.ts");
  const { db } = await jiti.import("../src/lib/db.ts");

  const [header, ...body] = parseCsv(readFileSync(file, "utf8"));
  const missing = IMPORT_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);
  // Keep each row's line number in the file (header = row 1) for error reports.
  const rows = body.map((cells, i) => ({ line: i + 2, data: Object.fromEntries(header.map((h, k) => [h, cells[k] ?? ""])) }));
  console.log(`${rows.length} rows read from ${file}`);

  // One batch per subject (split further if a subject has over 2,000 rows), in file order.
  const batches = [];
  for (const r of rows) {
    const subject = r.data.subject.trim().toLowerCase();
    let last = batches.at(-1);
    if (!last || last.subject !== subject || last.rows.length >= IMPORT_MAX_ROWS) batches.push((last = { subject, rows: [] }));
    last.rows.push(r);
  }

  try {
    // 1. Check everything first; drop rows already in the bank.
    let blocked = false;
    for (const b of batches) {
      const original = b.rows;
      const result = await importQuestions(original.map((r) => r.data), true);
      const already = new Set(result.errors.filter((e) => e.message === "Already in the question bank.").map((e) => e.row));
      const other = result.errors.filter((e) => e.message !== "Already in the question bank.");
      b.skipped = already.size;
      b.rows = original.filter((_, i) => !already.has(i + 2));
      console.log(`  ${b.subject.padEnd(24)} ${String(result.total).padStart(5)} rows · ${String(b.rows.length).padStart(5)} new · ${String(b.skipped).padStart(4)} already loaded · ${other.length} problems`);
      for (const e of other.slice(0, 10)) console.log(`      line ${original[e.row - 2]?.line ?? "?"}: ${e.message}`);
      if (other.length) blocked = true;
    }
    if (blocked) throw new Error("Some rows have problems (listed above). Nothing was saved.");
    if (!save) return console.log("Check passed. Nothing was saved (dry run). Add --save to load.");

    // 2. Save, batch by batch (each batch re-checked by importQuestions itself).
    let created = 0;
    for (const b of batches) {
      if (!b.rows.length) continue;
      const result = await importQuestions(b.rows.map((r) => r.data), false);
      if (result.errors.length) throw new Error(`${b.subject}: ${result.errors.length} rows failed on save (${result.errors[0].message}). Earlier batches were saved; re-run to continue.`);
      created += result.created;
      console.log(`  saved ${String(result.created).padStart(5)}  ${b.subject}`);
    }
    console.log(`Done: ${created} questions created.`);
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1]?.endsWith("import-questions.mjs")) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
