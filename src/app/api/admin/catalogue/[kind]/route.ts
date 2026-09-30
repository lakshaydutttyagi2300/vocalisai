import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { logAdminAction } from "@/lib/audit-log";
import { CatalogAdminError, createItem, KINDS, type Kind } from "@/lib/catalog-admin";

// Creates a category, exam, subject or skill.
export async function POST(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { kind } = await params;
  if (!(KINDS as readonly string[]).includes(kind)) return NextResponse.json({ error: "Unknown catalogue item." }, { status: 404 });

  try {
    const item = await createItem(kind as Kind, await req.json().catch(() => null));
    await logAdminAction({ adminId: admin.adminId, adminEmail: admin.adminEmail, action: "CATALOGUE_CREATED", targetType: kind, targetId: item?.id, after: item });
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof CatalogAdminError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("catalogue: create failed", err);
    return NextResponse.json({ error: "We couldn't save that. Please try again." }, { status: 500 });
  }
}
