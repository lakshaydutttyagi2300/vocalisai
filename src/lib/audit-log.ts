// Every administrative mutation (feature toggle, question change, exam
// config change, user account change, settings change) writes one row
// here. Never blocks the actual action if logging fails - an audit trail
// is important, but an admin action must not silently fail because of it.

import { db } from "@/lib/db";

export async function logAdminAction(params: {
  adminId: string;
  adminEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    await db.adminAuditLog.create({
      data: {
        adminId: params.adminId,
        adminEmail: params.adminEmail,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        beforeJson: params.before !== undefined ? JSON.stringify(params.before) : null,
        afterJson: params.after !== undefined ? JSON.stringify(params.after) : null,
      },
    });
  } catch (err) {
    console.error("Failed to write admin audit log:", err);
  }
}
