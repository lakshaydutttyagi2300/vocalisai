import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { logAdminAction } from "@/lib/audit-log";
import { attachQuestions, deleteItemGroup, detachQuestions, getItemGroup, updateItemGroup } from "@/lib/item-groups-admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { id } = await params;
  const group = await getItemGroup(id);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(group);
}

// One PATCH for three actions, so the admin screen has one endpoint:
//   { attach: [{ questionId, orderInGroup }] }  - attach questions
//   { detach: [questionId, ...] }               - detach questions
//   { title, text, assetKey, ... }              - edit the group itself
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const action = "attach" in body ? "ATTACH" : "detach" in body ? "DETACH" : "UPDATE";
  const result =
    action === "ATTACH" ? await attachQuestions(id, body.attach) : action === "DETACH" ? await detachQuestions(id, body.detach) : await updateItemGroup(id, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await logAdminAction({
    adminId: admin.adminId,
    adminEmail: admin.adminEmail,
    action: action === "ATTACH" ? "ITEM_GROUP_QUESTIONS_ATTACHED" : action === "DETACH" ? "ITEM_GROUP_QUESTIONS_DETACHED" : "ITEM_GROUP_UPDATED",
    targetType: "ItemGroup",
    targetId: id,
    before: result.before,
    after: result.record,
  });
  return NextResponse.json(result.record);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { id } = await params;

  const result = await deleteItemGroup(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await logAdminAction({
    adminId: admin.adminId,
    adminEmail: admin.adminEmail,
    action: "ITEM_GROUP_DELETED",
    targetType: "ItemGroup",
    targetId: id,
    before: result.before,
  });
  return NextResponse.json({ deleted: true });
}
