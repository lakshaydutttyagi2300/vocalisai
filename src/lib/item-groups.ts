// Validation for ItemGroup (P1-B) - a shared stimulus (a reading passage,
// an audio clip, an image, a chart, a video) that one or more
// PracticeQuestion rows can point at via the new, nullable itemGroupId.
// Same registry-validated-in-TS discipline as practice-taxonomy.ts.

export const ITEM_GROUP_TYPES = ["PASSAGE", "AUDIO", "IMAGE", "CHART", "VIDEO"] as const;
export type ItemGroupType = (typeof ITEM_GROUP_TYPES)[number];

export function isValidItemGroupType(value: string): value is ItemGroupType {
  return (ITEM_GROUP_TYPES as readonly string[]).includes(value);
}

// Which content field a group of this type is expected to carry - used by
// validateItemGroupFields below and by the future admin UI (P1-G) to know
// which inputs to show. Not enforced as a DB constraint (every content
// field stays nullable at the schema level, same reason PracticeQuestion's
// own fields are all optional strings) - enforced here instead.
export const ITEM_GROUP_REQUIRES_TEXT: Record<ItemGroupType, boolean> = {
  PASSAGE: true,
  AUDIO: false,
  IMAGE: false,
  CHART: false,
  VIDEO: false,
};

export const ITEM_GROUP_REQUIRES_ASSET: Record<ItemGroupType, boolean> = {
  PASSAGE: false,
  AUDIO: true,
  IMAGE: true,
  CHART: true,
  VIDEO: true,
};

// P1-D: allowed asset MIME types per ItemGroup type, and a hard size cap.
// AUDIO/VIDEO/IMAGE/CHART all currently share the same size cap (25MB) -
// generous enough for a real listening clip or a scanned diagram without
// letting an admin upload something wildly oversized. Enforced in the
// presign route (src/app/api/admin/item-groups/assets/presign) before a
// signed URL is even minted.
export const ITEM_GROUP_ASSET_MAX_BYTES = 25 * 1024 * 1024;

export const ITEM_GROUP_ASSET_MIME_TYPES: Record<Extract<ItemGroupType, "AUDIO" | "IMAGE" | "CHART" | "VIDEO">, string[]> = {
  AUDIO: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4"],
  IMAGE: ["image/png", "image/jpeg", "image/webp"],
  CHART: ["image/png", "image/jpeg", "image/webp"],
  VIDEO: ["video/mp4", "video/webm"],
};

export function isValidItemGroupAssetMimeType(type: ItemGroupType, mimeType: string): boolean {
  if (type === "PASSAGE") return false; // PASSAGE has no asset, only text
  return ITEM_GROUP_ASSET_MIME_TYPES[type].includes(mimeType);
}

export function extensionForItemGroupAsset(mimeType: string): string {
  const map: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  return map[mimeType] ?? "bin";
}

export interface ItemGroupAssetUploadRequest {
  type: string;
  mimeType: string;
  sizeBytes: number;
}

// Checked BEFORE a presigned URL is minted (or a server-side upload is
// accepted). sizeBytes here is the client's own claim - the /complete
// route re-checks the real stored size afterwards, since a client can
// lie about it (see storage.ts's itemAssetSize comment).
export function validateItemGroupAssetUpload(r: ItemGroupAssetUploadRequest): string | null {
  if (!isValidItemGroupType(r.type)) return `Invalid item group type "${r.type}".`;
  if (r.type === "PASSAGE") return "PASSAGE groups don't take an uploaded asset - use text instead.";
  if (!isValidItemGroupAssetMimeType(r.type, r.mimeType)) {
    return `"${r.mimeType}" isn't an allowed file type for ${r.type} groups.`;
  }
  if (!Number.isFinite(r.sizeBytes) || r.sizeBytes <= 0) return "File size is missing or invalid.";
  if (r.sizeBytes > ITEM_GROUP_ASSET_MAX_BYTES) {
    return `File is too large (max ${Math.round(ITEM_GROUP_ASSET_MAX_BYTES / (1024 * 1024))}MB).`;
  }
  return null;
}

// Keys live under their own "item-groups/" prefix, never "recordings/",
// so candidate recordings and admin-uploaded stimulus can never be
// confused for each other or collide.
export function buildItemGroupAssetKey(assetId: string, mimeType: string): string {
  return `item-groups/${assetId}.${extensionForItemGroupAsset(mimeType)}`;
}

// The /complete route rebuilds what the key must look like from the
// mimeType and checks for an exact shape match - same "never trust a
// client-supplied key" discipline as the recordings complete route.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function isValidItemGroupAssetKey(key: string, mimeType: string): boolean {
  const match = /^item-groups\/([^/.]+)\.([a-z0-9]+)$/.exec(key);
  if (!match) return false;
  return UUID_RE.test(match[1]) && match[2] === extensionForItemGroupAsset(mimeType);
}

export interface ItemGroupFields {
  type: string;
  text?: string | null;
  assetKey?: string | null;
  playLimit?: number | null;
}

export function validateItemGroupFields(f: ItemGroupFields): string | null {
  if (!isValidItemGroupType(f.type)) return `Invalid item group type "${f.type}".`;

  if (ITEM_GROUP_REQUIRES_TEXT[f.type] && (!f.text || f.text.trim().length === 0)) {
    return `${f.type} groups require text content.`;
  }
  if (ITEM_GROUP_REQUIRES_ASSET[f.type] && (!f.assetKey || f.assetKey.trim().length === 0)) {
    return `${f.type} groups require an uploaded asset.`;
  }

  if (f.playLimit != null) {
    if (f.type !== "AUDIO") return "playLimit only applies to AUDIO groups.";
    if (!Number.isInteger(f.playLimit) || f.playLimit < 1) return "playLimit must be a positive integer.";
  }

  return null;
}
