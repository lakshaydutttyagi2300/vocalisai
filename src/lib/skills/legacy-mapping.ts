// Maps an existing (pre-taxonomy) question onto the skill tree. Deterministic
// and conservative: it only goes as deep as the old data can support. Every
// old category maps to a category/subcategory; an exact skill is assigned
// only where the old category is unambiguous (e.g. read-aloud questions ->
// SPK.PRN.READALOUD). Finer skills for the rest come from a separate,
// reviewed classification pass - never guessed here.

export type MappingPrecision = "skill" | "subcategory" | "category";

export interface LegacyMapping {
  skillId: string;
  precision: MappingPrecision;
  note?: string;
}

const BY_CATEGORY: Record<string, LegacyMapping> = {
  GRAMMAR: { skillId: "ENG.GRM", precision: "subcategory" },
  VOCABULARY: { skillId: "ENG.VOC", precision: "subcategory" },
  READING_COMPREHENSION: { skillId: "ENG.RDG", precision: "subcategory" },
  LISTENING: { skillId: "ENG.LST", precision: "subcategory" },
  WRITING: { skillId: "ENG.WRT", precision: "subcategory" },
  // "READING" in the old taxonomy is read-aloud (a voice task), not reading comprehension.
  READING: { skillId: "SPK.PRN.READALOUD", precision: "skill" },
  PRONUNCIATION: { skillId: "SPK.PRN", precision: "subcategory" },
  FLUENCY: { skillId: "SPK.FLU", precision: "subcategory" },
  SPEAKING: { skillId: "SPK.SPN", precision: "subcategory" },
  CONVERSATION_PARTNER: { skillId: "SPK.INT.ROLEPLAY", precision: "skill" },
  CUSTOMER_SERVICE: { skillId: "CSV", precision: "category" },
  INTERVIEW: { skillId: "INV", precision: "category" },
  SITUATIONAL_JUDGEMENT: { skillId: "SJT", precision: "category" },
  SUPERVISOR: { skillId: "SJT", precision: "category", note: "supervisor conversations filed under workplace behaviour" },
  // Phase 2 categories - their own questions carry exact skill ids; this is
  // only the fallback for one an admin adds without choosing a skill.
  NUMERICAL_APTITUDE: { skillId: "QNT", precision: "category" },
  LOGICAL_REASONING: { skillId: "REA", precision: "category" },
  VERBAL_REASONING: { skillId: "VRB", precision: "category" },
};

// Type-level refinements where the old question type pins down the skill.
const BY_TYPE: Record<string, Record<string, LegacyMapping>> = {
  WRITING: { LONG_WRITING: { skillId: "ENG.WRT.ESSAY", precision: "skill" } },
  LISTENING: { GAP_FILL: { skillId: "ENG.LST.NOTES", precision: "skill" } },
  READING_COMPREHENSION: { GAP_FILL: { skillId: "ENG.RDG.CLOZE", precision: "skill" } },
};

export function mapLegacyQuestion(q: { category: string; type: string }): LegacyMapping | null {
  return BY_TYPE[q.category]?.[q.type] ?? BY_CATEGORY[q.category] ?? null;
}

// Old 4-step difficulty -> blueprint L1-L6 ladder.
export const LEVEL_FROM_DIFFICULTY: Record<string, number> = {
  BEGINNER: 2,
  INTERMEDIATE: 3,
  ADVANCED: 4,
  EXPERT: 5,
};

export const LEGACY_CATEGORIES = Object.keys(BY_CATEGORY);
