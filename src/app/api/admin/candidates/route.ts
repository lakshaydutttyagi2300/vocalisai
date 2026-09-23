import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS, setPlan, type Plan } from "@/lib/entitlements";
import { logAdminAction } from "@/lib/audit-log";
import { getAdminCandidateDetail } from "@/lib/admin-stats";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lets an admin create a test or real account directly, with a starting
// plan/capability set already applied - no self-signup step needed. Reuses
// the exact same password-hashing and setPlan() path as self-signup and the
// existing manual plan-assignment route, so a created account behaves
// identically to one that signed up and was then granted a plan by hand.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const { name, email, password, role, plan } = body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    plan?: string;
  };

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  const targetRole = role === "ADMIN" ? "ADMIN" : "CANDIDATE";
  const targetPlan = (plan ?? "FREE") as Plan;
  if (!PLANS.includes(targetPlan)) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: targetRole,
      profile: { create: {} },
    },
  });

  if (targetPlan !== "FREE") {
    await setPlan(user.id, targetPlan);
  }

  await logAdminAction({
    adminId: session.user.id,
    adminEmail: session.user.email ?? "unknown",
    action: "USER_CREATED_BY_ADMIN",
    targetType: "User",
    targetId: user.id,
    after: { name: user.name, email: user.email, role: targetRole, plan: targetPlan },
  });

  const detail = await getAdminCandidateDetail(user.id);
  return NextResponse.json(detail, { status: 201 });
}
