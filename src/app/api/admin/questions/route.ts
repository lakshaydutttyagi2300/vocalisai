import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidDifficulty, PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { findSimilar, questionSignature } from "@/lib/question-dedup";
import { logAdminAction } from "@/lib/audit-log";

const VALID_CATEGORIES = new Set(PRACTICE_MODES.map((m) => m.category));
const VALID_TYPES = new Set(["MULTIPLE_CHOICE", "READING_COMPREHENSION", "LISTENING_COMPREHENSION", "SHORT_ANSWER"]);

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty");
  const search = searchParams.get("search")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = 25;

  const where = {
    ...(category ? { category } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(search ? { prompt: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [total, questions, categoryCounts] = await Promise.all([
    db.practiceQuestion.count({ where }),
    db.practiceQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, category: true, difficulty: true, type: true, prompt: true, source: true, createdAt: true },
    }),
    db.practiceQuestion.groupBy({ by: ["category", "difficulty"], _count: { _all: true } }),
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
    if (!VALID_CATEGORIES.has(raw.category)) {
      errors.push({ index, error: `Invalid category "${raw.category}".` });
      continue;
    }
    if (!isValidDifficulty(raw.difficulty)) {
      errors.push({ index, error: `Invalid difficulty "${raw.difficulty}".` });
      continue;
    }
    if (!VALID_TYPES.has(raw.type)) {
      errors.push({ index, error: `Invalid type "${raw.type}".` });
      continue;
    }
    if (!raw.prompt || typeof raw.prompt !== "string" || raw.prompt.trim().length < 3) {
      errors.push({ index, error: "Prompt is missing or too short." });
      continue;
    }
    if (!Number.isFinite(raw.timeLimitSeconds) || raw.timeLimitSeconds < 5 || raw.timeLimitSeconds > 300) {
      errors.push({ index, error: "timeLimitSeconds must be between 5 and 300." });
      continue;
    }
    if (raw.type === "MULTIPLE_CHOICE" || raw.type === "READING_COMPREHENSION" || raw.type === "LISTENING_COMPREHENSION") {
      if (!Array.isArray(raw.options) || raw.options.length < 2) {
        errors.push({ index, error: "This type needs at least 2 options." });
        continue;
      }
      if (!raw.correctAnswer || !raw.options.includes(raw.correctAnswer)) {
        errors.push({ index, error: "correctAnswer must exactly match one of the options." });
        continue;
      }
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
