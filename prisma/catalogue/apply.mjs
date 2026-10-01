// Brings an existing database's exam catalogue in line with content.mjs
// ("sync" in sql.mjs): updates listed rows, replaces listed exams' sections,
// and switches off everything in RETIRED - nothing is deleted. Used for the
// 1 Oct 2026 move to a private-sector hiring catalogue.
//
//   node prisma/catalogue/apply.mjs                  # dev (.env)
//   node prisma/catalogue/apply.mjs --print          # write the SQL to stdout as JSON (for review or the Neon console)
//   node prisma/catalogue/apply.mjs --production     # REQUIRED for the live DB (take a Neon backup branch first)

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertDevDatabase } from "../exam-demo/seed.mjs";
import { catalogueStatements, runCatalogueSql } from "./sql.mjs";

if (process.argv.includes("--print")) {
  console.log(JSON.stringify(catalogueStatements("sync")));
} else {
  const production = process.argv.includes("--production");
  const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: production });
  console.log(`Database: ${host}${production ? "  (PRODUCTION)" : ""}`);
  const db = new PrismaClient();
  try {
    console.log("Active after sync:", await runCatalogueSql(db, "sync"));
  } finally {
    await db.$disconnect();
  }
}
