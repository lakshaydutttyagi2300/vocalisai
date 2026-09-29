import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { checkAndRecordUsage } from "@/lib/entitlements";

// Plan limits protect paid AI spend, so they must hold when a candidate
// fires several requests at once (tabs, double-clicks, a script). Before
// the per-user+feature lock in checkAndRecordUsage, 8 parallel FREE speech
// analyses got 6 through a limit of 2.
const run = Date.now();
const userIds: string[] = [];

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("checkAndRecordUsage under concurrency", () => {
  it("never allows more than the plan limit, even for parallel requests", async () => {
    const u = await db.user.create({ data: { email: `usage-race-${run}@example.test`, passwordHash: "x", name: "usage race" } });
    userIds.push(u.id);
    // FREE: SPEECH_ANALYSIS = 2 (lifetime).
    const results = await Promise.all(Array.from({ length: 8 }, () => checkAndRecordUsage(u.id, "SPEECH_ANALYSIS")));
    const allowed = results.filter((r) => r.allowed).length;
    const recorded = await db.usageEvent.count({ where: { userId: u.id, feature: "SPEECH_ANALYSIS" } });
    expect({ allowed, recorded }).toEqual({ allowed: 2, recorded: 2 });
    // The allowed ones report the real running count, not a stale one.
    expect(results.filter((r) => r.allowed).map((r) => r.used).sort()).toEqual([1, 2]);
    // A different feature for the same user is not blocked by this one.
    expect((await checkAndRecordUsage(u.id, "PRACTICE_SESSION")).allowed).toBe(true);
  }, 90_000);
});
