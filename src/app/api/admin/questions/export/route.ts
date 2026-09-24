import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";
import { TEMPLATE_COLUMNS, questionToRow } from "@/lib/question-file-format";

// Downloads the real question bank (same filters as the admin list view)
// as XLSX or CSV - same column layout as the import template, so an admin
// can diff a new file against what's already in the bank before importing.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty");
  const active = searchParams.get("active");

  const where = {
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
