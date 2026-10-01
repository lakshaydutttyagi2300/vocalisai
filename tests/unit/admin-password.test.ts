import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const session = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock("next-auth", () => session);
const { POST } = await import("@/app/api/admin/password/route");

const run = Date.now();
let adminId = "";

const change = (body: unknown) => POST(new Request("http://localhost/api/admin/password", { method: "POST", body: JSON.stringify(body) }));

beforeAll(async () => {
  adminId = (await db.user.create({ data: { email: `pw-admin-${run}@example.test`, name: "PW Admin", role: "ADMIN", passwordHash: await bcrypt.hash("old-password-1", 4) } })).id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: adminId } });
});

describe("admin password change", { timeout: 60_000 }, () => {
  it("refuses non-admins", async () => {
    session.getServerSession.mockResolvedValue({ user: { id: adminId, role: "CANDIDATE" } });
    expect((await change({ currentPassword: "old-password-1", newPassword: "new-password-2" })).status).toBe(403);
  });

  it("needs the right current password and a long enough new one, then changes it", async () => {
    session.getServerSession.mockResolvedValue({ user: { id: adminId, role: "ADMIN", email: "pw@example.test" } });
    const wrong = await change({ currentPassword: "nope", newPassword: "new-password-2" });
    expect(wrong.status).toBe(400);
    expect((await wrong.json()).error).toMatch(/current password/);
    expect((await change({ currentPassword: "old-password-1", newPassword: "short" })).status).toBe(400);
    expect((await change({ currentPassword: "old-password-1", newPassword: "old-password-1" })).status).toBe(400);

    const ok = await change({ currentPassword: "old-password-1", newPassword: "new-password-2" });
    expect(ok.status).toBe(200);
    const { passwordHash } = await db.user.findUniqueOrThrow({ where: { id: adminId } });
    expect(await bcrypt.compare("new-password-2", passwordHash)).toBe(true);
    expect(await db.adminAuditLog.count({ where: { targetId: adminId, action: "ADMIN_PASSWORD_CHANGED" } })).toBe(1);
  });
});
