// Skills platform - question bank content (idempotent; safe to re-run).
// Loads every original question in prisma/skills-content/ into
// PracticeQuestion, each tagged with its exact skill and level:
//   - Numerical Aptitude and Logical Reasoning (computer-generated, answers
//     computed; puzzles checked for a unique answer),
//   - Verbal Reasoning and situational judgement (hand-written MCQs with a
//     reason for every wrong option),
//   - open prompts for read-aloud, fluency, supervisor, conversation,
//     customer-service, interview and writing practice.
//
// Identity is (source = STARTER_SOURCE, prompt + passage): re-running adds
// anything new and refreshes changed text, but never touches any other
// question and never deletes. A bank question removed from the source files
// is retired (isActive = false), since it may already have attempts. A new
// question identical to one already in the bank (from any source) is
// skipped, so candidates never meet two copies of the same question.
//
//   npm run seed:skills-content                     # dev (.env)
//   DATABASE_URL=... npm run seed:skills-content    # test / staging
//   npm run seed:skills-content -- --production     # REQUIRED for the live DB

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertDevDatabase } from "./exam-demo/seed.mjs";
import { generatedQuestions } from "./skills-content/generated.mjs";
import { AUTHORED_QUESTIONS } from "./skills-content/authored.mjs";
import { generatedQntQuestions } from "./skills-content/generated-qnt.mjs";
import { generatedReaQuestions } from "./skills-content/generated-rea.mjs";
import { VERBAL_QUESTIONS } from "./skills-content/authored-verbal.mjs";
import { PROMPT_QUESTIONS } from "./skills-content/authored-prompts.mjs";

export const STARTER_SOURCE = "SKILLS_STARTER";

export const CATEGORY_FOR_SKILL = {
  QNT: "NUMERICAL_APTITUDE",
  REA: "LOGICAL_REASONING",
  VRB: "VERBAL_REASONING",
};

// Blueprint L1-L6 -> the old 4-step difficulty the existing screens use.
export function difficultyForLevel(level) {
  if (level <= 2) return "BEGINNER";
  if (level === 3) return "INTERMEDIATE";
  if (level === 4) return "ADVANCED";
  return "EXPERT";
}

// Stable option order for hand-written questions (their answer is listed
// first in the source). The practice screens shuffle again on every fetch.
function stableShuffle(options, seedText) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return [...options]
    .map((o, i) => ({ o, k: Math.imul(h ^ (i + 1) * 2654435761, 2246822519) >>> 0 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.o);
}

const FORMAT_FOR_CATEGORY = { READING: "read_aloud", WRITING: "written_response" };

/** The identity of a bank question: its prompt plus its passage (several prompts share wording). */
export const bankKey = (q) => `${q.prompt}\u0000${q.passage ?? ""}`;

export function starterQuestions() {
  // Hand-written MCQs list their answer first - give them a stable mixed order.
  const mix = (list) => list.map((q) => (q.options ? { ...q, options: stableShuffle(q.options, q.prompt) } : q));
  const all = [
    ...generatedQuestions(),
    ...mix(AUTHORED_QUESTIONS),
    ...generatedQntQuestions(),
    ...generatedReaQuestions(),
    ...mix(VERBAL_QUESTIONS),
    ...mix(PROMPT_QUESTIONS),
  ];
  const rows = [];
  const seen = new Set();
  for (const q of all) {
    const category = q.category ?? CATEGORY_FOR_SKILL[q.skillId.split(".")[0]];
    if (!category) throw new Error(`No practice category for skill ${q.skillId}`);
    const type = q.type ?? "MULTIPLE_CHOICE";
    const row = {
      category,
      difficulty: q.difficulty ?? difficultyForLevel(q.level),
      type,
      prompt: q.prompt,
      passage: q.passage ?? null,
      options: q.options ? JSON.stringify(q.options) : null,
      correctAnswer: q.correctAnswer ?? null,
      expectedAnswer: q.expectedAnswer ?? null,
      explanation: q.explanation ?? null,
      scoringCriteria: q.scoringCriteria ?? null,
      timeLimitSeconds: q.timeLimitSeconds,
      source: STARTER_SOURCE,
      skillId: q.skillId,
      skillPrecision: "skill",
      skillSource: "author",
      level: q.level,
      format: type === "MULTIPLE_CHOICE" ? "mcq_single" : (FORMAT_FOR_CATEGORY[category] ?? "spoken_response"),
      distractorReasons: q.distractorReasons ? JSON.stringify(q.distractorReasons) : null,
      hint: q.hint ?? null,
      bankStatus: "live",
    };
    const key = bankKey(row);
    if (seen.has(key)) continue; // first copy wins
    seen.add(key);
    rows.push(row);
  }
  return rows;
}

const COMPARED = [
  "category", "difficulty", "type", "passage", "options", "correctAnswer", "expectedAnswer", "explanation",
  "scoringCriteria", "timeLimitSeconds", "skillId", "level", "format", "distractorReasons", "hint",
];

export async function seedStarterContent(db, { dryRun = false, log = () => {} } = {}) {
  const rows = starterQuestions();
  const existing = await db.practiceQuestion.findMany({ where: { source: STARTER_SOURCE } });
  const byKey = new Map(existing.map((q) => [bankKey(q), q]));

  // Questions already in the bank from other sources (seeded, imported,
  // AI-generated) in the same categories - a bank copy of one is skipped.
  const others = await db.practiceQuestion.findMany({
    where: { source: { not: STARTER_SOURCE }, category: { in: [...new Set(rows.map((r) => r.category))] } },
    select: { category: true, prompt: true, passage: true },
  });
  const taken = new Set(others.map((q) => `${q.category}|${bankKey(q)}`));
  const duplicates = rows.filter((r) => !byKey.has(bankKey(r)) && taken.has(`${r.category}|${bankKey(r)}`));
  const dupKeys = new Set(duplicates.map(bankKey));

  const toCreate = rows.filter((r) => !byKey.has(bankKey(r)) && !dupKeys.has(bankKey(r)));
  const toUpdate = rows.filter((r) => {
    const cur = byKey.get(bankKey(r));
    return cur && (COMPARED.some((k) => cur[k] !== r[k]) || !cur.isActive);
  });
  const current = new Set(rows.map(bankKey));
  const toRetire = existing.filter((q) => !current.has(bankKey(q)) && q.isActive);

  if (!dryRun) {
    for (let i = 0; i < toCreate.length; i += 400) {
      await db.practiceQuestion.createMany({ data: toCreate.slice(i, i + 400) });
    }
    for (const r of toUpdate) {
      const { prompt, source, ...data } = r;
      await db.practiceQuestion.update({ where: { id: byKey.get(bankKey(r)).id }, data: { ...data, isActive: true } });
    }
    if (toRetire.length) {
      await db.practiceQuestion.updateMany({ where: { id: { in: toRetire.map((q) => q.id) } }, data: { isActive: false, bankStatus: "retired" } });
    }
  }

  const byCategory = {};
  for (const r of rows) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  log(`bank questions: ${rows.length} in source, ${toCreate.length} added, ${toUpdate.length} refreshed, ${toRetire.length} retired, ${duplicates.length} skipped (already in the bank)`);
  log(`by category: ${Object.entries(byCategory).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  return { total: rows.length, created: toCreate.length, updated: toUpdate.length, retired: toRetire.length, skipped: duplicates.length };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed-skills-content.mjs")) {
  const args = new Set(process.argv.slice(2));
  const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: args.has("--production") });
  console.log(`Database: ${host}${args.has("--production") ? "  (PRODUCTION)" : ""}${args.has("--dry-run") ? "  [dry run]" : ""}`);
  const db = new PrismaClient();
  seedStarterContent(db, { dryRun: args.has("--dry-run"), log: (m) => console.log(`  ${m}`) })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
