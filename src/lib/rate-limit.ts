// Fixed-window rate limiting backed by Postgres (see schema.prisma's note
// on RateLimitHit for why not in-memory). The increment is a single atomic
// upsert - concurrent requests in the same window can't race past the
// limit by both reading a stale count before either writes.

import { db } from "@/lib/db";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitHit" ("id", "key", "windowStart", "count")
    VALUES (gen_random_uuid()::text, ${key}, ${windowStart}, 1)
    ON CONFLICT ("key", "windowStart")
    DO UPDATE SET "count" = "RateLimitHit"."count" + 1
    RETURNING "count"
  `;

  const count = rows[0]?.count ?? 1;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), limit };
}

// Best-effort real client IP on Vercel - x-forwarded-for's first entry is
// the original client, later entries are intermediate proxies. Falls back
// to a constant so a missing header degrades to "everyone shares one
// bucket" rather than throwing, in local dev or any environment that
// doesn't set it.
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
