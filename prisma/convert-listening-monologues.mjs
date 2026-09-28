// One-off, safe to re-run: listening questions whose passage is a plain-text
// monologue (not "S1:/S2:" dialogue - fix-speaker-labels.mjs converts those)
// are turned into the standard audio spec, with the same per-level settings
// as the rest of the bank, so `npm run generate:question-audio` gives them a
// real recording instead of the browser's voice. Candidates see no other
// difference: the passage was already heard, never shown.
//
//   node prisma/convert-listening-monologues.mjs                # preview (dev DB)
//   node prisma/convert-listening-monologues.mjs --apply
//   node prisma/convert-listening-monologues.mjs --apply --production   # live DB
//
// Refuses unknown databases (same guard as the other scripts).

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertDevDatabase } from "./exam-demo/seed.mjs";
import { dialogueToSpec, parseDialogueText } from "./question-audio/speaker-labels.mjs";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: args.has("--production") });
console.log(`Database: ${host}${args.has("--production") ? "  (PRODUCTION)" : ""}${apply ? "" : "  [preview - add --apply to write]"}`);

const db = new PrismaClient();
try {
  const questions = await db.practiceQuestion.findMany({
    where: { OR: [{ category: "LISTENING" }, { type: "LISTENING_COMPREHENSION" }], passage: { not: null } },
    select: { id: true, difficulty: true, prompt: true, passage: true },
  });
  let converted = 0;
  for (const q of questions) {
    const text = q.passage.trim();
    if (!text || text.startsWith("{") || text.startsWith("[") || parseDialogueText(text)) continue; // specs and dialogues are handled elsewhere
    const spec = dialogueToSpec([{ speaker: "S1", text }], q.difficulty);
    spec.audio.convertedFrom = "plain-text monologue";
    console.log(`  ${q.difficulty.padEnd(12)} ${q.prompt.slice(0, 70)}`);
    if (apply) await db.practiceQuestion.update({ where: { id: q.id }, data: { passage: JSON.stringify(spec) } });
    converted++;
  }
  console.log(`${converted} monologue(s) ${apply ? "converted" : "would be converted"}. Next: npm run generate:question-audio${args.has("--production") ? " -- --production" : ""}`);
} finally {
  await db.$disconnect();
}
