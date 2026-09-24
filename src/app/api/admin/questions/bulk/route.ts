import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/audit-log";
import { VALID_CATEGORIES } from "@/lib/question-validation";
import { isValidDifficulty } from "@/lib/practice-taxonomy";

// Bulk enable/disable. category and difficulty are both optional and
// narrow the scope when given; omitting category acts on the entire
// question bank across every category and difficulty at once, so that
// path requires an explicit confirmAll:true flag - a bare {isActive}
// body can never silently flip the whole bank by accident (e.g. a
// forgotten category field in a future caller).
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const category = body?.category as string | undefined;
  const difficulty = body?.difficulty as string | undefined;
  const isActive = body?.isActive as boolean | undefined;
  const confirmAll = body?.confirmAll as boolean | undefined;

  if (category && !VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  if (!category && !confirmAll) {
    return NextResponse.json({ error: "Omitting category acts on the entire bank - pass confirmAll: true to do that." }, { status: 400 });
  }
  if (difficulty && !isValidDifficulty(difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty." }, { status: 400 });
  }
  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "isActive (true or false) is required." }, { status: 400 });
  }

  const result = await db.practiceQuestion.updateMany({
    where: { ...(category ? { category } : {}), ...(difficulty ? { difficulty } : {}), isActive: !isActive },
    data: { isActive },
  });

  if (result.count > 0) {
    await logAdminAction({
      adminId: session.user.id,
      adminEmail: session.user.email ?? "unknown",
      action: isActive ? "QUESTIONS_BULK_ACTIVATED" : "QUESTIONS_BULK_DEACTIVATED",
      targetType: "PracticeQuestion",
      after: { category: category ?? "ALL", difficulty: difficulty ?? "ALL", isActive, count: result.count },
    });
  }

  return NextResponse.json({ updated: result.count });
}
