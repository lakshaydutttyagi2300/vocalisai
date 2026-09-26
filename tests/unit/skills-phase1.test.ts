import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { DIFFICULTIES, PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { ALL_CATEGORIES_FLAG, LEVELS, TAXONOMY, V1_ENABLED_CATEGORIES, skillRows } from "@/lib/skills/taxonomy";
import { LEVEL_FROM_DIFFICULTY, mapLegacyQuestion } from "@/lib/skills/legacy-mapping";
import { DEFAULT_OFF_FEATURES } from "@/lib/feature-flags";
import { GOAL_TRACKS, seedSkills } from "../../prisma/seed-skills.mjs";

// Skills platform, Phase 1: the taxonomy, the legacy mapping, and the seed
// (run against the TEST branch, which already has the Phase 1 migration).

describe("skill taxonomy", () => {
  const rows = skillRows();

  it("has the blueprint's 12 categories, each with subcategories and skills", () => {
    expect(TAXONOMY.map((c) => c.code)).toEqual(["ENG", "SPK", "QNT", "REA", "VRB", "COG", "DIN", "BIZ", "CSV", "SJT", "INV", "DGT"]);
    for (const cat of TAXONOMY) {
      expect(cat.children?.length, cat.code).toBeGreaterThan(0);
      for (const sub of cat.children!) expect(sub.children?.length, `${cat.code}.${sub.code}`).toBeGreaterThan(0);
    }
    expect(rows.filter((r) => r.depth === 1)).toHaveLength(12);
  });

  it("has unique dotted ids, every parent exists and depth matches the id", () => {
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const r of rows) {
      expect(r.id.split(".")).toHaveLength(r.depth);
      if (r.depth === 1) expect(r.parentId).toBeNull();
      else {
        expect(byId.get(r.parentId!), r.id).toBeTruthy();
        expect(r.id.startsWith(`${r.parentId}.`)).toBe(true);
      }
      expect(r.categoryCode).toBe(r.id.split(".")[0]);
    }
  });

  it("enables exactly the v1 categories; the rest stay hidden behind a default-off flag", () => {
    expect([...V1_ENABLED_CATEGORIES].sort()).toEqual(["CSV", "ENG", "INV", "QNT", "REA", "SJT", "SPK", "VRB"]);
    for (const r of rows) expect(r.enabled, r.id).toBe((V1_ENABLED_CATEGORIES as readonly string[]).includes(r.categoryCode));
    expect(DEFAULT_OFF_FEATURES.has(ALL_CATEGORIES_FLAG)).toBe(true);
  });

  it("contains no programming/coding content and no personality testing", () => {
    const text = JSON.stringify(TAXONOMY).toLowerCase();
    for (const banned of ["programming", "python", "java", "data structure", "algorithm", "personality"]) expect(text).not.toContain(banned);
  });

  it("uses the L1-L6 ladder, and every old difficulty maps onto it", () => {
    expect(LEVELS.map((l) => l.level)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const d of DIFFICULTIES) expect(LEVELS.map((l) => l.level)).toContain(LEVEL_FROM_DIFFICULTY[d]);
  });
});

describe("legacy question mapping", () => {
  const ids = new Set(skillRows().map((r) => r.id));
  const enabled = new Set(skillRows().filter((r) => r.enabled).map((r) => r.id));

  it("maps every existing practice category onto an existing, enabled skill node", () => {
    for (const mode of PRACTICE_MODES) {
      const m = mapLegacyQuestion({ category: mode.category, type: mode.questionType });
      expect(m, mode.category).toBeTruthy();
      expect(ids.has(m!.skillId), `${mode.category} -> ${m!.skillId}`).toBe(true);
      expect(enabled.has(m!.skillId), `${mode.category} -> ${m!.skillId} is enabled`).toBe(true);
    }
  });

  it("only claims skill-level precision when the node really is a skill", () => {
    for (const mode of PRACTICE_MODES) {
      for (const type of [mode.questionType, "GAP_FILL", "LONG_WRITING"]) {
        const m = mapLegacyQuestion({ category: mode.category, type });
        if (!m) continue;
        const depth = m.skillId.split(".").length;
        expect({ skill: 3, subcategory: 2, category: 1 }[m.precision], m.skillId).toBe(depth);
      }
    }
  });

  it("goal-track weights only reference real skill nodes", () => {
    for (const t of GOAL_TRACKS) for (const id of Object.keys(t.weights)) expect(ids.has(id), `${t.slug}: ${id}`).toBe(true);
  });
});

describe("Phase 1 seed on the test database", { timeout: 180_000 }, () => {
  const run = Date.now();
  let authored: string | null = null;

  afterAll(async () => {
    if (authored) await db.practiceQuestion.deleteMany({ where: { id: authored } });
  });

  it("is idempotent, never overwrites an existing skill tag, and tags new legacy questions", async () => {
    await seedSkills(db);
    expect(await db.skill.count()).toBe(skillRows().length);

    // An author-tagged question and an untagged legacy one.
    const tagged = await db.practiceQuestion.create({
      data: { category: "GRAMMAR", difficulty: "BEGINNER", type: "MULTIPLE_CHOICE", prompt: `seed-test ${run}`, options: JSON.stringify(["a", "b"]), correctAnswer: "a", timeLimitSeconds: 30, skillId: "ENG.GRM.TENSES", skillPrecision: "skill", skillSource: "author", level: 1 },
    });
    authored = tagged.id;
    const legacy = await db.practiceQuestion.create({
      data: { category: "PRONUNCIATION", difficulty: "EXPERT", type: "SHORT_ANSWER", prompt: `seed-test legacy ${run}`, timeLimitSeconds: 30 },
    });

    // (Other test files run in parallel and create questions too, so totals
    // aren't exact - this checks its own two questions.)
    const second = await seedSkills(db);
    expect(second.mapped).toBeGreaterThanOrEqual(1);
    // Other tests' temporary fixtures use made-up categories (E2E_V2_...),
    // which are correctly reported as unmapped; no REAL category may be.
    const realCategories = new Set(PRACTICE_MODES.map((m) => m.category));
    expect(second.unmapped.filter((u) => realCategories.has(u.split("/")[0]))).toEqual([]);
    const after = await db.practiceQuestion.findMany({ where: { id: { in: [tagged.id, legacy.id] } } });
    const byId = new Map(after.map((q) => [q.id, q]));
    expect(byId.get(tagged.id)).toMatchObject({ skillId: "ENG.GRM.TENSES", skillSource: "author", level: 1 }); // untouched
    expect(byId.get(legacy.id)).toMatchObject({ skillId: "SPK.PRN", skillPrecision: "subcategory", skillSource: "legacy-auto", level: 5 });
    const mappedAt = byId.get(legacy.id)!;
    await db.practiceQuestion.delete({ where: { id: legacy.id } });

    // Re-running changes nothing already tagged.
    await seedSkills(db);
    expect(await db.practiceQuestion.findUniqueOrThrow({ where: { id: tagged.id } })).toMatchObject({ skillId: "ENG.GRM.TENSES", skillSource: "author" });
    expect(mappedAt.skillId).toBe("SPK.PRN");
  });

  it("seeds goal tracks (Campus and Study Abroad hidden) and keeps the existing exams reachable from their tracks", async () => {
    const tracks = await db.goalTrack.findMany({ include: { skills: true }, orderBy: { sortOrder: "asc" } });
    expect(tracks.map((t) => [t.slug, t.enabled])).toEqual([
      ["GENERAL_ENGLISH", true],
      ["BPO_SUPPORT", true],
      ["INTERVIEW_PREP", true],
      ["CAMPUS", false],
      ["STUDY_ABROAD", false],
    ]);
    for (const t of tracks) expect(t.skills.length).toBeGreaterThan(0);

    const bpo = await db.examBlueprint.findUniqueOrThrow({ where: { slug: "bpo-workplace-assessment" }, include: { goalTrack: true } });
    expect(bpo.goalTrack?.slug).toBe("BPO_SUPPORT");
    const template = await db.mockTestTemplate.findFirst({ where: { name: "Workplace Communication Assessment" } });
    expect(bpo.mockTestTemplateId).toBe(template?.id ?? null);
    expect(await db.examBlueprint.count({ where: { kind: "diagnostic" } })).toBe(8);
    expect(await db.rubric.count()).toBeGreaterThanOrEqual(4);
  });

  it("tags past attempts with their question's skill and level", async () => {
    const untagged = await db.practiceAttempt.count({ where: { skillId: null, question: { skillId: { not: null } } } });
    expect(untagged).toBe(0);
  });
});
