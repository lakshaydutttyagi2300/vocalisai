import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

// GET /api/admin/users with odd paging input: never a 500, always whole
// numbers back, and totals that stay right while searching and paging.
const session = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock("next-auth", () => session);

const { GET } = await import("@/app/api/admin/users/route");

const tag = `admin-paging-${Date.now()}`;
const ids: string[] = [];

beforeAll(async () => {
  session.getServerSession.mockResolvedValue({ user: { id: "admin_x", email: "a@example.test", role: "ADMIN" } });
  for (let i = 0; i < 5; i++) {
    ids.push((await db.user.create({ data: { email: `${tag}-${i}@example.test`, passwordHash: "x", name: `${tag} ${i}` } })).id);
  }
}, 60_000);
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: ids } } });
});

async function get(qs: string) {
  const res = await GET(new Request(`http://localhost/api/admin/users?search=${tag}&${qs}`));
  return { status: res.status, body: res.status === 200 ? await res.json() : null };
}

describe("admin users paging", () => {
  const cases: [string, number, number][] = [
    ["page=Infinity", 1, 25],
    ["page=1e400", 1, 25], // parses to Infinity
    ["page=1e300", 1_000_000, 25],
    ["page=1.5", 1, 25],
    ["pageSize=2.5", 1, 2],
    ["page=-1", 1, 25],
    ["page=0", 1, 25],
    ["page=abc&pageSize=x", 1, 25],
    ["pageSize=0", 1, 25],
    ["pageSize=1000", 1, 100],
  ];
  for (const [qs, page, pageSize] of cases) {
    it(`${qs} -> page ${page}, pageSize ${pageSize}`, async () => {
      const r = await get(qs);
      expect(r.status).toBe(200);
      expect({ page: r.body.page, pageSize: r.body.pageSize, total: r.body.total }).toEqual({ page, pageSize, total: 5 });
    });
  }

  it("keeps the total right when searching and paging together, and pages past the end are empty", async () => {
    const pages = await Promise.all([1, 2, 3, 4].map((p) => get(`page=${p}&pageSize=2`)));
    expect(pages.map((p) => p.body.users.length)).toEqual([2, 2, 1, 0]);
    expect(pages.every((p) => p.body.total === 5)).toBe(true);
    const seen = new Set(pages.flatMap((p) => p.body.users.map((u: { id: string }) => u.id)));
    expect(seen.size).toBe(5);
  });
});
