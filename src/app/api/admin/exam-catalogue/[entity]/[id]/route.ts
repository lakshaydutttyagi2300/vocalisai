import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { logAdminAction } from "@/lib/audit-log";
import {
  ENTITY_AUDIT_NAME,
  ENTITY_TARGET_TYPE,
  deleteCatalogueRecord,
  isCatalogueEntity,
  updateCatalogueRecord,
} from "@/lib/exam-catalogue-admin";

// PATCH/DELETE /api/admin/exam-catalogue/{families|variants|papers|parts}/{id}
export async function PATCH(req: Request, { params }: { params: Promise<{ entity: string; id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { entity, id } = await params;
  if (!isCatalogueEntity(entity)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const result = await updateCatalogueRecord(entity, id, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await logAdminAction({
    adminId: admin.adminId,
    adminEmail: admin.adminEmail,
    action: `${ENTITY_AUDIT_NAME[entity]}_UPDATED`,
    targetType: ENTITY_TARGET_TYPE[entity],
    targetId: id,
    before: result.before,
    after: result.record,
  });
  return NextResponse.json(result.record);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ entity: string; id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { entity, id } = await params;
  if (!isCatalogueEntity(entity)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await deleteCatalogueRecord(entity, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await logAdminAction({
    adminId: admin.adminId,
    adminEmail: admin.adminEmail,
    action: `${ENTITY_AUDIT_NAME[entity]}_DELETED`,
    targetType: ENTITY_TARGET_TYPE[entity],
    targetId: id,
    before: result.before,
  });
  return NextResponse.json({ deleted: true });
}
