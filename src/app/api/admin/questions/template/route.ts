import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";
import { TEMPLATE_COLUMNS, SAMPLE_ROWS, questionToRow } from "@/lib/question-file-format";

// Downloadable sample template (XLSX or CSV) - the exact columns the bulk
// import workflow expects, with a few worked examples across question
// types, so an admin can fill in hundreds of rows offline and re-upload.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";

  const rows = [TEMPLATE_COLUMNS as unknown as string[], ...SAMPLE_ROWS.map((q) => questionToRow(q))];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = TEMPLATE_COLUMNS.map((c) => ({ wch: c === "Question" || c === "Options" || c === "Passage" ? 40 : 16 }));

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="question-bank-template.csv"',
      },
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Template");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="question-bank-template.xlsx"',
    },
  });
}
