// The Customer Support (BPO) English Assessment: which exam it is, what each
// of its questions measures, and how the 100 points are split. Browser-safe
// (no database). The questions themselves live in the database - pinned to
// this exam's parts and tagged "support:<kind>" - never in this public repo.

export const SUPPORT_FAMILY_SLUG = "CUSTOMER_SERVICE_ENGLISH";
export const SUPPORT_VARIANT_SLUG = "CUSTOMER_SUPPORT_BPO";

export function isSupportAssessment(variant: { slug: string; family: { slug: string } } | null | undefined): boolean {
  return variant?.slug === SUPPORT_VARIANT_SLUG && variant.family.slug === SUPPORT_FAMILY_SLUG;
}

/** What a question measures, from its "support:<kind>" tag. */
export const ITEM_KINDS = [
  "us-listening",
  "uk-listening",
  "repeat",
  "dictation",
  "call-understanding",
  "call-action",
  "grammar",
  "retell",
  "fast-speaking",
  "roleplay",
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const TAG_PREFIX = "support:";

export function itemKindOf(tags: readonly string[]): ItemKind | null {
  for (const t of tags) {
    const kind = t.startsWith(TAG_PREFIX) ? t.slice(TAG_PREFIX.length) : null;
    if (kind && (ITEM_KINDS as readonly string[]).includes(kind)) return kind as ItemKind;
  }
  return null;
}

/** Kinds answered by speaking (a recording). */
export const SPOKEN_KINDS: readonly ItemKind[] = ["repeat", "retell", "fast-speaking", "roleplay"];

/** The owner's split of the 100 points. */
export const COMPONENTS = [
  { key: "listening", label: "Listening", points: 25 },
  { key: "speaking", label: "Speaking", points: 20 },
  { key: "pronunciation", label: "Pronunciation", points: 15 },
  { key: "fluency", label: "Fluency", points: 15 },
  { key: "grammarVocabulary", label: "Grammar & vocabulary", points: 10 },
  { key: "customerHandling", label: "Customer handling", points: 15 },
] as const;
export type ComponentKey = (typeof COMPONENTS)[number]["key"];
