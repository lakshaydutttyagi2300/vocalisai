import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import crypto from "node:crypto";
import { isR2Configured, getPresignedItemAssetUploadUrl } from "@/lib/storage";
import { buildItemGroupAssetKey, validateItemGroupAssetUpload } from "@/lib/item-groups";

// Step 1 of the admin item-group asset upload (P1-D), mirroring
// api/practice/recordings/presign exactly: validate, mint a key and a
// short-lived signed PUT URL. No ItemGroup row is touched here - the
// admin CRUD (P1-G) attaches the confirmed assetKey to a group afterwards.
// Without R2 configured, tells the client to fall back to the
// through-the-server upload route (api/admin/item-groups/assets).
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await req.json().catch(() => null);
  const type = typeof body?.type === "string" ? body.type : "";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";
  const sizeBytes = Number(body?.sizeBytes);

  const error = validateItemGroupAssetUpload({ type, mimeType, sizeBytes });
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ mode: "server" });
  }

  const key = buildItemGroupAssetKey(crypto.randomUUID(), mimeType);
  const uploadUrl = await getPresignedItemAssetUploadUrl(key, mimeType);

  return NextResponse.json({ mode: "direct", key, uploadUrl });
}
