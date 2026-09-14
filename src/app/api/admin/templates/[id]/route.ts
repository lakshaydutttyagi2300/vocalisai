import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PRACTICE_MODES, isValidDifficulty } from "@/lib/practice-taxonomy";

const VALID_CATEGORIES = new Set(PRACTICE_MODES.map((m) => m.category));

interface SectionInput {
  order: number;
  category: string;
  difficulty: string;
  questionCount: number;
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
    parsed.push({ order: i + 1, category: s.category, difficulty: s.difficulty, questionCount: s.questionCount as number });
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

  // Simplest correct approach for a small admin-managed row set: replace all
  // sections atomically rather than diffing individual rows.
  const template = await db.$transaction(async (tx) => {
    await tx.mockTestTemplateSection.deleteMany({ where: { templateId: id } });
    return tx.mockTestTemplate.update({
      where: { id },
      data: { name, sections: { create: result.sections } },
      include: { sections: { orderBy: { order: "asc" } } },
    });
  });

  return NextResponse.json({ id: template.id, name: template.name, sections: template.sections });
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
  return NextResponse.json({ deleted: true });
}
