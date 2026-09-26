// Skill Drills and category diagnostics (Phase 2). Both serve instantly-
// markable questions for one node of the skill tree, answered through the
// normal /api/practice/attempts route (which marks them, explains wrong
// options and updates mastery). The correct answer never leaves the server.

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getEffectivePlan, PLAN_DIFFICULTY_ACCESS } from "@/lib/entitlements";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { candidateStimulus } from "@/lib/question-stimulus";
import { shuffleArray } from "@/lib/question-selection";
import { ALL_CATEGORIES_FLAG, displayName, V1_ENABLED_CATEGORIES } from "@/lib/skills/taxonomy";

export const DRILL_MIN = 5;
export const DRILL_MAX = 10;
export const DRILL_DEFAULT = 8;
export const DIAGNOSTIC_MAX = 12;

/** Types that are marked instantly (a fixed correct option). */
export const DRILLABLE_TYPES = ["MULTIPLE_CHOICE", "READING_COMPREHENSION", "LISTENING_COMPREHENSION"];

/** Speaking-type categories have no instant marking - "I'm weak in X" sends them to practice. */
export const VOICE_CATEGORY_PRACTICE: Record<string, { href: string; label: string }> = {
  SPK: { href: "/practice#speaking", label: "Speaking practice" },
  CSV: { href: "/practice/customer-service", label: "Customer-service role-play" },
  INV: { href: "/practice/interview", label: "Interview practice" },
};

/**
 * Which skill nodes a candidate may see: the v1 categories (Skill.enabled),
 * or every category once an admin switches on the all-categories flag.
 */
export async function visibleSkillWhere(): Promise<Prisma.SkillWhereInput> {
  if (await isFeatureEnabled(ALL_CATEGORIES_FLAG)) return {};
  return { enabled: true, categoryCode: { in: [...V1_ENABLED_CATEGORIES] } };
}

export async function findVisibleSkill(id: string) {
  return db.skill.findFirst({ where: { id, ...(await visibleSkillWhere()) } });
}

/** The node itself and everything under it. */
export function underNode(nodeId: string): Prisma.PracticeQuestionWhereInput {
  return { OR: [{ skillId: nodeId }, { skillId: { startsWith: `${nodeId}.` } }] };
}

async function disabledLegacyCategories(): Promise<string[]> {
  const off = await db.featureFlag.findMany({ where: { enabled: false }, select: { key: true } });
  return off.map((f) => f.key);
}

/** Live, instantly-markable, not switched off, and at a difficulty the user's plan includes. */
async function drillableFilters(userId: string | null): Promise<Prisma.PracticeQuestionWhereInput[]> {
  const difficulties = userId ? PLAN_DIFFICULTY_ACCESS[await getEffectivePlan(userId)] : undefined;
  return [
    { OR: [{ bankStatus: null }, { bankStatus: "live" }] },
    {
      isActive: true,
      type: { in: DRILLABLE_TYPES },
      correctAnswer: { not: null },
      options: { not: null },
      category: { notIn: await disabledLegacyCategories() },
      ...(difficulties ? { difficulty: { in: difficulties } } : {}),
    },
  ];
}

export async function drillableWhere(nodeId: string, userId: string | null): Promise<Prisma.PracticeQuestionWhereInput> {
  return { AND: [underNode(nodeId), ...(await drillableFilters(userId))] };
}

const QUESTION_SELECT = {
  id: true,
  category: true,
  difficulty: true,
  type: true,
  prompt: true,
  passage: true,
  options: true,
  timeLimitSeconds: true,
  level: true,
  hint: true,
  skillId: true,
} satisfies Prisma.PracticeQuestionSelect;

type PoolQuestion = Prisma.PracticeQuestionGetPayload<{ select: typeof QUESTION_SELECT }>;

export type DrillQuestion = ReturnType<typeof toCandidate>;

// What the browser gets: no correct answer, no explanation, stimulus parsed.
function toCandidate(q: PoolQuestion) {
  return {
    id: q.id,
    category: q.category,
    difficulty: q.difficulty,
    type: q.type,
    prompt: q.prompt,
    ...candidateStimulus(q.passage, q),
    options: q.options ? (shuffleArray(JSON.parse(q.options)) as string[]) : null,
    timeLimitSeconds: q.timeLimitSeconds,
    level: q.level,
    hint: q.hint,
    skillId: q.skillId,
  };
}

async function recentQuestionIds(userId: string, nodeId: string): Promise<string[]> {
  const recent = await db.practiceAttempt.findMany({
    where: { userId, OR: [{ skillId: nodeId }, { skillId: { startsWith: `${nodeId}.` } }] },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { questionId: true, level: true, isCorrect: true },
  });
  return recent.map((a) => a.questionId);
}

/** The level to aim at: half a step above the levels this user recently got right (L2 if new). */
export async function targetLevel(userId: string, nodeId: string): Promise<number> {
  const recent = await db.practiceAttempt.findMany({
    where: { userId, isCorrect: { not: null }, OR: [{ skillId: nodeId }, { skillId: { startsWith: `${nodeId}.` } }] },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { level: true, isCorrect: true },
  });
  const right = recent.filter((a) => a.isCorrect && a.level);
  if (right.length === 0) return 2;
  return right.reduce((s, a) => s + (a.level ?? 2), 0) / right.length + 0.5;
}

/** Drillable question counts for every node (each question counted under its node and all ancestors). */
export async function drillableCountsByNode(userId: string): Promise<Map<string, number>> {
  const where = { AND: [{ skillId: { not: null } }, ...(await drillableFilters(userId))] };
  const groups = await db.practiceQuestion.groupBy({ by: ["skillId"], where, _count: { _all: true } });
  const counts = new Map<string, number>();
  for (const g of groups) {
    if (!g.skillId) continue;
    const parts = g.skillId.split(".");
    for (let i = 1; i <= parts.length; i++) {
      const id = parts.slice(0, i).join(".");
      counts.set(id, (counts.get(id) ?? 0) + g._count._all);
    }
  }
  return counts;
}

export async function countDrillable(nodeId: string, userId: string | null): Promise<number> {
  return db.practiceQuestion.count({ where: await drillableWhere(nodeId, userId) });
}

export async function pickDrill(userId: string, nodeId: string, count: number): Promise<DrillQuestion[]> {
  const pool = await db.practiceQuestion.findMany({ where: await drillableWhere(nodeId, userId), select: QUESTION_SELECT });
  if (pool.length === 0) return [];
  const recent = new Set((await recentQuestionIds(userId, nodeId)).slice(0, Math.max(0, pool.length - count)));
  const target = await targetLevel(userId, nodeId);
  const ranked = pool
    .map((q) => ({ q, rank: (recent.has(q.id) ? 100 : 0) + Math.abs((q.level ?? 3) - target) + Math.random() * 1.5 }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, count)
    .map((r) => r.q)
    // Easiest first, as a warm-up.
    .sort((a, b) => (a.level ?? 3) - (b.level ?? 3));
  return ranked.map(toCandidate);
}

type DiagnosticSection = { name?: string; skillIds: string[]; perSkill: number; levels: number[] };

export async function pickDiagnostic(userId: string, categoryCode: string): Promise<DrillQuestion[]> {
  const blueprint = await db.examBlueprint.findUnique({ where: { slug: `diagnostic-${categoryCode.toLowerCase()}` } });
  if (!blueprint || !blueprint.enabled) return [];
  let sections: DiagnosticSection[] = [];
  try {
    sections = JSON.parse(blueprint.sectionsJson) as DiagnosticSection[];
  } catch {
    sections = [];
  }

  const pool = await db.practiceQuestion.findMany({ where: await drillableWhere(categoryCode, userId), select: QUESTION_SELECT });
  const recent = new Set(await recentQuestionIds(userId, categoryCode));
  const fresh = (list: PoolQuestion[]) => [...shuffleArray(list.filter((q) => !recent.has(q.id))), ...shuffleArray(list.filter((q) => recent.has(q.id)))];

  const chosen: PoolQuestion[] = [];
  const taken = new Set<string>();
  for (const section of sections) {
    for (const nodeId of section.skillIds) {
      const inNode = pool.filter((q) => q.skillId === nodeId || q.skillId?.startsWith(`${nodeId}.`));
      const inLevels = fresh(inNode.filter((q) => q.level !== null && section.levels.includes(q.level)));
      // One question per level first, so a subcategory is probed across its range.
      const oneper = inLevels.filter((q, i, a) => a.findIndex((x) => x.level === q.level) === i);
      let n = 0;
      for (const q of [...oneper, ...inLevels]) {
        if (n >= section.perSkill || chosen.length >= DIAGNOSTIC_MAX) break;
        if (taken.has(q.id)) continue;
        chosen.push(q);
        taken.add(q.id);
        n++;
      }
    }
  }
  // Categories whose questions sit at category level (e.g. older SJT items)
  // still get a real diagnostic: top up from the whole category.
  if (chosen.length < DRILL_MIN) {
    for (const q of fresh(pool)) {
      if (chosen.length >= DRILL_MAX) break;
      if (!taken.has(q.id)) {
        chosen.push(q);
        taken.add(q.id);
      }
    }
  }
  return chosen.sort((a, b) => (a.level ?? 3) - (b.level ?? 3)).map(toCandidate);
}

/** Names for a set of node ids (and their parents), for labelling results. */
export async function skillNames(ids: string[]): Promise<Record<string, string>> {
  const all = new Set<string>();
  for (const id of ids) {
    const parts = id.split(".");
    for (let i = 1; i <= parts.length; i++) all.add(parts.slice(0, i).join("."));
  }
  const rows = await db.skill.findMany({ where: { id: { in: [...all] } }, select: { id: true, name: true } });
  return Object.fromEntries(rows.map((r) => [r.id, displayName(r)]));
}
