import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "@/lib/db";

// The live site went down when DATABASE_URL was removed from the Vercel
// settings while DATABASE_URL_UNPOOLED was still there. The app now falls
// back to the direct address, switched to Neon's pooled host.
describe("database address", () => {
  const direct = "postgresql://user:secret@ep-falling-sound-b4rdr3dg.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

  it("uses DATABASE_URL when it's set (unchanged behaviour)", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "postgresql://a@b/c", DATABASE_URL_UNPOOLED: direct })).toBe("postgresql://a@b/c");
  });

  it("falls back to the direct address, using Neon's pooled host", () => {
    const url = new URL(resolveDatabaseUrl({ DATABASE_URL_UNPOOLED: direct })!);
    expect(url.hostname).toBe("ep-falling-sound-b4rdr3dg-pooler.c-6.us-east-2.aws.neon.tech");
    expect(url.username).toBe("user");
    expect(url.password).toBe("secret");
    expect(url.pathname).toBe("/neondb");
    expect(url.searchParams.get("sslmode")).toBe("require");
  });

  it("leaves an already-pooled or non-Neon address alone, and handles nothing set", () => {
    const pooled = direct.replace("b4rdr3dg.", "b4rdr3dg-pooler.");
    expect(new URL(resolveDatabaseUrl({ DATABASE_URL_UNPOOLED: pooled })!).hostname).toBe("ep-falling-sound-b4rdr3dg-pooler.c-6.us-east-2.aws.neon.tech");
    expect(resolveDatabaseUrl({ DATABASE_URL_UNPOOLED: "postgresql://u:p@db.example.com/x" })).toBe("postgresql://u:p@db.example.com/x");
    expect(resolveDatabaseUrl({})).toBeUndefined();
  });
});
