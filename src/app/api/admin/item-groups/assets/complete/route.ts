import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { itemAssetSize, deleteItemAsset } from "@/lib/storage";
import { logAdminAction } from "@/lib/audit-log";
import { ITEM_GROUP_ASSET_MAX_BYTES, isValidItemGroupAssetKey, isValidItemGroupType, isValidItemGroupAssetMimeType } from "@/lib/item-groups";

// Step 2 of the direct-to-R2 upload (P1-D): the client already PUT the
// bytes to the signed URL from /presign - this confirms the object really
// exists and checks its REAL stored size, since the presigned PUT itself
// can't cap size (see storage.ts). An oversized upload is deleted from
// the bucket rather than left behind as an orphan.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key : "";
  const type = typeof body?.type === "string" ? body.type : "";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";

  if (!isValidItemGroupType(type) || type === "PASSAGE" || !isValidItemGroupAssetMimeType(type, mimeType)) {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  if (!isValidItemGroupAssetKey(key, mimeType)) {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const size = await itemAssetSize(key);
  if (size === null) {
    return NextResponse.json({ error: "Upload not found - it may have failed. Please try again." }, { status: 404 });
  }
  if (size > ITEM_GROUP_ASSET_MAX_BYTES) {
    await deleteItemAsset(key);
    return NextResponse.json({ error: "File is too large and was removed." }, { status: 413 });
  }

  await logAdminAction({
    adminId: session.user.id,
    adminEmail: session.user.email ?? "",
    action: "ITEM_GROUP_ASSET_UPLOADED",
    targetType: "ItemGroupAsset",
    targetId: key,
    after: { key, type, mimeType, sizeBytes: size, via: "r2-direct" },
  });

  return NextResponse.json({ assetKey: key, sizeBytes: size });
}
