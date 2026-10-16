import { neon } from "@neondatabase/serverless";
import { db, resolveDatabaseUrl } from "@/lib/db";

// The proxy (src/proxy.ts) reads a signed-in user's suspension and role on
// every matched request. On Vercel it runs in the region nearest the visitor
// (Mumbai for India), not next to the database (Neon, us-east-2). From there a
// Prisma lookup first opens a full database connection - 2-3 s measured from
// India - whenever a proxy instance is fresh, which a quiet site hits on most
// clicks. Neon's HTTP driver needs one HTTPS request instead (~0.25 s). It is
// the same fresh read of the same row either way; Prisma remains the fallback
// for a non-Neon database or if the HTTP request fails.
let http: ReturnType<typeof neon> | null = null;
try {
  const url = resolveDatabaseUrl();
  if (url && new URL(url).hostname.endsWith(".neon.tech")) http = neon(url);
} catch {
  http = null;
}

export interface UserAccess {
  isActive: boolean;
  role: string;
}

export async function readUserAccess(id: string): Promise<UserAccess | null> {
  if (http) {
    try {
      const rows = (await http`SELECT "isActive", "role" FROM "User" WHERE "id" = ${id} LIMIT 1`) as UserAccess[];
      return rows[0] ?? null;
    } catch (err) {
      console.error("proxy: user lookup over HTTP failed, using Prisma", err);
    }
  }
  return db.user.findUnique({ where: { id }, select: { isActive: true, role: true } });
}
