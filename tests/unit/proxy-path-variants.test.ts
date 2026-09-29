import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

// The router resolves a request for "/api/%61dmin/users" (or "/api%2Fadmin/users")
// to the /api/admin/users route - next start looks the path up decoded
// (server/lib/router-utils/filesystem.js getItem), and the proxy matcher is
// tested against the decoded path too (resolve-routes.js). But the proxy's
// own admin-area check sees req.nextUrl.pathname, which stays percent-encoded.
// These cases make sure the admin check can't be sidestepped by encoding.
const jwt = vi.hoisted(() => ({ getToken: vi.fn() }));
vi.mock("next-auth/jwt", () => jwt);

const { proxy } = await import("@/proxy");

const run = Date.now();
const ids = { candidate: "", demoted: "", admin: "" };

function request(rawPath: string) {
  return new NextRequest(new URL(rawPath, "http://localhost"));
}

beforeAll(async () => {
  const make = (key: string, role: string) =>
    db.user.create({ data: { email: `proxy-paths-${key}-${run}@example.test`, passwordHash: "x", name: `proxy paths ${key}`, role } });
  ids.candidate = (await make("candidate", "CANDIDATE")).id;
  ids.demoted = (await make("demoted", "CANDIDATE")).id; // token still says ADMIN
  ids.admin = (await make("admin", "ADMIN")).id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
});

beforeEach(() => {
  jwt.getToken.mockReset();
});

const encodedAdminApis = [
  "/api/%61dmin/users",
  "/api/adm%69n/users",
  "/api%2Fadmin/users",
  "/api%2fadmin/candidates/abc",
  "/%61pi/admin/users",
  "/api/admin%2Fusers",
];
const encodedAdminPages = ["/%61dmin", "/%61dmin/candidates", "/adm%69n/audit-log"];

describe("proxy admin check survives path encoding", () => {
  for (const path of encodedAdminApis) {
    it(`blocks a demoted admin (stale ADMIN token) from ${path}`, async () => {
      jwt.getToken.mockResolvedValue({ id: ids.demoted, role: "ADMIN" });
      const res = await proxy(request(path));
      expect(res.status).toBe(403);
    });
    it(`blocks a candidate from ${path}`, async () => {
      jwt.getToken.mockResolvedValue({ id: ids.candidate, role: "CANDIDATE" });
      const res = await proxy(request(path));
      expect(res.status).toBe(403);
    });
  }

  for (const path of encodedAdminPages) {
    it(`redirects a demoted admin away from the admin page ${path}`, async () => {
      jwt.getToken.mockResolvedValue({ id: ids.demoted, role: "ADMIN" });
      const res = await proxy(request(path));
      expect(res.headers.get("location") ?? "").toContain("/dashboard");
    });
  }

  it("still lets a real admin through encoded and plain admin paths", async () => {
    jwt.getToken.mockResolvedValue({ id: ids.admin, role: "ADMIN" });
    expect((await proxy(request("/api/%61dmin/users"))).status).toBe(200);
    expect((await proxy(request("/api/admin/users/"))).status).toBe(200);
    expect((await proxy(request("/admin/candidates"))).status).toBe(200);
  });

  it("does not treat candidate paths as admin, and survives malformed encoding", async () => {
    jwt.getToken.mockResolvedValue({ id: ids.candidate, role: "CANDIDATE" });
    expect((await proxy(request("/api/practice/attempts"))).status).toBe(200);
    expect((await proxy(request("/dashboard"))).status).toBe(200);
    // "%E0%A4%A" can't be decoded; the router can't decode it either, so it
    // can't resolve to an admin route. Must not throw.
    expect((await proxy(request("/api/practice/%E0%A4%A"))).status).toBe(200);
  });

  it("blocks the plain variants too (trailing slash, dot segments, encoded dots)", async () => {
    jwt.getToken.mockResolvedValue({ id: ids.demoted, role: "ADMIN" });
    for (const path of ["/api/admin/users/", "/api/admin/../admin/users", "/api/x/%2e%2e/admin/users", "/admin/"]) {
      const res = await proxy(request(path));
      if (path.startsWith("/api")) expect(res.status, path).toBe(403);
      else expect(res.headers.get("location") ?? "", path).toContain("/dashboard");
    }
  });

  it("fails closed for a token with no id or an id that no longer exists", async () => {
    jwt.getToken.mockResolvedValue({ id: `missing-${run}`, role: "ADMIN" });
    expect((await proxy(request("/api/admin/users"))).status).toBe(403);
    jwt.getToken.mockResolvedValue({ role: "ADMIN" });
    const res = await proxy(request("/api/admin/users")).catch((e: unknown) => e);
    expect(res instanceof Response ? res.status : "threw").not.toBe(200);
  });
});
