import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/audit-log";
import { processQuestionBatch } from "@/lib/question-import";

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

  // Coverage counts active questions - that's what a candidate can
  // actually be served, which is the number an admin needs to see to
  // judge "is there enough real content here". totalCoverage counts
  // every question regardless of status, so a large disabled/pending-review
  // batch (e.g. a bulk import) is visible even before anything in it is
  // turned on - otherwise the active-only table looks unchanged after a
  // large import and makes it look like nothing was actually added.
  const [total, questions, activeCounts, allCounts] = await Promise.all([
    db.practiceQuestion.count({ where }),
    db.practiceQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, category: true, difficulty: true, type: true, prompt: true, source: true, isActive: true, createdAt: true },
    }),
    db.practiceQuestion.groupBy({ by: ["category", "difficulty"], where: { isActive: true }, _count: { _all: true } }),
    db.practiceQuestion.groupBy({ by: ["category", "difficulty"], _count: { _all: true } }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    questions,
    coverage: activeCounts.map((c) => ({ category: c.category, difficulty: c.difficulty, count: c._count._all })),
    totalCoverage: allCounts.map((c) => ({ category: c.category, difficulty: c.difficulty, count: c._count._all })),
  });
}

// Bulk import, not one-at-a-time - a real question bank grows in batches
// of dozens or hundreds, not one admin form submission at a time. Every
// candidate is checked against both the existing bank and the rest of
// its own batch for near-duplicates before anything is written. The core
// logic lives in processQuestionBatch() (src/lib/question-import.ts),
// shared with the dry-run /validate route so a preview can never lie
// about what the real import will do.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const inputs = body?.questions as unknown[] | undefined;
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return NextResponse.json({ error: "Provide a non-empty 'questions' array." }, { status: 400 });
  }
  const allowDuplicates = body?.allowDuplicates === true;

  const { results, insertedCount } = await processQuestionBatch(inputs, { insert: true, allowDuplicates });

  const errors = results.filter((r) => r.status === "error").map((r) => ({ index: r.index, error: r.error! }));
  const duplicates = results
    .filter((r) => r.status === "duplicate")
    .map((r) => ({ index: r.index, prompt: r.prompt, matchedExisting: r.matchedExisting, matchedInBatch: r.matchedInBatch }));

  if (insertedCount > 0) {
    await logAdminAction({
      adminId: session.user.id,
      adminEmail: session.user.email ?? "unknown",
      action: "QUESTIONS_IMPORTED",
      targetType: "PracticeQuestion",
      after: { inserted: insertedCount, duplicateCount: duplicates.length, errorCount: errors.length },
    });
  }

  return NextResponse.json({
    inserted: insertedCount,
    duplicateCount: duplicates.length,
    errorCount: errors.length,
    duplicates,
    errors,
  });
}
