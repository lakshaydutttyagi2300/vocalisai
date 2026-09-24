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
