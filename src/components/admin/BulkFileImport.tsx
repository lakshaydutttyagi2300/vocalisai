"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import {
  TEMPLATE_COLUMNS,
  guessColumn,
  rowToQuestion,
  type TemplateColumn,
  type FlatQuestionRow,
  type ImportableQuestion,
} from "@/lib/question-file-format";

type Stage = "idle" | "parsed" | "validated" | "importing" | "done";

interface ValidateRowResult {
  index: number;
  status: "valid" | "duplicate" | "error";
  prompt: string;
  error?: string;
  matchedExisting?: string;
  matchedInBatch?: number;
}

const SUPPORTED_EXTENSIONS = [".xlsx", ".xls", ".csv", ".json", ".txt"];

function detectDelimiter(headerLine: string): string {
  const counts: Record<string, number> = {
    ",": (headerLine.match(/,/g) || []).length,
    "\t": (headerLine.match(/\t/g) || []).length,
    "|": (headerLine.match(/\|/g) || []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseDelimitedText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const delimiter = detectDelimiter(lines[0]);
  const split = (line: string) => line.split(delimiter).map((c) => c.trim());
  return { headers: split(lines[0]), rows: lines.slice(1).map(split) };
}

export function BulkFileImport({ onImported }: { onImported: () => void }) {
  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, TemplateColumn | "">>({});
  const [parseError, setParseError] = useState<string | null>(null);

  const [validating, setValidating] = useState(false);
  const [validateResult, setValidateResult] = useState<{
    total: number;
    wouldInsert: number;
    valid: number;
    duplicateCount: number;
    errorCount: number;
    results: ValidateRowResult[];
  } | null>(null);

  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; duplicateCount: number; errorCount: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function reset() {
    setStage("idle");
    setFileName(null);
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setParseError(null);
    setValidateResult(null);
    setImportResult(null);
    setImportError(null);
  }

  async function handleFile(file: File) {
    reset();
    setFileName(file.name);
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

    if (ext === ".docx" || ext === ".doc") {
      setParseError(
        "Word documents aren't supported for bulk import - a .docx/.doc file has no reliable row/column structure for hundreds of questions. Please use the XLSX or CSV template instead (Download Sample Template below), or JSON/TXT."
      );
      return;
    }
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setParseError(`Unsupported file type "${ext}". Use XLSX, XLS, CSV, JSON or TXT.`);
      return;
    }

    try {
      if (ext === ".json") {
        const text = await file.text();
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : (data as { questions?: unknown[] }).questions;
        if (!Array.isArray(arr) || arr.length === 0) {
          setParseError("That JSON file doesn't contain a non-empty array of questions.");
          return;
        }
        // Already in our internal shape (category/prompt keys present) -
        // skip flat-row mapping entirely, same shape the paste-JSON box uses.
        const first = arr[0] as Record<string, unknown>;
        if (typeof first === "object" && first && "category" in first && "prompt" in first) {
          const hdrs = Object.keys(first);
          setHeaders(hdrs);
          setRawRows(arr as Record<string, unknown>[]);
          const auto: Record<string, TemplateColumn | ""> = {};
          for (const h of hdrs) auto[h] = (guessColumn(h) ?? guessInternalKey(h)) as TemplateColumn | "";
          setMapping(auto);
          setStage("parsed");
          return;
        }
        // Otherwise treat as flat rows like CSV/XLSX.
        const hdrs = Object.keys(first);
        setHeaders(hdrs);
        setRawRows(arr as Record<string, unknown>[]);
        const auto: Record<string, TemplateColumn | ""> = {};
        for (const h of hdrs) auto[h] = guessColumn(h) ?? "";
        setMapping(auto);
        setStage("parsed");
        return;
      }

      if (ext === ".txt") {
        const text = await file.text();
        const { headers: hdrs, rows } = parseDelimitedText(text);
        if (hdrs.length === 0) {
          setParseError("Couldn't find any rows in that file.");
          return;
        }
        setHeaders(hdrs);
        setRawRows(rows.map((r) => Object.fromEntries(hdrs.map((h, i) => [h, r[i] ?? ""]))));
        const auto: Record<string, TemplateColumn | ""> = {};
        for (const h of hdrs) auto[h] = guessColumn(h) ?? "";
        setMapping(auto);
        setStage("parsed");
        return;
      }

      // xlsx / xls / csv - SheetJS reads all three.
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
      if (aoa.length < 1) {
        setParseError("That file appears to be empty.");
        return;
      }
      const hdrs = (aoa[0] as unknown[]).map((h) => String(h));
      const dataRows = aoa.slice(1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
      setHeaders(hdrs);
      setRawRows(dataRows.map((r) => Object.fromEntries(hdrs.map((h, i) => [h, r[i] ?? ""]))));
      const auto: Record<string, TemplateColumn | ""> = {};
      for (const h of hdrs) auto[h] = guessColumn(h) ?? "";
      setMapping(auto);
      setStage("parsed");
    } catch {
      setParseError("Couldn't read that file. Make sure it matches the template format.");
    }
  }

  // For JSON already in our internal shape, header names ARE the field
  // names (category, difficulty, type, prompt, ...) - map them straight
  // through rather than via the flat-column aliases.
  function guessInternalKey(header: string): TemplateColumn | "" {
    const map: Record<string, TemplateColumn> = {
      prompt: "Question",
      category: "Category",
      difficulty: "Difficulty",
      type: "Question Type",
      options: "Options",
      correctAnswer: "Correct Answer",
      passage: "Passage",
      expectedAnswer: "Expected Answer",
      explanation: "Explanation",
      scoringCriteria: "Scoring Criteria",
      timeLimitSeconds: "Time Limit Seconds",
      isActive: "Active",
    };
    return map[header] ?? "";
  }

  function buildMappedQuestions(): ImportableQuestion[] {
    return rawRows.map((raw) => {
      const flat: FlatQuestionRow = {};
      for (const [header, col] of Object.entries(mapping)) {
        if (!col) continue;
        const value = raw[header];
        (flat as Record<string, unknown>)[col] = Array.isArray(value) ? value.join(" | ") : value;
      }
      return rowToQuestion(flat);
    });
  }

  async function runValidate() {
    setValidating(true);
    setImportError(null);
    setImportResult(null);
    try {
      const questions = buildMappedQuestions();
      const res = await fetch("/api/admin/questions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, allowDuplicates: !skipDuplicates }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error ?? "Validation failed.");
        return;
      }
      setValidateResult(data);
      setStage("validated");
    } catch {
      setParseError("Validation failed.");
    } finally {
      setValidating(false);
    }
  }

  async function runImport() {
    setImporting(true);
    setImportError(null);
    try {
      const questions = buildMappedQuestions();
      // Batch in chunks of 150 - a single request with thousands of rows
      // risks a slow request; this mirrors how every large import in this
      // project has been done.
      const BATCH = 150;
      let inserted = 0, duplicateCount = 0, errorCount = 0;
      for (let i = 0; i < questions.length; i += BATCH) {
        const batch = questions.slice(i, i + BATCH);
        const res = await fetch("/api/admin/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: batch, allowDuplicates: !skipDuplicates }),
        });
        const data = await res.json();
        if (!res.ok) {
          setImportError(data.error ?? "Import failed partway through.");
          break;
        }
        inserted += data.inserted;
        duplicateCount += data.duplicateCount;
        errorCount += data.errorCount;
      }
      setImportResult({ inserted, duplicateCount, errorCount });
      setStage("done");
      if (inserted > 0) onImported();
    } catch {
      setImportError("Import failed.");
    } finally {
      setImporting(false);
    }
  }

  const requiredMapped = ["Question", "Category", "Difficulty", "Question Type", "Time Limit Seconds"].every((c) =>
    Object.values(mapping).includes(c as TemplateColumn)
  );

  return (
    <div className="card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-ink-900">Bulk Import &amp; Export (file)</h2>
          <p className="mt-1 text-xs text-slate-500">
            Upload XLSX, CSV, JSON or TXT. Full workflow: upload → preview → map fields → validate → confirm → import.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <a href="/api/admin/questions/template?format=xlsx" className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
            Download Template (XLSX)
          </a>
          <a href="/api/admin/questions/template?format=csv" className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
            Download Template (CSV)
          </a>
          <a href="/api/admin/questions/export?format=xlsx" className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
            Export Question Bank (XLSX)
          </a>
          <a href="/api/admin/questions/export?format=csv" className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
            Export Question Bank (CSV)
          </a>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.json,.txt"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
          className="text-sm"
        />
        {fileName && <span className="text-xs text-slate-500">{fileName}</span>}
        {stage !== "idle" && (
          <button onClick={reset} className="text-xs font-medium text-slate-500 hover:underline">
            Start over
          </button>
        )}
      </div>

      {parseError && <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{parseError}</p>}

      {(stage === "parsed" || stage === "validated" || stage === "done") && rawRows.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-ink-900">
            Step 1: Field mapping - {rawRows.length} row{rawRows.length === 1 ? "" : "s"} detected
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Columns were auto-detected where possible. Fix any that are wrong before validating.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {headers.map((h) => (
              <label key={h} className="flex flex-col text-xs text-slate-600">
                <span className="truncate font-medium text-ink-900">{h}</span>
                <select
                  value={mapping[h] ?? ""}
                  onChange={(e) => setMapping({ ...mapping, [h]: e.target.value as TemplateColumn | "" })}
                  className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">(ignore this column)</option>
                  {TEMPLATE_COLUMNS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {!requiredMapped && (
            <p className="mt-2 text-xs text-amber-700">
              Map at least: Question, Category, Difficulty, Question Type and Time Limit Seconds before validating.
            </p>
          )}

          <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr>{headers.map((h) => <th key={h} className="px-2 py-1.5 font-medium text-slate-600">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rawRows.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    {headers.map((h) => (
                      <td key={h} className="max-w-[200px] truncate px-2 py-1.5 text-slate-700">{String(r[h] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rawRows.length > 5 && <p className="px-2 py-1.5 text-xs text-slate-400">...and {rawRows.length - 5} more row(s).</p>}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-ink-900">
              <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
              Skip near-duplicate questions
            </label>
            <button
              onClick={runValidate}
              disabled={!requiredMapped || validating}
              className="btn-primary text-sm disabled:opacity-60"
            >
              {validating ? "Checking..." : "Step 2: Validate & check duplicates"}
            </button>
          </div>
        </div>
      )}

      {(stage === "validated" || stage === "done") && validateResult && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-ink-900">Step 3: Import summary</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            <div className="rounded-md bg-slate-50 px-3 py-2"><div className="text-lg font-bold text-ink-900">{validateResult.total}</div><div className="text-xs text-slate-500">Total rows</div></div>
            <div className="rounded-md bg-green-50 px-3 py-2"><div className="text-lg font-bold text-green-700">{validateResult.valid}</div><div className="text-xs text-slate-500">New / ready</div></div>
            <div className="rounded-md bg-amber-50 px-3 py-2"><div className="text-lg font-bold text-amber-700">{validateResult.duplicateCount}</div><div className="text-xs text-slate-500">Duplicates</div></div>
            <div className="rounded-md bg-red-50 px-3 py-2"><div className="text-lg font-bold text-red-700">{validateResult.errorCount}</div><div className="text-xs text-slate-500">Errors</div></div>
            <div className="rounded-md bg-brand-50 px-3 py-2"><div className="text-lg font-bold text-brand-700">{validateResult.wouldInsert}</div><div className="text-xs text-slate-500">Will import</div></div>
          </div>

          {validateResult.results.some((r) => r.status === "duplicate") && (
            <details className="mt-3 text-xs text-slate-600">
              <summary className="cursor-pointer font-medium">Show duplicate rows (skipped)</summary>
              <ul className="mt-2 space-y-0.5">
                {validateResult.results.filter((r) => r.status === "duplicate").slice(0, 30).map((r) => (
                  <li key={r.index}>Row {r.index + 1}: &quot;{r.prompt.slice(0, 70)}&quot; - too similar to existing content.</li>
                ))}
              </ul>
            </details>
          )}
          {validateResult.results.some((r) => r.status === "error") && (
            <details className="mt-3 text-xs text-red-700" open>
              <summary className="cursor-pointer font-medium">Show errors</summary>
              <ul className="mt-2 space-y-0.5">
                {validateResult.results.filter((r) => r.status === "error").slice(0, 30).map((r) => (
                  <li key={r.index}>Row {r.index + 1}: {r.error}</li>
                ))}
              </ul>
            </details>
          )}

          {stage === "validated" && (
            <button onClick={runImport} disabled={importing || validateResult.wouldInsert === 0} className="btn-primary mt-4 text-sm disabled:opacity-60">
              {importing ? "Importing..." : `Step 4: Import ${validateResult.wouldInsert} question${validateResult.wouldInsert === 1 ? "" : "s"} (disabled, pending review)`}
            </button>
          )}
        </div>
      )}

      {importError && <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{importError}</p>}

      {stage === "done" && importResult && (
        <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Done. Imported <strong>{importResult.inserted}</strong> question{importResult.inserted === 1 ? "" : "s"} (disabled, pending your review) -{" "}
          {importResult.duplicateCount} skipped as duplicates, {importResult.errorCount} error{importResult.errorCount === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}
