import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/audit-log";
import { bankWhere, deleteQuestions, hasFilters } from "@/lib/question-bank-admin";

// Bulk delete from the Question Bank: either the ticked questions (ids) or
// every question matching the list filters. Deleting the whole bank (no
// filters) needs confirmAll, so a missing filter can never wipe it by accident.
// Questions candidates have already used are archived instead (deleteQuestions).
const bodySchema = z.union([
  z.object({ ids: z.array(z.string().min(1).max(100)).min(1).max(20000) }),
  z.object({
    filters: z.object({
      category: z.string().max(100).nullish(),
      difficulty: z.string().max(100).nullish(),
      search: z.string().max(500).nullish(),
      active: z.enum(["true", "false", ""]).nullish(),
      duplicates: z.boolean().optional(),
    }),
    confirmAll: z.boolean().optional(),
  }),
]);

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose the questions to delete." }, { status: 400 });

  let ids: string[];
  if ("ids" in parsed.data) {
    ids = parsed.data.ids;
  } else {
    const { filters, confirmAll } = parsed.data;
    if (!hasFilters(filters) && !confirmAll) {
      return NextResponse.json({ error: "That would delete the whole question bank. Confirm it to go ahead." }, { status: 400 });
    }
    ids = (await db.practiceQuestion.findMany({ where: await bankWhere(filters), select: { id: true } })).map((q) => q.id);
  }
  if (ids.length === 0) return NextResponse.json({ deleted: 0, archived: 0 });

  try {
    const result = await deleteQuestions(ids);
    await logAdminAction({
      adminId: admin.adminId,
      adminEmail: admin.adminEmail,
      action: "QUESTIONS_BULK_DELETED",
      targetType: "PracticeQuestion",
      after: { requested: ids.length, ...result, ...("filters" in parsed.data ? { filters: parsed.data.filters } : {}) },
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[questions/bulk-delete]", err);
    return NextResponse.json({ error: "Couldn't delete the questions. Please try again." }, { status: 500 });
  }
}
