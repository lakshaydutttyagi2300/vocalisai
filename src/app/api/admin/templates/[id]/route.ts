import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PRACTICE_MODES, isValidDifficulty } from "@/lib/practice-taxonomy";
import { logAdminAction } from "@/lib/audit-log";
import { readOptionalId, validateTemplateExamLink } from "@/lib/template-exam-link";

const VALID_CATEGORIES = new Set(PRACTICE_MODES.map((m) => m.category));

interface SectionInput {
  order: number;
  category: string;
  difficulty: string;
  questionCount: number;
  examPartId: string | null; // P1-G, optional
}

function validateSections(sections: unknown): { error: string } | { sections: SectionInput[] } {
  if (!Array.isArray(sections) || sections.length === 0) {
    return { error: "At least one section is required." };
  }
  const parsed: SectionInput[] = [];
  for (const [i, raw] of sections.entries()) {
    const s = raw as Partial<SectionInput>;
    if (!s.category || !VALID_CATEGORIES.has(s.category)) {
      return { error: `Section ${i + 1}: invalid category "${s.category}".` };
    }
    if (!s.difficulty || !isValidDifficulty(s.difficulty)) {
      return { error: `Section ${i + 1}: invalid difficulty "${s.difficulty}".` };
    }
    if (!Number.isInteger(s.questionCount) || (s.questionCount as number) < 1 || (s.questionCount as number) > 20) {
      return { error: `Section ${i + 1}: questionCount must be an integer between 1 and 20.` };
    }
    parsed.push({
      order: i + 1,
      category: s.category,
      difficulty: s.difficulty,
      questionCount: s.questionCount as number,
      examPartId: readOptionalId(s.examPartId),
    });
  }
  return { sections: parsed };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await db.mockTestTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Template name is required." }, { status: 400 });

  const result = validateSections(body?.sections);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  // P1-G: examVariantId is optional here - omitted, the template keeps its
  // current link (null for every pre-P1-G template); sent as null/"", it
  // is unlinked.
  const examVariantId = body && "examVariantId" in body ? readOptionalId(body.examVariantId) : existing.examVariantId;
  const linkError = await validateTemplateExamLink(examVariantId, result.sections.map((s) => s.examPartId));
  if (linkError) return NextResponse.json({ error: linkError }, { status: 400 });

  // isDefault is optional on this route - omitted, it's left unchanged;
  // set to true, every other template's flag is cleared first so exactly
  // one row is ever the default (see schema.prisma's note on why this is
  // enforced here rather than a DB constraint). Never allowed to unset
  // itself directly - clear it by making a different template the default
  // instead, so there's never a moment with zero defaults while templates
  // exist.
  const makeDefault = body?.isDefault === true;

  // Simplest correct approach for a small admin-managed row set: replace all
  // sections atomically rather than diffing individual rows.
  const template = await db.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.mockTestTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    await tx.mockTestTemplateSection.deleteMany({ where: { templateId: id } });
    return tx.mockTestTemplate.update({
      where: { id },
      data: { name, examVariantId, ...(makeDefault ? { isDefault: true } : {}), sections: { create: result.sections } },
      include: { sections: { orderBy: { order: "asc" } } },
    });
  });

  await logAdminAction({
    adminId: session.user.id,
    adminEmail: session.user.email ?? "unknown",
    action: makeDefault && !existing.isDefault ? "TEMPLATE_SET_DEFAULT" : "TEMPLATE_UPDATED",
    targetType: "MockTestTemplate",
    targetId: id,
    before: { name: existing.name, isDefault: existing.isDefault, examVariantId: existing.examVariantId },
    after: { name: template.name, isDefault: template.isDefault, sections: result.sections, examVariantId },
  });

  return NextResponse.json({
    id: template.id,
    name: template.name,
    isDefault: template.isDefault,
    examVariantId: template.examVariantId,
    sections: template.sections,
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await db.mockTestTemplate.findUnique({ where: { id }, include: { _count: { select: { sessions: true } } } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing._count.sessions > 0) {
    return NextResponse.json(
      { error: `Can't delete: ${existing._count.sessions} mock test session(s) already used this template.` },
      { status: 409 }
    );
  }

  await db.mockTestTemplate.delete({ where: { id } });

  // Deleting the default template leaves zero defaults - promote the next
  // most-recently-created one automatically, so mock tests never silently
  // stop working because of a delete (the sessions route also has a
  // most-recent fallback, but keeping isDefault accurate here means the
  // admin UI's "Default" badge is never just wrong until someone notices).
  if (existing.isDefault) {
    const next = await db.mockTestTemplate.findFirst({ orderBy: { createdAt: "desc" } });
    if (next) await db.mockTestTemplate.update({ where: { id: next.id }, data: { isDefault: true } });
  }

  await logAdminAction({
    adminId: session.user.id,
    adminEmail: session.user.email ?? "unknown",
    action: "TEMPLATE_DELETED",
    targetType: "MockTestTemplate",
    targetId: id,
    before: { name: existing.name, isDefault: existing.isDefault },
  });

  return NextResponse.json({ deleted: true });
}
