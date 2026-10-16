import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { readUserAccess } from "@/lib/proxy-user-access";

// The proxy's fast lookup (Neon HTTP) must read exactly what the database
// holds, including a change made a moment ago - suspension and demotion take
// effect on the very next request.
const run = Date.now();
const ids: string[] = [];

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: ids } } });
});

describe("readUserAccess", () => {
  it("returns the stored suspension and role, and follows a change straight away", async () => {
    const user = await db.user.create({ data: { email: `proxy-access-${run}@example.test`, passwordHash: "x", name: "proxy access", role: "ADMIN" } });
    ids.push(user.id);
    expect(await readUserAccess(user.id)).toEqual({ isActive: true, role: "ADMIN" });

    await db.user.update({ where: { id: user.id }, data: { isActive: false, role: "CANDIDATE" } });
    expect(await readUserAccess(user.id)).toEqual({ isActive: false, role: "CANDIDATE" });
  });

  it("returns null for an account that doesn't exist", async () => {
    expect(await readUserAccess(`no-such-user-${run}`)).toBeNull();
  });
});
