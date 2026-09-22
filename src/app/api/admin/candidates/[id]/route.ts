import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminCandidateDetail } from "@/lib/admin-stats";
import { PLANS, setPlan, type Plan } from "@/lib/entitlements";
import { logAdminAction } from "@/lib/audit-log";

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

// Manually assigns/renews a plan and/or changes a user's role. Plan
// assignment is the only way to grant paid access until a real payment
// processor is wired up - a future billing webhook calls setPlan() the
// exact same way, so this code path doesn't change shape when that
// happens. Role changes are how additional admin accounts get created:
// sign up normally as a candidate, then have an existing admin promote
// that account here - no database/script access needed.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const plan = body?.plan as string | undefined;
  const role = body?.role as string | undefined;

  if (plan === undefined && role === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  if (plan !== undefined) {
    if (!PLANS.includes(plan as Plan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }
    const previousSub = await db.subscription.findUnique({ where: { userId: id } });
    await setPlan(id, plan as Plan);
    await logAdminAction({
      adminId: session.user.id,
      adminEmail: session.user.email ?? "unknown",
      action: "USER_PLAN_CHANGED",
      targetType: "User",
      targetId: id,
      before: { plan: previousSub?.plan ?? "FREE" },
      after: { plan },
    });
  }

  if (role !== undefined) {
    if (role !== "ADMIN" && role !== "CANDIDATE") {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    // Never let an admin change their own role here - the only way this
    // route could be reached without an ADMIN session is by already
    // losing admin access, so a self-demotion (or self-anything) is
    // always a mistake, not a legitimate action worth supporting.
    if (id === session.user.id) {
      return NextResponse.json({ error: "You can't change your own role. Ask another admin to do it." }, { status: 400 });
    }
    await db.user.update({ where: { id }, data: { role } });
    await logAdminAction({
      adminId: session.user.id,
      adminEmail: session.user.email ?? "unknown",
      action: "USER_ROLE_CHANGED",
      targetType: "User",
      targetId: id,
      before: { role: target.role },
      after: { role },
    });
  }

  const detail = await getAdminCandidateDetail(id);
  return NextResponse.json(detail);
}
