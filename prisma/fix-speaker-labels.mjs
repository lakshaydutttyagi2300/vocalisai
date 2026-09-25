// One-off repair for question-bank content that exposes internal speaker
// ids (S1, S2, ...) to candidates:
//   1. Question text - prompt, options, correct answer, explanation - that
//      says "S2" is rewritten to "the second speaker" (by speaking order in
//      that question's own dialogue). Options and correct answer are
//      rewritten together so marking still matches.
//   2. Listening passages stored as plain-text "S1: ... / S2: ..." dialogue
//      are converted to the standard audio spec (same settings per level as
//      the rest of the bank), ready for `npm run generate:question-audio`.
// Anything it can't rewrite safely (a label that isn't in the dialogue) is
// reported and left untouched.
//
//   node prisma/fix-speaker-labels.mjs               # dev
//   node prisma/fix-speaker-labels.mjs --dry-run     # report only
//   node prisma/fix-speaker-labels.mjs --production  # REQUIRED for the live DB

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertDevDatabase } from "./exam-demo/seed.mjs";
import { dialogueToSpec, parseDialogueText, rewriteSpeakerRefs, speakingOrderOf } from "./question-audio/speaker-labels.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: args.includes("--production") });
console.log(`Database: ${host}${args.includes("--production") ? "  (PRODUCTION)" : ""}${dryRun ? "  [dry run]" : ""}`);

const db = new PrismaClient();
const LABEL = /\bS\s?\d{1,2}\b/;

async function main() {
  const rows = await db.practiceQuestion.findMany({
    where: { category: "LISTENING" },
    select: { id: true, difficulty: true, prompt: true, options: true, correctAnswer: true, explanation: true, passage: true },
  });

  let textFixed = 0;
  let converted = 0;
  const skipped = [];

  for (const q of rows) {
    const data = {};
    const order = speakingOrderOf(q.passage);

    // 1. Question text.
    const fields = ["prompt", "explanation", "correctAnswer"];
    let ok = true;
    for (const f of fields) {
      if (!q[f] || !LABEL.test(q[f])) continue;
      const r = rewriteSpeakerRefs(q[f], order);
      if (r.unknown.length) ok = false;
      else data[f] = r.text;
    }
    if (q.options && LABEL.test(q.options)) {
      try {
        const opts = JSON.parse(q.options);
        const rewritten = opts.map((o) => rewriteSpeakerRefs(o, order));
        if (rewritten.some((r) => r.unknown.length)) ok = false;
        else data.options = JSON.stringify(rewritten.map((r) => r.text));
      } catch {
        ok = false;
      }
    }
    if (!ok) {
      skipped.push(`${q.id}: label not found in its dialogue - "${q.prompt}"`);
      continue;
    }
    if (Object.keys(data).length) textFixed++;

    // 2. Plain-text dialogue -> audio spec.
    const turns = q.passage && !q.passage.trim().startsWith("{") ? parseDialogueText(q.passage) : null;
    if (turns) {
      data.passage = JSON.stringify(dialogueToSpec(turns, q.difficulty));
      converted++;
    }

    if (Object.keys(data).length === 0) continue;
    if (dryRun) {
      if (data.prompt || data.explanation) console.log(`  would fix text: "${q.prompt}" -> "${data.prompt ?? q.prompt}" | explanation -> "${data.explanation ?? q.explanation}"`);
      continue;
    }
    await db.practiceQuestion.update({ where: { id: q.id }, data });
    if (data.prompt || data.explanation) console.log(`  fixed text: "${q.prompt}" -> "${data.prompt ?? q.prompt}"`);
  }

  console.log(`${rows.length} listening questions checked: ${textFixed} with speaker labels in their text ${dryRun ? "would be" : ""} rewritten, ${converted} plain-text dialogues ${dryRun ? "would be" : ""} converted to audio specs.`);
  for (const s of skipped) console.log(`  SKIPPED ${s}`);
  if (converted && !dryRun) console.log("Next: run generate-question-audio.mjs (with the same database) to give the converted dialogues real recordings.");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
