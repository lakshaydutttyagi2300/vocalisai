// P1-G: validates a mock-test template's OPTIONAL link to the exam
// catalogue. Shared by the template create and update routes.
//   - No examVariantId: a plain template, exactly as before - and then no
//     section may name an examPartId either.
//   - With examVariantId: the version must exist, and every section's
//     examPartId (if given) must be a part of one of THAT version's papers.
// Sections without an examPartId in a linked template are allowed but
// ignored by exam runner v2 (they have no paper to belong to).

import { db } from "@/lib/db";

export async function validateTemplateExamLink(
  examVariantId: string | null,
  sectionPartIds: (string | null)[]
): Promise<string | null> {
  const partIds = sectionPartIds.filter((p): p is string => !!p);

  if (!examVariantId) {
    return partIds.length > 0 ? "Choose an exam format before linking sections to exam parts." : null;
  }

  const variant = await db.examVariant.findUnique({ where: { id: examVariantId } });
  if (!variant) return "That exam format doesn't exist.";

  if (partIds.length > 0) {
    const valid = await db.examPart.findMany({
      where: { id: { in: partIds }, paper: { variantId: examVariantId } },
      select: { id: true },
    });
    const validIds = new Set(valid.map((p) => p.id));
    const badIndex = sectionPartIds.findIndex((p) => p && !validIds.has(p));
    if (badIndex !== -1) return `Section ${badIndex + 1}: that exam part doesn't belong to the chosen exam format.`;
  }
  return null;
}

export function readOptionalId(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
