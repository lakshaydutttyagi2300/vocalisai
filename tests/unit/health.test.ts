import { describe, expect, it } from "vitest";

// The release health check: reports whether the database is reachable.
describe("GET /api/health", () => {
  it("is ok when the database answers", async () => {
    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, database: "reachable" });
  });
});
