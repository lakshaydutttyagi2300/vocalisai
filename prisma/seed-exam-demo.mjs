// P1-H: dev-only IELTS-style Academic demo exam. See CHANGES.md
// ("P1-H") for how to try it end to end.
//
//   npm run seed:exam-demo                    # create (skips if it exists)
//   npm run seed:exam-demo -- --make-default  # ...and make it the default mock test
//   npm run seed:exam-demo -- --no-assets     # skip generating audio/charts
//   npm run seed:exam-demo -- --reset         # remove and rebuild
//   npm run seed:exam-demo -- --remove        # remove it
//
// Refuses to run against anything but the dev/test Neon branches
// (exam-demo/seed.mjs's assertDevDatabase) - there is no override.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertDevDatabase, removeExamDemo, seedExamDemo } from "./exam-demo/seed.mjs";
import { buildGroupAsset, canGenerateAssets } from "./exam-demo/assets.mjs";

const args = new Set(process.argv.slice(2));
const log = (msg) => console.log(msg);

const host = assertDevDatabase(process.env.DATABASE_URL);
console.log(`Database: ${host}`);

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
    log("Generating listening recordings and charts (about a minute)...");
  }

  await seedExamDemo(db, { withAssets, makeDefault: args.has("--make-default"), log, buildGroupAsset });
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
