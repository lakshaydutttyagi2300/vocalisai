import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getEffectivePlan } from "@/lib/entitlements";
import { getAdminCandidateDetail } from "@/lib/admin-stats";
import { logAdminAction } from "@/lib/audit-log";

// Resets a user's usage counters for the current period (Free: all time,
// since Free limits never renew), so every allowance - mock exams included -
// is fully available again. Only the counters go; tests, answers and
// results are untouched.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const plan = await getEffectivePlan(id);
  const sub = await db.subscription.findUnique({ where: { userId: id }, select: { currentPeriodStart: true } });
  const since = plan === "FREE" ? new Date(0) : (sub?.currentPeriodStart ?? new Date(0));
  const removed = await db.usageEvent.deleteMany({ where: { userId: id, createdAt: { gte: since } } });

  await logAdminAction({
    adminId: admin.adminId,
    adminEmail: admin.adminEmail,
    action: "USER_USAGE_RESET",
    targetType: "User",
    targetId: id,
    before: { usesThisPeriod: removed.count },
    after: { usesThisPeriod: 0 },
  });
  return NextResponse.json(await getAdminCandidateDetail(id));
}
