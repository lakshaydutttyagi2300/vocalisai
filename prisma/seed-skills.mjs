// Skills platform - Phase 1 seed + legacy migration (idempotent; safe to re-run).
//   1. Skill tree from src/lib/skills/taxonomy.ts (names/order/enabled kept in sync)
//   2. Rubrics, Goal Tracks (+ skill weights), exam blueprints
//   3. Existing questions -> skillId / level (only where not already set)
//   4. Existing attempts -> skillId / level copied from their question
// Nothing existing is deleted or overwritten: a question that already has a
// skill (classified or author-set) keeps it.
//
//   npm run seed:skills                      # dev (.env)
//   npm run seed:skills -- --dry-run         # report only
//   DATABASE_URL=... npm run seed:skills     # test / staging
//   npm run seed:skills -- --production      # REQUIRED for the live DB

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertDevDatabase } from "./exam-demo/seed.mjs";
import { skillRows } from "../src/lib/skills/taxonomy.ts";
import { LEGACY_CATEGORIES, LEVEL_FROM_DIFFICULTY, mapLegacyQuestion } from "../src/lib/skills/legacy-mapping.ts";

export const RUBRICS = [
  {
    key: "SPEAKING_6D",
    name: "Speaking (6 dimensions)",
    method: "speech_ai",
    dimensions: [
      { key: "pronunciation", label: "Pronunciation", weight: 1 },
      { key: "fluency", label: "Fluency", weight: 1 },
      { key: "grammar", label: "Grammar", weight: 1 },
      { key: "vocabulary", label: "Vocabulary", weight: 1 },
      { key: "content", label: "Content", weight: 1 },
      { key: "intelligibility", label: "Intelligibility", weight: 1 },
    ],
  },
  {
    key: "ROLEPLAY_CALL",
    name: "Customer call role-play",
    method: "hybrid",
    dimensions: [
      { key: "empathy", label: "Empathy", weight: 1 },
      { key: "ownership", label: "Ownership", weight: 1 },
      { key: "clarity", label: "Clarity", weight: 1 },
      { key: "resolution", label: "Resolution", weight: 1 },
    ],
  },
  {
    key: "EMAIL_REPLY",
    name: "Email / written reply",
    method: "rubric_llm",
    dimensions: [
      { key: "task", label: "Task completion", weight: 1 },
      { key: "tone", label: "Tone and register", weight: 1 },
      { key: "organisation", label: "Organisation", weight: 1 },
      { key: "language", label: "Grammar and vocabulary", weight: 1 },
    ],
  },
  {
    key: "INTERVIEW_STAR",
    name: "Interview answer (STAR)",
    method: "hybrid",
    dimensions: [
      { key: "structure", label: "STAR structure", weight: 1 },
      { key: "specificity", label: "Specific example", weight: 1 },
      { key: "relevance", label: "Relevance to the question", weight: 1 },
      { key: "delivery", label: "Spoken delivery", weight: 1 },
    ],
  },
];

// Weights are 0-1 relevance of a skill node (category or subcategory) to the goal.
export const GOAL_TRACKS = [
  {
    slug: "GENERAL_ENGLISH",
    name: "General English",
    description: "Everyday and workplace English - grammar, vocabulary, reading, listening, writing and speaking.",
    enabled: true,
    weights: { ENG: 1, "ENG.GRM": 1, "ENG.VOC": 1, "ENG.RDG": 0.8, "ENG.LST": 0.8, "ENG.WRT": 0.8, SPK: 0.8, VRB: 0.4 },
  },
  {
    slug: "BPO_SUPPORT",
    name: "BPO / Customer Support",
    description: "Voice and accent, customer handling, listening and workplace judgement for support roles.",
    enabled: true,
    weights: { SPK: 1, CSV: 1, "ENG.LST": 0.9, "ENG.GRM": 0.6, "ENG.VOC": 0.6, SJT: 0.7, INV: 0.5 },
  },
  {
    slug: "INTERVIEW_PREP",
    name: "Interview Preparation",
    description: "Answering interview questions clearly and confidently, with strong spoken English.",
    enabled: true,
    weights: { INV: 1, SPK: 0.8, SJT: 0.6, "ENG.GRM": 0.4, VRB: 0.4 },
  },
  {
    slug: "CAMPUS",
    name: "Campus Placement",
    description: "Aptitude (numerical, reasoning, verbal) and interview readiness for campus hiring.",
    enabled: false,
    weights: { QNT: 1, REA: 1, VRB: 0.9, "ENG.GRM": 0.6, "ENG.RDG": 0.6, INV: 0.5 },
  },
  {
    slug: "STUDY_ABROAD",
    name: "Study Abroad",
    description: "Academic English for study abroad - reading, listening, writing and speaking.",
    enabled: false,
    weights: { ENG: 1, "ENG.WRT": 0.9, SPK: 0.9 },
  },
];

// Blueprints that point at EXISTING mock tests (by template name) keep those
// exams reachable from their track; diagnostics are recipes over skills.
export const EXISTING_EXAM_BLUEPRINTS = [
  { slug: "bpo-workplace-assessment", name: "Workplace Communication Assessment", track: "BPO_SUPPORT", template: "Workplace Communication Assessment" },
  { slug: "general-english-assessment", name: "General English Communication Assessment", track: "GENERAL_ENGLISH", template: "General English Communication Assessment" },
];
export const DIAGNOSTIC_CATEGORIES = ["ENG", "SPK", "QNT", "REA", "VRB", "CSV", "SJT", "INV"];

async function main(db, { dryRun, log }) {
  const rows = skillRows();

  // 1. Skill tree (parents first - skillRows() is already ordered that way).
  // Only missing or changed rows are written (one createMany for new rows),
  // so re-runs are fast over a remote database.
  if (!dryRun) {
    const existing = new Map((await db.skill.findMany()).map((s) => [s.id, s]));
    const fields = (r) => ({ code: r.code, name: r.name, depth: r.depth, parentId: r.parentId, categoryCode: r.categoryCode, sortOrder: r.sortOrder, enabled: r.enabled });
    const missing = rows.filter((r) => !existing.has(r.id));
    // Parents before children: createMany in depth order.
    for (const depth of [1, 2, 3]) {
      const batch = missing.filter((r) => r.depth === depth).map((r) => ({ id: r.id, ...fields(r) }));
      if (batch.length) await db.skill.createMany({ data: batch, skipDuplicates: true });
    }
    for (const r of rows) {
      const cur = existing.get(r.id);
      if (!cur) continue;
      const want = fields(r);
      if (Object.entries(want).some(([k, v]) => cur[k] !== v)) await db.skill.update({ where: { id: r.id }, data: want });
    }
  }
  log(`skills: ${rows.length} (${rows.filter((r) => r.depth === 1).length} categories, ${rows.filter((r) => r.depth === 2).length} subcategories, ${rows.filter((r) => r.depth === 3).length} skills); enabled categories: ${rows.filter((r) => r.depth === 1 && r.enabled).map((r) => r.id).join(", ")}`);

  // 2a. Rubrics.
  if (!dryRun) {
    for (const r of RUBRICS) {
      const data = { name: r.name, method: r.method, maxPoints: 100, dimensionsJson: JSON.stringify(r.dimensions) };
      await db.rubric.upsert({ where: { key: r.key }, create: { key: r.key, ...data }, update: data });
    }
  }
  log(`rubrics: ${RUBRICS.map((r) => r.key).join(", ")}`);

  // 2b. Goal tracks + weights.
  const ids = new Set(rows.map((r) => r.id));
  const trackIds = {};
  for (const [i, t] of GOAL_TRACKS.entries()) {
    for (const skillId of Object.keys(t.weights)) if (!ids.has(skillId)) throw new Error(`goal track ${t.slug}: unknown skill ${skillId}`);
    if (dryRun) continue;
    const track = await db.goalTrack.upsert({
      where: { slug: t.slug },
      create: { slug: t.slug, name: t.name, description: t.description, enabled: t.enabled, sortOrder: i + 1 },
      update: { name: t.name, description: t.description, sortOrder: i + 1 }, // enabled is an admin decision once created
    });
    trackIds[t.slug] = track.id;
    const current = new Map((await db.goalTrackSkill.findMany({ where: { goalTrackId: track.id } })).map((w) => [w.skillId, w.weight]));
    const newWeights = Object.entries(t.weights).filter(([skillId]) => !current.has(skillId));
    if (newWeights.length) await db.goalTrackSkill.createMany({ data: newWeights.map(([skillId, weight]) => ({ goalTrackId: track.id, skillId, weight })), skipDuplicates: true });
    for (const [skillId, weight] of Object.entries(t.weights)) {
      if (current.has(skillId) && current.get(skillId) !== weight) {
        await db.goalTrackSkill.update({ where: { goalTrackId_skillId: { goalTrackId: track.id, skillId } }, data: { weight } });
      }
    }
  }
  log(`goal tracks: ${GOAL_TRACKS.map((t) => `${t.slug}${t.enabled ? "" : " (hidden)"}`).join(", ")}`);

  // 2c. Exam blueprints.
  const linked = [];
  if (!dryRun) {
    for (const b of EXISTING_EXAM_BLUEPRINTS) {
      const template = await db.mockTestTemplate.findFirst({ where: { name: b.template }, select: { id: true } });
      const data = { name: b.name, kind: "mock", goalTrackId: trackIds[b.track], mockTestTemplateId: template?.id ?? null, description: "Existing mock test, reachable from its Goal Track." };
      await db.examBlueprint.upsert({ where: { slug: b.slug }, create: { slug: b.slug, ...data }, update: data });
      linked.push(`${b.slug} -> ${template ? "linked" : "TEMPLATE NOT FOUND"}`);
    }
    for (const cat of DIAGNOSTIC_CATEGORIES) {
      const subs = rows.filter((r) => r.depth === 2 && r.categoryCode === cat).map((r) => r.id);
      const sections = [{ name: "Diagnostic", skillIds: subs, perSkill: 2, levels: [2, 3, 4], timeLimitSec: null }];
      const data = { name: `${rows.find((r) => r.id === cat).name} - diagnostic`, kind: "diagnostic", sectionsJson: JSON.stringify(sections) };
      await db.examBlueprint.upsert({ where: { slug: `diagnostic-${cat.toLowerCase()}` }, create: { slug: `diagnostic-${cat.toLowerCase()}`, ...data }, update: data });
    }
  }
  log(`blueprints: ${linked.join("; ")}${linked.length ? "; " : ""}${DIAGNOSTIC_CATEGORIES.length} category diagnostics`);

  // 3. Existing questions -> skill + level (never overwriting an existing tag).
  const groups = await db.practiceQuestion.groupBy({ by: ["category", "type"], where: { skillId: null }, _count: true });
  let mapped = 0;
  const unmapped = [];
  for (const g of groups) {
    const m = mapLegacyQuestion(g);
    if (!m || !ids.has(m.skillId)) {
      unmapped.push(`${g.category}/${g.type} (${g._count})`);
      continue;
    }
    if (!dryRun) {
      const res = await db.practiceQuestion.updateMany({
        where: { category: g.category, type: g.type, skillId: null },
        data: { skillId: m.skillId, skillPrecision: m.precision, skillSource: "legacy-auto" },
      });
      mapped += res.count;
    } else mapped += g._count;
  }
  let leveled = 0;
  for (const [difficulty, level] of Object.entries(LEVEL_FROM_DIFFICULTY)) {
    if (dryRun) leveled += await db.practiceQuestion.count({ where: { difficulty, level: null } });
    else leveled += (await db.practiceQuestion.updateMany({ where: { difficulty, level: null }, data: { level } })).count;
  }
  log(`questions: ${mapped} mapped to a skill node, ${leveled} given a level${unmapped.length ? `; UNMAPPED: ${unmapped.join(", ")}` : "; none unmapped"}`);

  // 4. Existing attempts -> skill/level of their question.
  let attempts = 0;
  if (!dryRun) {
    attempts = await db.$executeRawUnsafe(
      `UPDATE "PracticeAttempt" a SET "skillId" = q."skillId", "level" = q."level"
       FROM "PracticeQuestion" q
       WHERE a."questionId" = q.id AND a."skillId" IS NULL AND q."skillId" IS NOT NULL`
    );
  }
  log(`attempts: ${attempts} tagged with their question's skill`);

  const precision = dryRun ? [] : await db.practiceQuestion.groupBy({ by: ["skillPrecision"], _count: true });
  if (precision.length) log(`precision: ${precision.map((p) => `${p.skillPrecision ?? "none"}=${p._count}`).join(", ")}`);
  return { skills: rows.length, mapped, leveled, unmapped, attempts, legacyCategories: LEGACY_CATEGORIES.length };
}

export async function seedSkills(db, opts = {}) {
  return main(db, { dryRun: false, log: () => {}, ...opts });
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/").replace(/^([A-Za-z]):/, "/$1:")}` || process.argv[1]?.endsWith("seed-skills.mjs")) {
  const args = new Set(process.argv.slice(2));
  const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: args.has("--production") });
  console.log(`Database: ${host}${args.has("--production") ? "  (PRODUCTION)" : ""}${args.has("--dry-run") ? "  [dry run]" : ""}`);
  const db = new PrismaClient();
  main(db, { dryRun: args.has("--dry-run"), log: (m) => console.log(`  ${m}`) })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
