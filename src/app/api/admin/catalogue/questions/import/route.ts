import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { logAdminAction } from "@/lib/audit-log";
import { CatalogAdminError, IMPORT_MAX_ROWS, importQuestions } from "@/lib/catalog-admin";

const bodySchema = z.object({
  dryRun: z.boolean().default(true),
  rows: z.array(z.record(z.string(), z.unknown())).min(1, "The file has no question rows.").max(IMPORT_MAX_ROWS, `Import at most ${IMPORT_MAX_ROWS} questions at a time.`),
});

// Checks (dryRun) or imports a spreadsheet of catalogue questions. Nothing is
// saved unless every row is valid.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Upload a question file." }, { status: 400 });
  try {
    const result = await importQuestions(parsed.data.rows, parsed.data.dryRun);
    if (result.created > 0) {
      await logAdminAction({ adminId: admin.adminId, adminEmail: admin.adminEmail, action: "QUESTIONS_IMPORTED", targetType: "PracticeQuestion", after: { created: result.created } });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CatalogAdminError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("catalogue: import failed", err);
    return NextResponse.json({ error: "We couldn't import the file. Please try again." }, { status: 500 });
  }
}
