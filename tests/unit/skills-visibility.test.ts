import { describe, expect, it, vi } from "vitest";

// The hidden categories (COG, DIN, BIZ, DGT) stay out of every candidate
// screen until an admin turns on the "All skill categories" flag - and then
// they really appear. The flag lookup is mocked so this never flips the
// shared test database's real flag under other test files.
const flags = vi.hoisted(() => ({ on: false }));
vi.mock("@/lib/feature-flags", async (orig) => ({
  ...(await orig<typeof import("@/lib/feature-flags")>()),
  isFeatureEnabled: vi.fn(async (key: string) => (key === "skills_all_categories" ? flags.on : true)),
}));

const { findVisibleSkill, visibleSkillWhere } = await import("@/lib/skills/drills");
const { db } = await import("@/lib/db");

describe("skill category visibility", () => {
  it("flag off: only the v1 categories are visible", async () => {
    flags.on = false;
    expect(await findVisibleSkill("QNT.COM.PERCENT")).toBeTruthy();
    expect(await findVisibleSkill("DGT")).toBeNull();
    expect(await findVisibleSkill("COG")).toBeNull();
    const cats = await db.skill.findMany({ where: { depth: 1, ...(await visibleSkillWhere()) }, select: { id: true } });
    expect(cats.map((c) => c.id).sort()).toEqual(["CSV", "ENG", "INV", "QNT", "REA", "SJT", "SPK", "VRB"]);
  });

  it("flag on: every category, including the hidden four, is visible", async () => {
    flags.on = true;
    expect(await findVisibleSkill("DGT")).toBeTruthy();
    const cats = await db.skill.findMany({ where: { depth: 1, ...(await visibleSkillWhere()) }, select: { id: true } });
    expect(cats).toHaveLength(12);
    expect(await findVisibleSkill("NOT.A.SKILL")).toBeNull();
  });
});
