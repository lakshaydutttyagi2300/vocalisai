import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

const session = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock("next-auth", () => session);

const { PATCH } = await import("@/app/api/profile/route");

const run = Date.now();
let userId = "";

function patch(body: unknown) {
  return PATCH(new Request("http://localhost/api/profile", { method: "PATCH", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }));
}

beforeAll(async () => {
  userId = (await db.user.create({ data: { email: `profile-${run}@example.test`, passwordHash: "x", name: "Original Name" } })).id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: userId } }); // cascades the profile
});

beforeEach(() => {
  session.getServerSession.mockResolvedValue({ user: { id: userId, email: `profile-${run}@example.test`, role: "CANDIDATE" } });
});

describe("PATCH /api/profile", () => {
  it("saves all three fields, trimmed", async () => {
    const res = await patch({ name: "  Asha Rao ", targetRole: "Support Agent", bio: "Hello" });
    expect(res.status).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).name).toBe("Asha Rao");
    expect(await db.profile.findUniqueOrThrow({ where: { userId } })).toMatchObject({ targetRole: "Support Agent", bio: "Hello" });
  });

  it("changes only the fields that were sent", async () => {
    await patch({ name: "Asha R" });
    expect(await db.profile.findUniqueOrThrow({ where: { userId } })).toMatchObject({ targetRole: "Support Agent", bio: "Hello" });
  });

  it("answers bad input with a 400 and a readable message instead of crashing", async () => {
    for (const body of [{ name: 123 }, { bio: { html: "<b>" } }, { name: "A" }, null, "text"]) {
      const res = await patch(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect((await res.json()).error).toEqual(expect.any(String));
    }
  });

  it("enforces the length limits", async () => {
    const res = await patch({ bio: "x".repeat(2001) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/at most 2000/);
    expect((await db.profile.findUniqueOrThrow({ where: { userId } })).bio).toBe("Hello");
  });
});
