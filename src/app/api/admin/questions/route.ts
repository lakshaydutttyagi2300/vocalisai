import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateQuestionFields } from "@/lib/question-validation";
import { findSimilar, questionSignature } from "@/lib/question-dedup";
import { logAdminAction } from "@/lib/audit-log";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty");
  const search = searchParams.get("search")?.trim();
  const active = searchParams.get("active"); // "true" | "false" | absent (all)
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = 25;

  const where = {
    ...(category ? { category } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(search ? { prompt: { contains: search, mode: "insensitive" as const } } : {}),
    ...(active === "true" ? { isActive: true } : active === "false" ? { isActive: false } : {}),
  };

  // Coverage only ever counts active questions - that's what a candidate
  // can actually be served, which is the number an admin needs to see to
  // judge "is there enough real content here".
  const [total, questions, categoryCounts] = await Promise.all([
    db.practiceQuestion.count({ where }),
    db.practiceQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, category: true, difficulty: true, type: true, prompt: true, source: true, isActive: true, createdAt: true },
    }),
    db.practiceQuestion.groupBy({ by: ["category", "difficulty"], where: { isActive: true }, _count: { _all: true } }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    questions,
    coverage: categoryCounts.map((c) => ({ category: c.category, difficulty: c.difficulty, count: c._count._all })),
  });
}

interface QuestionInput {
  category: string;
  difficulty: string;
  type: string;
  prompt: string;
  passage?: string | null;
  options?: string[] | null;
  correctAnswer?: string | null;
  expectedAnswer?: string | null;
  explanation?: string | null;
  scoringCriteria?: string | null;
  timeLimitSeconds: number;
}

// Bulk import, not one-at-a-time - a real question bank grows in batches
// of dozens or hundreds, not one admin form submission at a time. Every
// candidate is checked against both the existing bank and the rest of
// its own batch for near-duplicates before anything is written.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const inputs = body?.questions as QuestionInput[] | undefined;
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return NextResponse.json({ error: "Provide a non-empty 'questions' array." }, { status: 400 });
  }

  const errors: { index: number; error: string }[] = [];
  const duplicates: { index: number; prompt: string; matchedExisting?: string; matchedInBatch?: number }[] = [];
  const toInsert: (QuestionInput & { signature: string })[] = [];

  // Pre-load existing signatures per category so every candidate is only
  // compared against questions that could plausibly overlap with it.
  const existingByCategory = new Map<string, { id: string; signature: string }[]>();

  for (const [index, raw] of inputs.entries()) {
    if (!raw || typeof raw !== "object") {
      errors.push({ index, error: "Not a valid question object." });
      continue;
    }
    const validationError = validateQuestionFields(raw);
    if (validationError) {
      errors.push({ index, error: validationError });
      continue;
    }

    if (!existingByCategory.has(raw.category)) {
      const existing = await db.practiceQuestion.findMany({
        where: { category: raw.category },
        select: { id: true, prompt: true, passage: true },
      });
      existingByCategory.set(
        raw.category,
        existing.map((q) => ({ id: q.id, signature: questionSignature(q) }))
      );
    }
    const existingForCategory = existingByCategory.get(raw.category)!;
    const signature = questionSignature(raw);

    const existingMatches = findSimilar(signature, existingForCategory.map((e) => e.signature));
    if (existingMatches.length > 0) {
      duplicates.push({ index, prompt: raw.prompt, matchedExisting: existingForCategory[existingMatches[0].index].id });
      continue;
    }

    const batchSignatures = toInsert.filter((q) => q.category === raw.category).map((q) => q.signature);
    const batchMatches = findSimilar(signature, batchSignatures);
    if (batchMatches.length > 0) {
      duplicates.push({ index, prompt: raw.prompt, matchedInBatch: batchMatches[0].index });
      continue;
    }

    toInsert.push({ ...raw, signature });
  }

  if (toInsert.length > 0) {
    await db.practiceQuestion.createMany({
      data: toInsert.map((q) => ({
        category: q.category,
        difficulty: q.difficulty,
        type: q.type,
        prompt: q.prompt,
        passage: q.passage ?? null,
        options: q.options ? JSON.stringify(q.options) : null,
        correctAnswer: q.correctAnswer ?? null,
        expectedAnswer: q.expectedAnswer ?? null,
        explanation: q.explanation ?? null,
        scoringCriteria: q.scoringCriteria ?? null,
        timeLimitSeconds: q.timeLimitSeconds,
        source: "SEEDED",
      })),
    });
  }

  if (toInsert.length > 0) {
    await logAdminAction({
      adminId: session.user.id,
      adminEmail: session.user.email ?? "unknown",
      action: "QUESTIONS_IMPORTED",
      targetType: "PracticeQuestion",
      after: { inserted: toInsert.length, duplicateCount: duplicates.length, errorCount: errors.length },
    });
  }

  return NextResponse.json({
    inserted: toInsert.length,
    duplicateCount: duplicates.length,
    errorCount: errors.length,
    duplicates,
    errors,
  });
}
