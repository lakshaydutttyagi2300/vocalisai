import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { logAdminAction } from "@/lib/audit-log";
import { ENTITY_AUDIT_NAME, ENTITY_TARGET_TYPE, createCatalogueRecord, isCatalogueEntity } from "@/lib/exam-catalogue-admin";

// POST /api/admin/exam-catalogue/{families|variants|papers|parts}
export async function POST(req: Request, { params }: { params: Promise<{ entity: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { entity } = await params;
  if (!isCatalogueEntity(entity)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const result = await createCatalogueRecord(entity, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await logAdminAction({
    adminId: admin.adminId,
    adminEmail: admin.adminEmail,
    action: `${ENTITY_AUDIT_NAME[entity]}_CREATED`,
    targetType: ENTITY_TARGET_TYPE[entity],
    targetId: String(result.record.id),
    after: result.record,
  });
  return NextResponse.json(result.record, { status: 201 });
}
