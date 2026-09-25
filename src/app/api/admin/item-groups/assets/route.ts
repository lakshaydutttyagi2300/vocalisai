import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { writeRecording } from "@/lib/storage";
import { logAdminAction } from "@/lib/audit-log";
import { buildItemGroupAssetKey, validateItemGroupAssetUpload } from "@/lib/item-groups";

// Through-the-server fallback for admin item-group asset uploads (P1-D),
// used when /presign answers { mode: "server" } because R2 isn't
// configured - the same local-disk fallback the recordings flow already
// has (api/practice/recordings). writeRecording() is reused as-is: despite
// its name it's a generic key -> bytes writer (R2 when configured, local
// disk otherwise), and the key here is under "item-groups/", never
// "recordings/". Unlike the direct-to-R2 path, the size check here is on
// the real bytes the server actually received, not a client claim.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  const type = form.get("type");
  if (!(file instanceof Blob) || typeof type !== "string") {
    return NextResponse.json({ error: "A file and a group type are required." }, { status: 400 });
  }

  const mimeType = file.type;
  const error = validateItemGroupAssetUpload({ type, mimeType, sizeBytes: file.size });
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const key = buildItemGroupAssetKey(crypto.randomUUID(), mimeType);
  await writeRecording(key, Buffer.from(await file.arrayBuffer()), mimeType);

  await logAdminAction({
    adminId: session.user.id,
    adminEmail: session.user.email ?? "",
    action: "ITEM_GROUP_ASSET_UPLOADED",
    targetType: "ItemGroupAsset",
    targetId: key,
    after: { key, type, mimeType, sizeBytes: file.size, via: "server" },
  });

  return NextResponse.json({ assetKey: key, sizeBytes: file.size });
}
