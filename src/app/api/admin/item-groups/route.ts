import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { logAdminAction } from "@/lib/audit-log";
import { createItemGroup, listItemGroups } from "@/lib/item-groups-admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  return NextResponse.json({ groups: await listItemGroups() });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const result = await createItemGroup(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await logAdminAction({
    adminId: admin.adminId,
    adminEmail: admin.adminEmail,
    action: "ITEM_GROUP_CREATED",
    targetType: "ItemGroup",
    targetId: String(result.record.id),
    after: result.record,
  });
  return NextResponse.json(result.record, { status: 201 });
}
