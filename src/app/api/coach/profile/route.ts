import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeCoachProfile } from "@/lib/coach-profile";

// Free - pure aggregation of the candidate's own already-persisted
// ScoreReport rows, no AI call. Safe to recompute on every page load.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await computeCoachProfile(session.user.id);
  return NextResponse.json(profile);
}
