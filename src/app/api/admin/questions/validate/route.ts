import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { processQuestionBatch } from "@/lib/question-import";

// Dry run for the bulk-import workflow's preview step - runs the exact same
// validation and near-duplicate check as the real import (POST
// /api/admin/questions), via the same processQuestionBatch() function,
// but writes nothing. Lets the UI show "this many will import, this many
// are duplicates, this many have errors" before the admin confirms.
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

  const { results, insertedCount } = await processQuestionBatch(inputs, { insert: false, allowDuplicates });

  return NextResponse.json({
    total: inputs.length,
    wouldInsert: insertedCount,
    valid: results.filter((r) => r.status === "valid").length,
    duplicateCount: results.filter((r) => r.status === "duplicate").length,
    errorCount: results.filter((r) => r.status === "error").length,
    results,
  });
}
