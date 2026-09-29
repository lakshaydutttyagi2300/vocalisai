import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

// The login token (JWT) is mocked; the users are real rows in the test
// database, because the proxy's whole job is to trust the database over the
// token for suspension and role.
const jwt = vi.hoisted(() => ({ getToken: vi.fn() }));
vi.mock("next-auth/jwt", () => jwt);

const { proxy } = await import("@/proxy");

const run = Date.now();
const ids: Record<"candidate" | "admin" | "demoted" | "suspended", string> = { candidate: "", admin: "", demoted: "", suspended: "" };

function request(path: string) {
  return new NextRequest(new URL(path, "http://localhost"));
}

function signedInAs(id: string, tokenRole: string) {
  jwt.getToken.mockResolvedValue({ id, role: tokenRole });
}

beforeAll(async () => {
  const make = (key: string, role: string, isActive = true) =>
    db.user.create({ data: { email: `proxy-${key}-${run}@example.test`, passwordHash: "x", name: `proxy ${key}`, role, isActive } });
  ids.candidate = (await make("candidate", "CANDIDATE")).id;
  ids.admin = (await make("admin", "ADMIN")).id;
  ids.demoted = (await make("demoted", "CANDIDATE")).id; // was an admin; demoted after logging in
  ids.suspended = (await make("suspended", "ADMIN", false)).id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
});

beforeEach(() => {
  jwt.getToken.mockReset();
});

describe("proxy", () => {
  it("rejects anonymous API calls with 401 and sends anonymous pages to /login", async () => {
    jwt.getToken.mockResolvedValue(null);
    expect((await proxy(request("/api/practice/attempts"))).status).toBe(401);
    const page = await proxy(request("/dashboard"));
    expect(page.headers.get("location")).toContain("/login");
  });

  it("lets a candidate use candidate pages and APIs", async () => {
    signedInAs(ids.candidate, "CANDIDATE");
    expect((await proxy(request("/dashboard"))).status).toBe(200);
    expect((await proxy(request("/api/practice/attempts"))).status).toBe(200);
  });

  it("blocks a candidate from admin APIs as well as admin pages", async () => {
    signedInAs(ids.candidate, "CANDIDATE");
    expect((await proxy(request("/api/admin/users"))).status).toBe(403);
    expect((await proxy(request("/admin"))).headers.get("location")).toContain("/dashboard");
  });

  it("lets an admin reach admin pages and admin APIs", async () => {
    signedInAs(ids.admin, "ADMIN");
    expect((await proxy(request("/admin/candidates"))).status).toBe(200);
    expect((await proxy(request("/api/admin/users"))).status).toBe(200);
  });

  it("blocks a demoted admin immediately, even though their login token still says ADMIN", async () => {
    signedInAs(ids.demoted, "ADMIN");
    expect((await proxy(request("/api/admin/users"))).status).toBe(403);
    expect((await proxy(request("/admin"))).headers.get("location")).toContain("/dashboard");
  });

  it("blocks a suspended account everywhere and clears its session cookie", async () => {
    signedInAs(ids.suspended, "ADMIN");
    expect((await proxy(request("/api/admin/users"))).status).toBe(403);
    const page = await proxy(request("/dashboard"));
    expect(page.headers.get("location")).toContain("/login?suspended=1");
    expect(page.headers.get("set-cookie") ?? "").toMatch(/session-token=;/);
  });
});
