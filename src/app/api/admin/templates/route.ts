import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PRACTICE_MODES, isValidDifficulty } from "@/lib/practice-taxonomy";
import { logAdminAction } from "@/lib/audit-log";

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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const templates = await db.mockTestTemplate.findMany({
    orderBy: { createdAt: "desc" },
    include: { sections: { orderBy: { order: "asc" } }, _count: { select: { sessions: true } } },
  });
  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt.toISOString(),
      sessionsUsingIt: t._count.sessions,
      sections: t.sections.map((s) => ({ id: s.id, order: s.order, category: s.category, difficulty: s.difficulty, questionCount: s.questionCount })),
    })),
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Template name is required." }, { status: 400 });

  const result = validateSections(body?.sections);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  const template = await db.mockTestTemplate.create({
    data: { name, sections: { create: result.sections } },
    include: { sections: { orderBy: { order: "asc" } } },
  });

  await logAdminAction({
    adminId: session.user.id,
    adminEmail: session.user.email ?? "unknown",
    action: "TEMPLATE_CREATED",
    targetType: "MockTestTemplate",
    targetId: template.id,
    after: { name: template.name, sections: result.sections },
  });

  return NextResponse.json({ id: template.id, name: template.name, sections: template.sections }, { status: 201 });
}
