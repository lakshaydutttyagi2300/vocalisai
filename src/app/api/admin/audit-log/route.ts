import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const [total, entries] = await Promise.all([
    db.adminAuditLog.count(),
    db.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize: PAGE_SIZE,
    entries: entries.map((e) => ({
      id: e.id,
      adminEmail: e.adminEmail,
      action: e.action,
      targetType: e.targetType,
      targetId: e.targetId,
      before: e.beforeJson ? JSON.parse(e.beforeJson) : null,
      after: e.afterJson ? JSON.parse(e.afterJson) : null,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
