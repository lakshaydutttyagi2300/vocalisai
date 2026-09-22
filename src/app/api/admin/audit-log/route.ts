import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
