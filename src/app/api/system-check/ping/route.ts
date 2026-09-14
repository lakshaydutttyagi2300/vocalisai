import { NextResponse } from "next/server";

// Deliberately tiny and auth-free, so round-trip time measured against it
// reflects network latency, not database/session overhead. Client times
// the request with performance.now() to get a real measurement - never a
// simulated number.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true });
}
