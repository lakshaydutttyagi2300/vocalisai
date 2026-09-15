import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminCandidateDetail } from "@/lib/admin-stats";
import { PLANS, setPlan, type Plan } from "@/lib/entitlements";

// Role-gated, not ownership-gated: an admin legitimately needs to view any
// candidate's real data here, unlike every other route in this app.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const detail = await getAdminCandidateDetail(id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(detail);
}

// Manually assigns/renews a plan - the only way to grant paid access until
// a real payment processor is wired up. A future billing webhook calls
// setPlan() the exact same way, so this code path doesn't change shape
// when that happens.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const plan = body?.plan as string;
  if (!PLANS.includes(plan as Plan)) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  await setPlan(id, plan as Plan);

  const detail = await getAdminCandidateDetail(id);
  return NextResponse.json(detail);
}
