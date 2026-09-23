import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/audit-log";
import { VALID_CATEGORIES } from "@/lib/question-validation";
import { isValidDifficulty } from "@/lib/practice-taxonomy";

// Bulk enable/disable, scoped to a required category (difficulty is
// optional - omitted, it applies across all four difficulties in that
// category in one call). Deliberately still requires a category rather
// than allowing a bank-wide flip, since a mistaken bulk action here can
// flip hundreds/thousands of rows at once. Built for reviewing large
// imported batches (e.g. the question-bank-full.json import, which lands
// everything isActive:false pending review) a category at a time, not as
// a general-purpose filter tool.
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const category = body?.category as string | undefined;
  const difficulty = body?.difficulty as string | undefined;
  const isActive = body?.isActive as boolean | undefined;

  if (!category || !VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "A valid category is required." }, { status: 400 });
  }
  if (difficulty && !isValidDifficulty(difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty." }, { status: 400 });
  }
  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "isActive (true or false) is required." }, { status: 400 });
  }

  const result = await db.practiceQuestion.updateMany({
    where: { category, ...(difficulty ? { difficulty } : {}), isActive: !isActive },
    data: { isActive },
  });

  if (result.count > 0) {
    await logAdminAction({
      adminId: session.user.id,
      adminEmail: session.user.email ?? "unknown",
      action: isActive ? "QUESTIONS_BULK_ACTIVATED" : "QUESTIONS_BULK_DEACTIVATED",
      targetType: "PracticeQuestion",
      after: { category, difficulty: difficulty ?? "ALL", isActive, count: result.count },
    });
  }

  return NextResponse.json({ updated: result.count });
}
