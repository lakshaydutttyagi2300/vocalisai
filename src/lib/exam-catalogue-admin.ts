// P1-G: create / update / delete for the exam catalogue (ExamFamily ->
// ExamVariant -> ExamPaper -> ExamPart). Routes stay thin; every rule
// lives here so it can be tested directly.
//
// Delete safety: the database would silently SET NULL a template's
// examVariantId / a section's examPartId when their target is deleted
// (see the exam_catalogue migration) - quietly turning an exam template
// back into a plain one. Instead, deleting anything still referenced by a
// mock-test template is refused with a clear message; the admin unlinks
// the template first. Unreferenced deletes cascade downward as before.
//
// Already-running v2 exams are unaffected either way: each session's plan
// (ExamSessionState.planJson) copied the paper names/durations/rules at
// start and never re-reads the catalogue.

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  EXAM_FAMILY_SEED,
  validateExamFamilyFields,
  validateExamPaperFields,
  validateExamPartFields,
  validateExamVariantFields,
} from "@/lib/exam-catalogue";

export const CATALOGUE_ENTITIES = ["families", "variants", "papers", "parts"] as const;
export type CatalogueEntity = (typeof CATALOGUE_ENTITIES)[number];

export function isCatalogueEntity(value: string): value is CatalogueEntity {
  return (CATALOGUE_ENTITIES as readonly string[]).includes(value);
}

export const ENTITY_AUDIT_NAME: Record<CatalogueEntity, string> = {
  families: "EXAM_FAMILY",
  variants: "EXAM_VARIANT",
  papers: "EXAM_PAPER",
  parts: "EXAM_PART",
};

export const ENTITY_TARGET_TYPE: Record<CatalogueEntity, string> = {
  families: "ExamFamily",
  variants: "ExamVariant",
  papers: "ExamPaper",
  parts: "ExamPart",
};

export type AdminResult =
  | { ok: true; record: Record<string, unknown>; before?: Record<string, unknown> }
  | { ok: false; status: number; error: string };

type Body = Record<string, unknown>;

const str = (v: unknown): string | undefined => (typeof v === "string" ? v.trim() : undefined);
const optStr = (v: unknown): string | null | undefined => (v === null ? null : typeof v === "string" ? (v.trim() || null) : undefined);
const optInt = (v: unknown): number | null | undefined =>
  v === null || v === "" ? null : typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : undefined;
const optBool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);

function fail(status: number, error: string): AdminResult {
  return { ok: false, status, error };
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

async function nextOrder(entity: "papers" | "parts", parentId: string): Promise<number> {
  const agg =
    entity === "papers"
      ? await db.examPaper.aggregate({ where: { variantId: parentId }, _max: { order: true } })
      : await db.examPart.aggregate({ where: { paperId: parentId }, _max: { order: true } });
  return (agg._max.order ?? 0) + 1;
}

// How many templates/sections point into this record's subtree.
export async function referenceCount(entity: CatalogueEntity, id: string): Promise<{ templates: number; sections: number }> {
  switch (entity) {
    case "parts":
      return { templates: 0, sections: await db.mockTestTemplateSection.count({ where: { examPartId: id } }) };
    case "papers":
      return { templates: 0, sections: await db.mockTestTemplateSection.count({ where: { examPart: { paperId: id } } }) };
    case "variants":
      return {
        templates: await db.mockTestTemplate.count({ where: { examVariantId: id } }),
        sections: await db.mockTestTemplateSection.count({ where: { examPart: { paper: { variantId: id } } } }),
      };
    case "families":
      return {
        templates: await db.mockTestTemplate.count({ where: { examVariant: { familyId: id } } }),
        sections: await db.mockTestTemplateSection.count({ where: { examPart: { paper: { variant: { familyId: id } } } } }),
      };
  }
}

export async function getCatalogueTree() {
  const families = await db.examFamily.findMany({
    orderBy: { name: "asc" },
    include: {
      variants: {
        orderBy: { name: "asc" },
        include: {
          _count: { select: { mockTestTemplates: true } },
          papers: {
            orderBy: { order: "asc" },
            include: { parts: { orderBy: { order: "asc" }, include: { _count: { select: { mockTestTemplateSections: true } } } } },
          },
        },
      },
    },
  });
  const usedSlugs = new Set(families.map((f) => f.slug));
  return {
    families,
    // Registry families not created yet - what the "add family" picker offers.
    availableFamilies: EXAM_FAMILY_SEED.filter((f) => !usedSlugs.has(f.slug)),
  };
}

export async function createCatalogueRecord(entity: CatalogueEntity, body: Body): Promise<AdminResult> {
  try {
    switch (entity) {
      case "families": {
        const slug = str(body.slug) ?? "";
        const seed = EXAM_FAMILY_SEED.find((f) => f.slug === slug);
        const name = str(body.name) || seed?.name || "";
        const error = validateExamFamilyFields({ slug, name });
        if (error) return fail(400, error);
        const record = await db.examFamily.create({
          data: { slug, name, description: optStr(body.description) ?? seed?.description ?? null, isActive: optBool(body.isActive) ?? true },
        });
        return { ok: true, record };
      }
      case "variants": {
        const familyId = str(body.familyId) ?? "";
        if (!(await db.examFamily.findUnique({ where: { id: familyId } }))) return fail(400, "That exam family doesn't exist.");
        const fields = { slug: (str(body.slug) ?? "").toUpperCase(), name: str(body.name) ?? "", scoreScale: str(body.scoreScale) ?? "" };
        const error = validateExamVariantFields(fields);
        if (error) return fail(400, error);
        const record = await db.examVariant.create({ data: { familyId, ...fields, isActive: optBool(body.isActive) ?? true } });
        return { ok: true, record };
      }
      case "papers": {
        const variantId = str(body.variantId) ?? "";
        if (!(await db.examVariant.findUnique({ where: { id: variantId } }))) return fail(400, "That exam version doesn't exist.");
        const fields = {
          name: str(body.name) ?? "",
          durationSeconds: Number(body.durationSeconds),
          navigationMode: str(body.navigationMode) ?? "LOCKED_SEQUENTIAL",
        };
        const error = validateExamPaperFields(fields);
        if (error) return fail(400, error);
        const order = optInt(body.order);
        const record = await db.examPaper.create({
          data: {
            variantId,
            ...fields,
            order: order ?? (await nextOrder("papers", variantId)),
            instructions: optStr(body.instructions) ?? null,
            allowReview: optBool(body.allowReview) ?? false,
          },
        });
        return { ok: true, record };
      }
      case "parts": {
        const paperId = str(body.paperId) ?? "";
        if (!(await db.examPaper.findUnique({ where: { id: paperId } }))) return fail(400, "That exam section doesn't exist.");
        const fields = { name: str(body.name) ?? "", prepSeconds: optInt(body.prepSeconds) ?? null, responseSeconds: optInt(body.responseSeconds) ?? null };
        const error = validateExamPartFields(fields);
        if (error) return fail(400, error);
        const order = optInt(body.order);
        const record = await db.examPart.create({
          data: { paperId, ...fields, order: order ?? (await nextOrder("parts", paperId)), instructions: optStr(body.instructions) ?? null },
        });
        return { ok: true, record };
      }
    }
  } catch (err) {
    if (isUniqueViolation(err)) return fail(409, entity === "families" ? "That exam family already exists." : "That short code is already used in this family.");
    throw err;
  }
}

export async function updateCatalogueRecord(entity: CatalogueEntity, id: string, body: Body): Promise<AdminResult> {
  try {
    switch (entity) {
      case "families": {
        const before = await db.examFamily.findUnique({ where: { id } });
        if (!before) return fail(404, "Not found");
        const name = str(body.name) ?? before.name;
        // slug is the registry identity - never editable.
        const error = validateExamFamilyFields({ slug: before.slug, name });
        if (error) return fail(400, error);
        const record = await db.examFamily.update({
          where: { id },
          data: {
            name,
            ...(optStr(body.description) !== undefined ? { description: optStr(body.description) } : {}),
            ...(optBool(body.isActive) !== undefined ? { isActive: optBool(body.isActive) } : {}),
          },
        });
        return { ok: true, record, before };
      }
      case "variants": {
        const before = await db.examVariant.findUnique({ where: { id } });
        if (!before) return fail(404, "Not found");
        const fields = {
          slug: (str(body.slug) ?? before.slug).toUpperCase(),
          name: str(body.name) ?? before.name,
          scoreScale: str(body.scoreScale) ?? before.scoreScale,
        };
        const error = validateExamVariantFields(fields);
        if (error) return fail(400, error);
        const record = await db.examVariant.update({
          where: { id },
          data: { ...fields, ...(optBool(body.isActive) !== undefined ? { isActive: optBool(body.isActive) } : {}) },
        });
        return { ok: true, record, before };
      }
      case "papers": {
        const before = await db.examPaper.findUnique({ where: { id } });
        if (!before) return fail(404, "Not found");
        const fields = {
          name: str(body.name) ?? before.name,
          durationSeconds: body.durationSeconds !== undefined ? Number(body.durationSeconds) : before.durationSeconds,
          navigationMode: str(body.navigationMode) ?? before.navigationMode,
        };
        const error = validateExamPaperFields(fields);
        if (error) return fail(400, error);
        const order = optInt(body.order);
        const record = await db.examPaper.update({
          where: { id },
          data: {
            ...fields,
            ...(order != null && Number.isInteger(order) ? { order } : {}),
            ...(optStr(body.instructions) !== undefined ? { instructions: optStr(body.instructions) } : {}),
            ...(optBool(body.allowReview) !== undefined ? { allowReview: optBool(body.allowReview) } : {}),
          },
        });
        return { ok: true, record, before };
      }
      case "parts": {
        const before = await db.examPart.findUnique({ where: { id } });
        if (!before) return fail(404, "Not found");
        const fields = {
          name: str(body.name) ?? before.name,
          prepSeconds: optInt(body.prepSeconds) !== undefined ? optInt(body.prepSeconds)! : before.prepSeconds,
          responseSeconds: optInt(body.responseSeconds) !== undefined ? optInt(body.responseSeconds)! : before.responseSeconds,
        };
        const error = validateExamPartFields(fields);
        if (error) return fail(400, error);
        const order = optInt(body.order);
        const record = await db.examPart.update({
          where: { id },
          data: {
            ...fields,
            ...(order != null && Number.isInteger(order) ? { order } : {}),
            ...(optStr(body.instructions) !== undefined ? { instructions: optStr(body.instructions) } : {}),
          },
        });
        return { ok: true, record, before };
      }
    }
  } catch (err) {
    if (isUniqueViolation(err)) return fail(409, "That short code is already used in this family.");
    throw err;
  }
}

export async function deleteCatalogueRecord(entity: CatalogueEntity, id: string): Promise<AdminResult> {
  const before =
    entity === "families"
      ? await db.examFamily.findUnique({ where: { id } })
      : entity === "variants"
        ? await db.examVariant.findUnique({ where: { id } })
        : entity === "papers"
          ? await db.examPaper.findUnique({ where: { id } })
          : await db.examPart.findUnique({ where: { id } });
  if (!before) return fail(404, "Not found");

  const refs = await referenceCount(entity, id);
  if (refs.templates > 0 || refs.sections > 0) {
    const parts = [
      refs.templates ? `${refs.templates} mock-test template${refs.templates === 1 ? "" : "s"}` : "",
      refs.sections ? `${refs.sections} template section${refs.sections === 1 ? "" : "s"}` : "",
    ].filter(Boolean);
    return fail(409, `Can't delete: ${parts.join(" and ")} still use this. Unlink them in Templates first.`);
  }

  if (entity === "families") await db.examFamily.delete({ where: { id } });
  else if (entity === "variants") await db.examVariant.delete({ where: { id } });
  else if (entity === "papers") await db.examPaper.delete({ where: { id } });
  else await db.examPart.delete({ where: { id } });

  return { ok: true, record: { id, deleted: true }, before: before as Record<string, unknown> };
}
