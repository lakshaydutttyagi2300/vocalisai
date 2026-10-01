import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/audit-log";

const bodySchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, "The new password needs at least 8 characters.").max(200, "That password is too long."),
});

// The signed-in admin changes their own password. The current password is
// required, so an unattended open session can't be used to take the account.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Fill in both passwords." }, { status: 400 });
  const { currentPassword, newPassword } = parsed.data;

  const user = await db.user.findUnique({ where: { id: admin.adminId }, select: { passwordHash: true } });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Your current password isn't right." }, { status: 400 });
  }
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    return NextResponse.json({ error: "Choose a password different from your current one." }, { status: 400 });
  }

  await db.user.update({ where: { id: admin.adminId }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  await logAdminAction({ adminId: admin.adminId, adminEmail: admin.adminEmail, action: "ADMIN_PASSWORD_CHANGED", targetType: "User", targetId: admin.adminId });
  return NextResponse.json({ changed: true });
}
