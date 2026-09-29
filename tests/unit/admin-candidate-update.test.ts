import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

const session = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock("next-auth", () => session);

const { PATCH } = await import("@/app/api/admin/candidates/[id]/route");

const run = Date.now();
let adminId = "";
let candidateId = "";

function update(id: string, body: unknown) {
  return PATCH(new Request("http://localhost/x", { method: "PATCH", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }), {
    params: Promise.resolve({ id }),
  });
}
const plan = async () => (await db.subscription.findUnique({ where: { userId: candidateId } }))?.plan ?? "FREE";

beforeAll(async () => {
  adminId = (await db.user.create({ data: { email: `upd-admin-${run}@example.test`, passwordHash: "x", name: "Upd Admin", role: "ADMIN" } })).id;
  candidateId = (await db.user.create({ data: { email: `upd-cand-${run}@example.test`, passwordHash: "x", name: "Upd Candidate" } })).id;
});

afterAll(async () => {
  await db.adminAuditLog.deleteMany({ where: { adminId } });
  await db.user.deleteMany({ where: { id: { in: [adminId, candidateId] } } });
});

beforeEach(() => {
  session.getServerSession.mockResolvedValue({ user: { id: adminId, email: `upd-admin-${run}@example.test`, role: "ADMIN" } });
});

describe("PATCH /api/admin/candidates/[id]", () => {
  it("changes nothing when any part of the request is invalid", async () => {
    const res = await update(candidateId, { plan: "PREMIUM", role: "SUPERUSER" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid role.");
    expect(await plan()).toBe("FREE");
  });

  it("rejects wrong types with the same messages the admin page shows", async () => {
    expect((await (await update(candidateId, { isActive: "false" })).json()).error).toBe("isActive must be true or false.");
    expect((await (await update(candidateId, { plan: "GOLD" })).json()).error).toBe("Invalid plan.");
    expect((await (await update(candidateId, {})).json()).error).toBe("Nothing to update.");
    expect((await (await update(candidateId, null)).json()).error).toBe("Nothing to update.");
  });

  it("applies a valid plan and role change together, with audit entries", async () => {
    const res = await update(candidateId, { plan: "STARTER", role: "ADMIN" });
    expect(res.status).toBe(200);
    expect(await plan()).toBe("STARTER");
    expect((await db.user.findUniqueOrThrow({ where: { id: candidateId } })).role).toBe("ADMIN");
    const actions = (await db.adminAuditLog.findMany({ where: { adminId, targetId: candidateId } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["USER_PLAN_CHANGED", "USER_ROLE_CHANGED"]));
  });

  it("won't let an admin demote or suspend themselves", async () => {
    expect((await update(adminId, { role: "CANDIDATE" })).status).toBe(400);
    expect((await update(adminId, { isActive: false })).status).toBe(400);
    expect(await db.user.findUniqueOrThrow({ where: { id: adminId } })).toMatchObject({ role: "ADMIN", isActive: true });
  });
});
