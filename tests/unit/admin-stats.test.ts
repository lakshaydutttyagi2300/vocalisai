import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { getAdminUsers } from "@/lib/admin-stats";

// Admin > Candidates paging (NEXT_STEPS item 13): getAdminUsers used to
// findMany() every user (and every ScoreReport/PracticeAttempt row) with
// no take/skip, so response size grew with the whole table. This checks
// the paginated replacement against its own run-scoped throwaway users.

describe("getAdminUsers pagination", () => {
  const marker = `admin-paging-test-${Date.now()}`;
  const ids: string[] = [];

  beforeAll(async () => {
    // Five users, created in order so createdAt desc gives a known order.
    for (let i = 0; i < 5; i++) {
      const u = await db.user.create({
        data: { email: `${marker}-${i}@example.test`, passwordHash: "x", name: `${marker} ${i}` },
      });
      ids.push(u.id);
      await new Promise((r) => setTimeout(r, 5)); // keep createdAt strictly increasing
    }
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: ids } } });
  });

  it("returns total and pages of pageSize, newest first", async () => {
    const p1 = await getAdminUsers({ search: marker, pageSize: 2, page: 1 });
    expect(p1.total).toBe(5);
    expect(p1.users).toHaveLength(2);
    expect(p1.users[0].name).toBe(`${marker} 4`); // newest created first
    expect(p1.users[1].name).toBe(`${marker} 3`);

    const p2 = await getAdminUsers({ search: marker, pageSize: 2, page: 2 });
    expect(p2.users).toHaveLength(2);
    expect(p2.users[0].name).toBe(`${marker} 2`);

    const p3 = await getAdminUsers({ search: marker, pageSize: 2, page: 3 });
    expect(p3.users).toHaveLength(1);
    expect(p3.users[0].name).toBe(`${marker} 0`);

    // Across all three pages, every created user shows up exactly once.
    const seen = [...p1.users, ...p2.users, ...p3.users].map((u) => u.id).sort();
    expect(seen).toEqual([...ids].sort());
  });

  it("clamps pageSize and page to sane bounds", async () => {
    const tooBig = await getAdminUsers({ search: marker, pageSize: 10_000 });
    expect(tooBig.pageSize).toBe(100);

    const zeroPage = await getAdminUsers({ search: marker, page: 0 });
    expect(zeroPage.page).toBe(1);
  });

  it("scopes score/attempt aggregates to the returned page, not the whole table", async () => {
    // A regression guard for the original bug: these two queries used to
    // run unfiltered over every ScoreReport/PracticeAttempt row regardless
    // of which page was requested. A one-user page should only ever touch
    // that one user's data.
    const page = await getAdminUsers({ search: marker, pageSize: 1, page: 1 });
    expect(page.users).toHaveLength(1);
    expect(page.users[0].totalPracticeAttempts).toBe(0);
    expect(page.users[0].mockSessionsCompleted).toBe(0);
  });
});
