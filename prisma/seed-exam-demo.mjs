// IELTS-style Academic practice tests (3 complete, original tests). See
// CHANGES.md ("P1-H" and "Practice tests for students").
//
//   npm run seed:exam-demo                    # create any that are missing
//   npm run seed:exam-demo -- --no-assets     # skip generating audio/charts
//   npm run seed:exam-demo -- --make-default  # dev only: make Practice Test 1 the default mock test
//   npm run seed:exam-demo -- --reset         # remove and rebuild
//   npm run seed:exam-demo -- --remove        # remove them
//   npm run seed:exam-demo -- --production    # REQUIRED to write to the production database
//
// Without --production it refuses anything but the dev/test Neon branches.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertDevDatabase, removeExamDemo, seedExamDemo } from "./exam-demo/seed.mjs";
import { buildGroupAsset, canGenerateAssets } from "./exam-demo/assets.mjs";

const args = new Set(process.argv.slice(2));
const log = (msg) => console.log(msg);
const production = args.has("--production");

const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: production });
console.log(`Database: ${host}${production ? "  (PRODUCTION)" : ""}`);
if (production && args.has("--make-default")) {
  console.error("--make-default is dev-only; on production the tests are offered as extra choices, never as the default.");
  process.exit(1);
}

const db = new PrismaClient();

async function main() {
  if (args.has("--remove") || args.has("--reset")) {
    await removeExamDemo(db, { log });
    if (args.has("--remove")) return;
  }

  const withAssets = !args.has("--no-assets");
  if (withAssets && !canGenerateAssets()) {
    log("Note: audio/chart generation needs Windows - seeding without assets (listening parts will have no recording).");
  } else if (withAssets) {
    log("Generating listening recordings and charts (a few minutes)...");
  }

  const res = await seedExamDemo(db, { withAssets, makeDefault: args.has("--make-default"), log, buildGroupAsset });
  log(`Done: ${res.tests.filter((t) => t.created).length} test(s) created, ${res.questionTotal} questions${res.familyCreated ? " (created the IELTS-style family)" : ""}.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
