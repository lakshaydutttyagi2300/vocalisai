import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUsageSummary } from "@/lib/entitlements";

// A candidate's own usage/plan - the self-serve counterpart to the admin
// candidate-detail route, scoped to the caller only (never takes an id).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const usage = await getUsageSummary(session.user.id);
  return NextResponse.json(usage);
}
