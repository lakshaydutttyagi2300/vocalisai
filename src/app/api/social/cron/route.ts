import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { buildContext } from "@/lib/social/context";
import { tick } from "@/lib/social/orchestrator";

// The heartbeat. A free scheduler (GitHub Actions, see docs/SOCIAL_AUTOPILOT.md,
// or Vercel Cron) calls this with the shared secret; each call runs due tasks
// for up to ~45 seconds. Safe to call as often as you like or twice at once.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

async function run(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "Autopilot is not set up: CRON_SECRET is missing." }, { status: 503 });
  if (!authorised(req)) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  try {
    const summary = await tick(await buildContext());
    return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Social autopilot tick failed:", err);
    return NextResponse.json({ error: "The autopilot run failed. It will try again on the next run." }, { status: 500 });
  }
}
export const GET = run; // Vercel Cron sends GET
export const POST = run; // GitHub Actions sends POST
