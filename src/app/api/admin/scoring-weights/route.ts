import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { SCORE_CATEGORIES, CATEGORY_LABELS } from "@/lib/scoring-engine";
import { getAllCategoryWeights, isValidWeight } from "@/lib/scoring-config";
import { logAdminAction } from "@/lib/audit-log";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const weights = await getAllCategoryWeights(SCORE_CATEGORIES);
  return NextResponse.json({
    weights: weights.map((w) => ({ ...w, label: CATEGORY_LABELS[w.category as keyof typeof CATEGORY_LABELS] })),
  });
}

// Updates one category's weight. weight is a multiplier (default 1) on
// that category's own score before it's averaged into the overall
// Readiness score - 0 excludes the category entirely, 2 counts it twice
// as heavily as a default-weighted one, etc. Each category's own score is
// completely unaffected; this only changes how they combine.
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const category = body?.category as string | undefined;
  const weight = body?.weight;

  if (!category || !(SCORE_CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  if (!isValidWeight(weight)) {
    return NextResponse.json({ error: "weight must be a number between 0 and 5." }, { status: 400 });
  }

  const before = await db.scoringCategoryWeight.findUnique({ where: { category } });

  const updated = await db.scoringCategoryWeight.upsert({
    where: { category },
    create: { category, weight },
    update: { weight },
  });

  await logAdminAction({
    adminId: session.user.id,
    adminEmail: session.user.email ?? "unknown",
    action: "SCORING_WEIGHT_CHANGED",
    targetType: "ScoringCategoryWeight",
    targetId: category,
    before: { weight: before?.weight ?? 1 },
    after: { weight: updated.weight },
  });

  return NextResponse.json({ category: updated.category, weight: updated.weight });
}
