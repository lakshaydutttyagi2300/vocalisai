import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/audit-log";

const bodySchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(200),
  newEmail: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
});

// The signed-in admin changes the email they sign in with (their username).
// The current password is required, as for a password change.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Fill in both fields." }, { status: 400 });
  const { currentPassword, newEmail } = parsed.data;

  const user = await db.user.findUnique({ where: { id: admin.adminId }, select: { email: true, passwordHash: true } });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Your current password isn't right." }, { status: 400 });
  }
  if (newEmail === user.email.toLowerCase()) {
    return NextResponse.json({ error: "That's already your sign-in email." }, { status: 400 });
  }
  if (await db.user.findFirst({ where: { email: { equals: newEmail, mode: "insensitive" } }, select: { id: true } })) {
    return NextResponse.json({ error: "Another account already uses that email." }, { status: 409 });
  }

  await db.user.update({ where: { id: admin.adminId }, data: { email: newEmail } });
  await logAdminAction({
    adminId: admin.adminId,
    adminEmail: admin.adminEmail,
    action: "ADMIN_EMAIL_CHANGED",
    targetType: "User",
    targetId: admin.adminId,
    before: { email: user.email },
    after: { email: newEmail },
  });
  return NextResponse.json({ changed: true, email: newEmail });
}
