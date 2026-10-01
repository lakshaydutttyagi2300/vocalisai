import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";
import { TEMPLATE_COLUMNS, questionToRow } from "@/lib/question-file-format";
import { filtersFromParams } from "@/lib/question-bank-admin";
import { buildReviewWorkbook } from "@/lib/question-review-export";

// Downloads the real question bank (same filters as the admin list view)
// as XLSX or CSV - same column layout as the import template, so an admin
// can diff a new file against what's already in the bank before importing.
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { searchParams } = new URL(req.url);

  // layout=review: one workbook for checking by hand - a sheet per category plus possible duplicates.
  if (searchParams.get("layout") === "review") {
    try {
      const buffer = await buildReviewWorkbook(filtersFromParams(searchParams));
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="question-bank-review-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        },
      });
    } catch (err) {
      console.error("[questions/export review]", err);
      return NextResponse.json({ error: "Couldn't build the review file. Please try again." }, { status: 500 });
    }
  }

  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty");
  const active = searchParams.get("active");

  const where = {
    archivedAt: null, // archived = removed from the bank (bulk delete keeps used questions this way)
    ...(category ? { category } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(active === "true" ? { isActive: true } : active === "false" ? { isActive: false } : {}),
  };

  const questions = await db.practiceQuestion.findMany({
    where,
    orderBy: [{ category: "asc" }, { difficulty: "asc" }, { createdAt: "asc" }],
  });

  const rows = [
    TEMPLATE_COLUMNS as unknown as string[],
    ...questions.map((q) =>
      questionToRow({
        category: q.category,
        difficulty: q.difficulty,
        type: q.type,
        prompt: q.prompt,
        passage: q.passage,
        options: q.options ? JSON.parse(q.options) : null,
        correctAnswer: q.correctAnswer,
        expectedAnswer: q.expectedAnswer,
        explanation: q.explanation,
        scoringCriteria: q.scoringCriteria,
        timeLimitSeconds: q.timeLimitSeconds,
        isActive: q.isActive,
        itemGroupId: q.itemGroupId,
        orderInGroup: q.orderInGroup,
      })
    ),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = TEMPLATE_COLUMNS.map((c) => ({ wch: c === "Question" || c === "Options" || c === "Passage" ? 40 : 16 }));

  const dateStamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="question-bank-export-${dateStamp}.csv"`,
      },
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Question Bank");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="question-bank-export-${dateStamp}.xlsx"`,
    },
  });
}
