// Skill tags for questions created or edited AFTER the Phase 1 migration -
// admin bulk import, duplicate, AI-generated scenarios, admin edits - so a
// new question shows up in drills, diagnostics and mastery straight away
// instead of waiting for someone to re-run the seed. Same rules as the
// Phase 1 legacy mapping (category/type -> skill node, difficulty -> level).

import { LEVEL_FROM_DIFFICULTY, mapLegacyQuestion } from "@/lib/skills/legacy-mapping";

export interface SkillTags {
  skillId: string | null;
  skillPrecision: string | null;
  skillSource: string | null;
  level: number | null;
}

/** Blueprint level -> the 4-step difficulty (L1-2 Beginner, L3, L4, L5-6 Expert). */
export function difficultyForLevel(level: number): string {
  if (level <= 2) return "BEGINNER";
  if (level === 3) return "INTERMEDIATE";
  if (level === 4) return "ADVANCED";
  return "EXPERT";
}

/** Tags for a brand-new question from its category, type and difficulty. */
export function autoSkillTags(q: { category: string; type: string; difficulty: string }): SkillTags {
  const m = mapLegacyQuestion(q);
  return {
    skillId: m?.skillId ?? null,
    skillPrecision: m?.precision ?? null,
    skillSource: m ? "legacy-auto" : null,
    level: LEVEL_FROM_DIFFICULTY[q.difficulty] ?? null,
  };
}

/**
 * Tags after an admin edit. A hand-set ("author"/"classified") skill is kept;
 * an automatic one follows the new category/type. The level follows the
 * difficulty whenever the two no longer agree.
 */
export function tagsAfterEdit(
  before: SkillTags,
  after: { category: string; type: string; difficulty: string }
): SkillTags {
  const auto = autoSkillTags(after);
  const keepSkill = before.skillId && before.skillSource && before.skillSource !== "legacy-auto";
  const skill = keepSkill ? { skillId: before.skillId, skillPrecision: before.skillPrecision, skillSource: before.skillSource } : { skillId: auto.skillId, skillPrecision: auto.skillPrecision, skillSource: auto.skillSource };
  const level = before.level !== null && difficultyForLevel(before.level) === after.difficulty ? before.level : auto.level;
  return { ...skill, level };
}
