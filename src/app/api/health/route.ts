import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public, read-only health check: can this deployment reach its database?
// Used right after every release - signed-out smoke checks can't see a
// missing database connection (sign-in pages don't touch the database),
// which is how a removed DATABASE_URL went unnoticed on 26 Sep 2026.
// Returns no details beyond ok / not ok.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "reachable" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, database: "unreachable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
