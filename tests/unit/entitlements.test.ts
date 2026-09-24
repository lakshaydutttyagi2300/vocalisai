import { afterAll, afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { checkAndRecordUsage, getEffectivePlan, setPlan, PLAN_LIMITS } from "@/lib/entitlements";

const RUN_ID = Date.now();
const createdUserIds: string[] = [];

async function makeUser() {
  const user = await db.user.create({
    data: {
      email: `entitlements-test-${RUN_ID}-${createdUserIds.length}@example.test`,
      passwordHash: "not-a-real-hash",
      name: "Entitlements Test User",
    },
  });
  createdUserIds.push(user.id);
  return user;
}

afterEach(async () => {
  if (createdUserIds.length > 0) {
    // Subscription/UsageEvent cascade-delete with the user (schema.prisma:
    // onDelete: Cascade on both), so deleting the user is enough.
    await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  }
});

afterAll(async () => {
  await db.$disconnect();
});

describe("getEffectivePlan", () => {
  it("lazily creates a FREE subscription for a user with none yet", async () => {
    const user = await makeUser();
    const plan = await getEffectivePlan(user.id);
    expect(plan).toBe("FREE");

    const sub = await db.subscription.findUnique({ where: { userId: user.id } });
    expect(sub?.plan).toBe("FREE");
    expect(sub?.status).toBe("ACTIVE");
  });

  it("treats a paid plan whose period has lapsed as FREE, without deleting the row", async () => {
    const user = await makeUser();
    await setPlan(user.id, "PROFESSIONAL", { periodEnd: new Date(Date.now() - 1000) }); // already expired

    const plan = await getEffectivePlan(user.id);
    expect(plan).toBe("FREE");

    const sub = await db.subscription.findUnique({ where: { userId: user.id } });
    expect(sub?.plan).toBe("PROFESSIONAL"); // row itself untouched
  });

  it("returns the real plan while its period is still active", async () => {
    const user = await makeUser();
    await setPlan(user.id, "STARTER", { periodDays: 30 });

    expect(await getEffectivePlan(user.id)).toBe("STARTER");
  });
});

describe("checkAndRecordUsage", () => {
  it("allows usage up to the plan limit, then blocks without recording further events", async () => {
    const user = await makeUser();
    // FREE.INTERVIEW_SIMULATION limit is 1 - a small, cheap limit to
    // exhaust deterministically without touching a larger one.
    const limit = PLAN_LIMITS.FREE.INTERVIEW_SIMULATION;
    expect(limit).toBe(1);

    const first = await checkAndRecordUsage(user.id, "INTERVIEW_SIMULATION");
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(0);

    const second = await checkAndRecordUsage(user.id, "INTERVIEW_SIMULATION");
    expect(second.allowed).toBe(false);
    expect(second.remaining).toBe(0);

    const events = await db.usageEvent.count({ where: { userId: user.id, feature: "INTERVIEW_SIMULATION" } });
    expect(events).toBe(1); // the blocked attempt never recorded a second event
  });

  it("blocks entirely when the plan's limit for a feature is 0", async () => {
    const user = await makeUser();
    expect(PLAN_LIMITS.FREE.MOCK_ASSESSMENT).toBe(0);

    const result = await checkAndRecordUsage(user.id, "MOCK_ASSESSMENT");
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(0);
  });

  it("gives a higher-plan user a correspondingly higher limit", async () => {
    const user = await makeUser();
    await setPlan(user.id, "PREMIUM", { periodDays: 30 });

    const result = await checkAndRecordUsage(user.id, "MOCK_ASSESSMENT");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(PLAN_LIMITS.PREMIUM.MOCK_ASSESSMENT);
  });
});
