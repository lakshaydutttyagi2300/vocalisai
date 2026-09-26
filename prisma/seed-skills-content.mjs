// Skills platform - Phase 2 starter content (idempotent; safe to re-run).
// Loads the original Numerical Aptitude, Logical Reasoning and Verbal
// Reasoning questions from prisma/skills-content/ into PracticeQuestion,
// each tagged with its exact skill, level, hint and wrong-answer reasons.
//
// Identity is (source = STARTER_SOURCE, prompt): re-running adds anything
// new and refreshes changed text, but never touches any other question and
// never deletes. A starter question that has been removed from the source
// files is retired (isActive = false), since it may already have attempts.
//
//   npm run seed:skills-content                     # dev (.env)
//   DATABASE_URL=... npm run seed:skills-content    # test / staging
//   npm run seed:skills-content -- --production     # REQUIRED for the live DB

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertDevDatabase } from "./exam-demo/seed.mjs";
import { generatedQuestions } from "./skills-content/generated.mjs";
import { AUTHORED_QUESTIONS } from "./skills-content/authored.mjs";

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

export function starterQuestions() {
  const authored = AUTHORED_QUESTIONS.map((q) => ({ ...q, options: stableShuffle(q.options, q.prompt) }));
  return [...generatedQuestions(), ...authored].map((q) => {
    const category = CATEGORY_FOR_SKILL[q.skillId.split(".")[0]];
    if (!category) throw new Error(`No practice category for skill ${q.skillId}`);
    return {
      category,
      difficulty: difficultyForLevel(q.level),
      type: "MULTIPLE_CHOICE",
      prompt: q.prompt,
      options: JSON.stringify(q.options),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      timeLimitSeconds: q.timeLimitSeconds,
      source: STARTER_SOURCE,
      skillId: q.skillId,
      skillPrecision: "skill",
      skillSource: "author",
      level: q.level,
      format: "mcq_single",
      distractorReasons: JSON.stringify(q.distractorReasons),
      hint: q.hint ?? null,
      bankStatus: "live",
    };
  });
}

const COMPARED = ["category", "difficulty", "options", "correctAnswer", "explanation", "timeLimitSeconds", "skillId", "level", "distractorReasons", "hint"];

export async function seedStarterContent(db, { dryRun = false, log = () => {} } = {}) {
  const rows = starterQuestions();
  const existing = await db.practiceQuestion.findMany({ where: { source: STARTER_SOURCE } });
  const byPrompt = new Map(existing.map((q) => [q.prompt, q]));

  const toCreate = rows.filter((r) => !byPrompt.has(r.prompt));
  const toUpdate = rows.filter((r) => {
    const cur = byPrompt.get(r.prompt);
    return cur && (COMPARED.some((k) => cur[k] !== r[k]) || !cur.isActive);
  });
  const current = new Set(rows.map((r) => r.prompt));
  const toRetire = existing.filter((q) => !current.has(q.prompt) && q.isActive);

  if (!dryRun) {
    if (toCreate.length) await db.practiceQuestion.createMany({ data: toCreate });
    for (const r of toUpdate) {
      const { prompt, source, ...data } = r;
      await db.practiceQuestion.update({ where: { id: byPrompt.get(prompt).id }, data: { ...data, isActive: true } });
    }
    if (toRetire.length) {
      await db.practiceQuestion.updateMany({ where: { id: { in: toRetire.map((q) => q.id) } }, data: { isActive: false, bankStatus: "retired" } });
    }
  }

  const bySkill = {};
  for (const r of rows) bySkill[r.skillId.split(".").slice(0, 2).join(".")] = (bySkill[r.skillId.split(".").slice(0, 2).join(".")] ?? 0) + 1;
  log(`starter questions: ${rows.length} in bank, ${toCreate.length} added, ${toUpdate.length} refreshed, ${toRetire.length} retired`);
  log(`by subcategory: ${Object.entries(bySkill).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  return { total: rows.length, created: toCreate.length, updated: toUpdate.length, retired: toRetire.length };
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
