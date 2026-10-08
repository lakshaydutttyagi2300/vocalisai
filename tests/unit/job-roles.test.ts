import { describe, expect, it } from "vitest";
import { JOB_ROLES, ROLE_GROUPS, stepHref } from "@/lib/job-roles";
import { PRACTICE_MODES } from "@/lib/practice-taxonomy";

describe("job roles", () => {
  it("have unique slugs, a known group and at least four steps", () => {
    expect(new Set(JOB_ROLES.map((r) => r.slug)).size).toBe(JOB_ROLES.length);
    const groups = new Set<string>(ROLE_GROUPS.map((g) => g.id));
    for (const r of JOB_ROLES) {
      expect(groups.has(r.group), r.slug).toBe(true);
      expect(r.steps.length, r.slug).toBeGreaterThanOrEqual(4);
    }
  });

  it("link only to practice modes that exist", () => {
    const modes = new Set(PRACTICE_MODES.map((m) => m.slug));
    for (const r of JOB_ROLES) for (const s of r.steps) if (s.kind === "mode") expect(modes.has(s.slug), `${r.slug}: ${s.slug}`).toBe(true);
  });

  it("build plain internal links", () => {
    for (const r of JOB_ROLES) for (const s of r.steps) expect(stepHref(s)).toMatch(/^\/[a-z-/]+(\?role=[A-Z]+)?$/);
  });
});
