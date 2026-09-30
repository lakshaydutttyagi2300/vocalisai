import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { logAdminAction } from "@/lib/audit-log";
import { CatalogAdminError, deleteItem, KINDS, updateItem, type Kind } from "@/lib/catalog-admin";

type Params = { params: Promise<{ kind: string; id: string }> };

async function kindOf(params: Params["params"]) {
  const { kind, id } = await params;
  return (KINDS as readonly string[]).includes(kind) ? { kind: kind as Kind, id } : null;
}

// Updates a category, exam (including its subjects), subject or skill.
export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const target = await kindOf(params);
  if (!target) return NextResponse.json({ error: "Unknown catalogue item." }, { status: 404 });
  try {
    const body = await req.json().catch(() => null);
    const item = await updateItem(target.kind, target.id, body);
    await logAdminAction({ adminId: admin.adminId, adminEmail: admin.adminEmail, action: "CATALOGUE_EDITED", targetType: target.kind, targetId: target.id, after: body });
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof CatalogAdminError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("catalogue: update failed", err);
    return NextResponse.json({ error: "We couldn't save that. Please try again." }, { status: 500 });
  }
}

// Deletes an unused item; anything in use must be switched off instead.
export async function DELETE(_req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const target = await kindOf(params);
  if (!target) return NextResponse.json({ error: "Unknown catalogue item." }, { status: 404 });
  try {
    await deleteItem(target.kind, target.id);
    await logAdminAction({ adminId: admin.adminId, adminEmail: admin.adminEmail, action: "CATALOGUE_DELETED", targetType: target.kind, targetId: target.id });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof CatalogAdminError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("catalogue: delete failed", err);
    return NextResponse.json({ error: "We couldn't delete that. Please try again." }, { status: 500 });
  }
}
