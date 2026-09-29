import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getAdminCandidateDetail } from "@/lib/admin-stats";
import { z } from "zod";
import { setPlan } from "@/lib/entitlements";
import { PLANS, ROLES } from "@/lib/plans-and-roles";

const candidateUpdateSchema = z.object(
  {
    plan: z.enum(PLANS, { error: "Invalid plan." }).optional(),
    role: z.enum(ROLES, { error: "Invalid role." }).optional(),
    isActive: z.boolean({ error: "isActive must be true or false." }).optional(),
  },
  { error: "Nothing to update." },
);
import { logAdminAction } from "@/lib/audit-log";

// Role-gated, not ownership-gated: an admin legitimately needs to view any
// candidate's real data here, unlike every other route in this app.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

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
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = candidateUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const { plan, role, isActive } = parsed.data;

  if (plan === undefined && role === undefined && isActive === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  // Every check runs before anything is written, so a request that's partly
  // invalid changes nothing. An admin session reaching this route already
  // implies an active admin, so changing your own role or status would only
  // ever be a mistake.
  if (role !== undefined && id === admin.adminId) {
    return NextResponse.json({ error: "You can't change your own role. Ask another admin to do it." }, { status: 400 });
  }
  if (isActive !== undefined && id === admin.adminId) {
    return NextResponse.json({ error: "You can't suspend your own account. Ask another admin to do it." }, { status: 400 });
  }

  if (plan !== undefined) {
    const previousSub = await db.subscription.findUnique({ where: { userId: id } });
    await setPlan(id, plan);
    await logAdminAction({
      adminId: admin.adminId,
      adminEmail: admin.adminEmail,
      action: "USER_PLAN_CHANGED",
      targetType: "User",
      targetId: id,
      before: { plan: previousSub?.plan ?? "FREE" },
      after: { plan },
    });
  }

  if (role !== undefined) {
    await db.user.update({ where: { id }, data: { role } });
    await logAdminAction({
      adminId: admin.adminId,
      adminEmail: admin.adminEmail,
      action: "USER_ROLE_CHANGED",
      targetType: "User",
      targetId: id,
      before: { role: target.role },
      after: { role },
    });
  }

  if (isActive !== undefined) {
    await db.user.update({ where: { id }, data: { isActive } });
    await logAdminAction({
      adminId: admin.adminId,
      adminEmail: admin.adminEmail,
      action: isActive ? "USER_REACTIVATED" : "USER_SUSPENDED",
      targetType: "User",
      targetId: id,
      before: { isActive: target.isActive },
      after: { isActive },
    });
  }

  const detail = await getAdminCandidateDetail(id);
  return NextResponse.json(detail);
}

// Permanent, irreversible delete - every related row (practice attempts,
// recordings, mock test sessions, conversation sessions, coach messages,
// subscription, usage events, password reset tokens) cascades via the
// schema's onDelete: Cascade, so this is one query, not a manual cleanup
// chain. Distinct from suspension (PATCH isActive: false above), which is
// reversible and keeps all data - this is for test accounts or a real
// deletion request, not routine moderation.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (id === admin.adminId) {
    return NextResponse.json({ error: "You can't delete your own account. Ask another admin to do it." }, { status: 400 });
  }

  await logAdminAction({
    adminId: admin.adminId,
    adminEmail: admin.adminEmail,
    action: "USER_DELETED",
    targetType: "User",
    targetId: id,
    before: { name: target.name, email: target.email, role: target.role },
  });

  await db.user.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
