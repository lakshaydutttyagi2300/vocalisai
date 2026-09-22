import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAllFeatureFlags, isValidFeatureKey } from "@/lib/feature-flags";
import { logAdminAction } from "@/lib/audit-log";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ flags: await getAllFeatureFlags() });
}

// Upserts one flag's enabled state - a flag row only comes into existence
// the first time an admin actually changes it (see feature-flags.ts's
// fail-open default for why that's safe).
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const key = body?.key as string | undefined;
  const enabled = body?.enabled as boolean | undefined;

  if (!key || !isValidFeatureKey(key)) {
    return NextResponse.json({ error: "Invalid feature key." }, { status: 400 });
  }
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be true or false." }, { status: 400 });
  }

  const before = await db.featureFlag.findUnique({ where: { key } });

  const flag = await db.featureFlag.upsert({
    where: { key },
    create: { key, label: key, enabled },
    update: { enabled },
  });

  await logAdminAction({
    adminId: session.user.id,
    adminEmail: session.user.email ?? "unknown",
    action: enabled ? "FEATURE_ENABLED" : "FEATURE_DISABLED",
    targetType: "FeatureFlag",
    targetId: key,
    before: before ? { enabled: before.enabled } : { enabled: true, note: "default (no row existed)" },
    after: { enabled },
  });

  return NextResponse.json({ key: flag.key, enabled: flag.enabled });
}
