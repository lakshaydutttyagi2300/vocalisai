import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { buildTrackPlan, computeReadiness, getUserTrack, pickNextSteps, practiceLinkFor, setUserTrack } from "@/lib/goal-tracks";
import { listMockTestOptions } from "@/lib/mock-test-options";

// Phase 4 - Goal Tracks: readiness maths, next-step order, the goal a
// candidate picks, the plan built for them, and each goal's own exam being
// offered (the BPO exam inside the BPO track). Test database.

const session = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock("next-auth", () => session);

const m = (score: number, band = score >= 90 ? "MASTERED" : score >= 75 ? "PROFICIENT" : score >= 50 ? "DEVELOPING" : "WEAK") => ({ score, band });

describe("goal readiness and next steps", () => {
  it("weights readiness by what matters for the goal, over rated areas only", () => {
    expect(computeReadiness([{ weight: 1, mastery: null }])).toEqual({ readiness: null, coverage: 0 });
    const r = computeReadiness([
      { weight: 1, mastery: m(80) },
      { weight: 0.5, mastery: m(40) },
      { weight: 0.5, mastery: null },
      { weight: 1, mastery: { score: 0, band: "UNRATED" } },
    ]);
    expect(r.readiness).toBe(Math.round((1 * 80 + 0.5 * 40) / 1.5)); // 67
    expect(r.coverage).toBeCloseTo(1.5 / 3);
  });

  it("puts the biggest weighted gaps first, then important areas not tried yet; skips mastered ones", () => {
    const areas = [
      { id: "a", weight: 1, mastery: m(70) }, // gap 30
      { id: "b", weight: 0.5, mastery: m(20) }, // gap 40
      { id: "c", weight: 1, mastery: m(95) }, // mastered - not a next step
      { id: "d", weight: 0.9, mastery: null },
      { id: "e", weight: 0.4, mastery: null },
    ];
    expect(pickNextSteps(areas).map((x) => x.id)).toEqual(["b", "a", "d", "e"]);
    expect(pickNextSteps(areas, 2).map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("sends areas without quick drills to the right practice mode", () => {
    expect(practiceLinkFor("SPK.PRN.READALOUD").href).toBe("/practice/reading");
    expect(practiceLinkFor("SPK.FLU").href).toBe("/practice/fluency");
    expect(practiceLinkFor("SPK").href).toBe("/practice#speaking");
    expect(practiceLinkFor("CSV").href).toBe("/practice/customer-service");
    expect(practiceLinkFor("INV.STR.STAR").href).toBe("/practice/interview");
    expect(practiceLinkFor("ENG.WRT").href).toBe("/practice/writing");
    expect(practiceLinkFor("XYZ").href).toBe("/practice");
  });
});

describe("choosing a goal and the plan built for it (test database)", { timeout: 120_000 }, () => {
  const run = Date.now();
  let userId = "";

  beforeAll(async () => {
    const user = await db.user.create({ data: { email: `goal-${run}@example.test`, passwordHash: "x", name: "Goal Test" } });
    userId = user.id;
    session.getServerSession.mockResolvedValue({ user: { id: userId, email: user.email, role: "CANDIDATE" } });
  }, 60_000);
  afterAll(async () => {
    await db.subscription.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } }); // cascades the profile
  }, 60_000);

  it("only enabled goals can be chosen; the choice is saved on the profile", async () => {
    expect(await getUserTrack(userId)).toBeNull();
    expect(await setUserTrack(userId, "CAMPUS")).toBe(false); // hidden track
    expect(await setUserTrack(userId, "NOPE")).toBe(false);
    expect(await setUserTrack(userId, "BPO_SUPPORT")).toBe(true);
    expect((await getUserTrack(userId))?.slug).toBe("BPO_SUPPORT");
    expect(await setUserTrack(userId, "INTERVIEW_PREP")).toBe(true); // can change any time
    expect((await getUserTrack(userId))?.slug).toBe("INTERVIEW_PREP");
  });

  it("POST /api/goal saves a goal and refuses hidden ones", async () => {
    const { POST } = await import("@/app/api/goal/route");
    const post = (slug: string) => POST(new Request("http://localhost/api/goal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) }));
    expect((await post("STUDY_ABROAD")).status).toBe(400);
    expect((await post("GENERAL_ENGLISH")).status).toBe(200);
    expect((await getUserTrack(userId))?.slug).toBe("GENERAL_ENGLISH");
  });

  it("the BPO plan: its weighted areas, next steps for a new candidate, and the BPO exam inside it", async () => {
    await setUserTrack(userId, "BPO_SUPPORT");
    const track = (await getUserTrack(userId))!;
    const plan = await buildTrackPlan(userId, track);
    expect(plan.readiness).toBeNull(); // nothing rated yet
    expect(plan.areas.map((a) => a.id).sort()).toEqual(["CSV", "ENG.GRM", "ENG.LST", "ENG.VOC", "INV", "SJT", "SPK"]);
    expect(plan.nextSteps).toHaveLength(4);
    expect(plan.nextSteps[0].weight).toBe(1); // most important untried areas first
    for (const a of plan.areas) expect(a.action.href).toMatch(/^\/(skills\/drill|practice)/);
    const workplace = await db.mockTestTemplate.findFirstOrThrow({ where: { name: "Workplace Communication Assessment" } });
    expect(plan.exams[0]).toMatchObject({ name: "Workplace Communication Assessment", href: `/mock-tests?template=${workplace.id}`, kind: "mock" });
    expect(plan.exams.some((e) => e.kind === "interview")).toBe(true);
  });

  it("each goal's exam is offered on the Mock Exams page, labelled with its goal", async () => {
    const options = await listMockTestOptions();
    const general = await db.mockTestTemplate.findFirstOrThrow({ where: { name: "General English Communication Assessment" } });
    expect(options[0].isDefault).toBe(true);
    expect(options.find((o) => o.templateId === general.id)).toMatchObject({ kind: "standard", isDefault: false, trackName: "General English" });
    expect(new Set(options.map((o) => o.templateId)).size).toBe(options.length); // no duplicates
  });
});

describe("plan lookup for a brand-new user", { timeout: 60_000 }, () => {
  it("parallel first requests don't crash creating the free-plan record", async () => {
    const { getEffectivePlan } = await import("@/lib/entitlements");
    const user = await db.user.create({ data: { email: `race-${Date.now()}@example.test`, passwordHash: "x", name: "Race" } });
    try {
      const plans = await Promise.all(Array.from({ length: 6 }, () => getEffectivePlan(user.id)));
      expect(plans).toEqual(Array(6).fill("FREE"));
      expect(await db.subscription.count({ where: { userId: user.id } })).toBe(1);
    } finally {
      await db.subscription.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    }
  });
});
