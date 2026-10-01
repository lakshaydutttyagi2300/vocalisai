"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Download, Upload } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

const COLUMNS = ["subject", "skill", "exams", "difficulty", "type", "question", "passage", "options", "correctAnswer", "explanation", "tags", "status", "timeLimitSeconds"];
const EXAMPLE = ["reasoning", "syllogism", "tcs-nqt; amcat", "BEGINNER", "MULTIPLE_CHOICE", "All pens are books. All books are bags. Are all pens bags?", "", "Yes | No", "Yes", "Every pen is a book and every book is a bag.", "syllogism; basics", "ACTIVE", "60"];

interface Result {
  total: number;
  valid: number;
  created: number;
  errors: { row: number; message: string }[];
}

// Spreadsheet import for catalogue questions: check first, then import.
// Nothing is saved unless every row is valid.
export function CatalogueQuestionImport({ onImported }: { onImported: () => void }) {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function downloadTemplate() {
    const sheet = XLSX.utils.aoa_to_sheet([COLUMNS, EXAMPLE]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Questions");
    XLSX.writeFile(book, "catalogue-questions-template.xlsx");
  }

  async function readFile(file: File) {
    setError(null);
    setResult(null);
    setFileName(file.name);
    try {
      const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = book.Sheets[book.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" }).filter((r) => Object.values(r).some((v) => String(v).trim() !== ""));
      setRows(data);
      await run(data, true);
    } catch {
      setError("We couldn't read that file. Use the template (Excel or CSV).");
      setRows(null);
    }
  }

  async function run(data: Record<string, unknown>[], dryRun: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/catalogue/questions/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: data, dryRun }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Import failed. Please try again.");
      setResult(body);
      if (!dryRun && body.created > 0) {
        setRows(null);
        onImported();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Import questions" className="sheet p-5">
      <h2 className="font-semibold text-ink-950">Import questions</h2>
      <p className="mt-1 text-sm text-slate-600">
        One row per question. Use the subject, skill and exam short names shown on the Exam catalogue page; separate options with &ldquo;|&rdquo; and lists with &ldquo;;&rdquo;. Every row is checked first, and nothing is saved unless all rows are valid.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={downloadTemplate} className="btn-secondary btn-sm">
          <Icon as={Download} />
          Download template
        </button>
        <label className="btn-secondary btn-sm cursor-pointer">
          <Icon as={Upload} />
          Choose file
          <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
        </label>
        {fileName && <span className="text-sm text-slate-500">{fileName}</span>}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-4 text-sm" role="status">
          {result.created > 0 ? (
            <p className="rounded-md bg-green-50 px-3 py-2 text-green-800">Imported {result.created} questions.</p>
          ) : (
            <p className="text-ink-950">
              {result.valid} of {result.total} rows are ready.{result.errors.length > 0 && " Fix the rows below and choose the file again."}
            </p>
          )}
          {result.errors.length > 0 && (
            <ul className="mt-2 max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
              {result.errors.map((e, i) => (
                <li key={i} className="px-3 py-1.5 text-xs">
                  <span className="num font-semibold text-red-700">Row {e.row}</span> <span className="text-slate-700">{e.message}</span>
                </li>
              ))}
            </ul>
          )}
          {rows && result.errors.length === 0 && result.created === 0 && (
            <button onClick={() => run(rows, false)} disabled={busy} data-loading={busy || undefined} className="btn-primary btn-sm mt-3">
              Import {result.valid} questions
            </button>
          )}
        </div>
      )}
    </section>
  );
}
