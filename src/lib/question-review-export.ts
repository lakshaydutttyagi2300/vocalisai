import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { DIFFICULTIES, PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { bankWhere, findDuplicates, type BankFilters } from "@/lib/question-bank-admin";

// One Excel workbook for reviewing the question bank by hand: a Summary,
// every possible duplicate together, then one sheet per category. The ID
// column lets an admin find a question again; "Duplicate group" is the same
// number for questions with the same text (ignoring case and spacing).

const COLUMNS = [
  "ID", "Duplicate group", "Copy (1 = oldest)", "Category", "Difficulty", "Type", "Question", "Passage", "Options",
  "Correct Answer", "Explanation", "Status", "Subject", "Skill", "Exams", "Times answered", "Created",
];
const WIDTHS: Record<string, number> = { ID: 27, Question: 60, Passage: 40, Options: 40, "Correct Answer": 24, Explanation: 50 };

function optionsText(raw: string | null): string {
  if (!raw) return "";
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).join(" | ") : String(parsed);
  } catch {
    return raw;
  }
}

/** Excel sheet names: at most 31 characters, none of []:*?/\ and unique. */
function sheetName(label: string, used: Set<string>): string {
  const base = label.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Sheet";
  let name = base;
  for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base.slice(0, 27)} (${n})`;
  used.add(name.toLowerCase());
  return name;
}

function sheet(rows: (string | number)[][], filter = true) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = (rows[0] ?? []).map((h) => ({ wch: WIDTHS[String(h)] ?? 16 }));
  if (filter) ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length - 1, 0), c: (rows[0]?.length ?? 1) - 1 } }) };
  return ws;
}

export async function buildReviewWorkbook(filters: BankFilters = {}): Promise<Buffer> {
  const dupes = await findDuplicates();
  const questions = await db.practiceQuestion.findMany({
    where: await bankWhere(filters, dupes),
    select: {
      id: true, category: true, difficulty: true, type: true, prompt: true, passage: true, options: true, correctAnswer: true,
      explanation: true, isActive: true, createdAt: true,
      subject: { select: { name: true } },
      catalogSkill: { select: { name: true } },
      exams: { select: { exam: { select: { name: true } } } },
      _count: { select: { attempts: true } },
    },
  });

  const label = (c: string) => PRACTICE_MODES.find((m) => m.category === c)?.label ?? c;
  const level = (d: string) => (DIFFICULTIES as readonly string[]).indexOf(d);
  const textKey = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const row = (q: (typeof questions)[number]) => [
    q.id, dupes.group.get(q.id) ?? "", dupes.copy.get(q.id) ?? "", label(q.category), q.difficulty, q.type, q.prompt, q.passage ?? "",
    optionsText(q.options), q.correctAnswer ?? "", q.explanation ?? "", q.isActive ? "Active" : "Disabled",
    q.subject?.name ?? "", q.catalogSkill?.name ?? "", q.exams.map((e) => e.exam.name).join("; "), q._count.attempts,
    q.createdAt.toISOString().slice(0, 10),
  ];

  // Category sheets: by level, then alphabetically so similar questions sit together.
  const byCategory = new Map<string, typeof questions>();
  for (const q of questions) byCategory.set(q.category, [...(byCategory.get(q.category) ?? []), q]);
  const categories = [...byCategory.keys()].sort((a, b) => label(a).localeCompare(label(b)));

  const duplicates = questions
    .filter((q) => dupes.group.has(q.id))
    .sort((a, b) => dupes.group.get(a.id)! - dupes.group.get(b.id)! || dupes.copy.get(a.id)! - dupes.copy.get(b.id)!);

  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  const summary: (string | number)[][] = [
    ["Category", "Questions", "Active", "In a duplicate group"],
    ...categories.map((c) => {
      const qs = byCategory.get(c)!;
      return [label(c), qs.length, qs.filter((q) => q.isActive).length, qs.filter((q) => dupes.group.has(q.id)).length];
    }),
    ["All", questions.length, questions.filter((q) => q.isActive).length, duplicates.length],
    [],
    ["Questions with the same text (ignoring capitals and spaces) share a Duplicate group number. Copy 1 is the oldest."],
    ["To remove extra copies: Admin -> Questions -> tick 'Duplicates only' -> 'Select the extra copies' -> Delete selected."],
  ];
  XLSX.utils.book_append_sheet(wb, sheet(summary, false), sheetName("Summary", used));
  XLSX.utils.book_append_sheet(wb, sheet([COLUMNS, ...duplicates.map(row)]), sheetName("Possible duplicates", used));
  for (const c of categories) {
    const qs = byCategory.get(c)!.sort((a, b) => level(a.difficulty) - level(b.difficulty) || textKey(a.prompt).localeCompare(textKey(b.prompt)));
    XLSX.utils.book_append_sheet(wb, sheet([COLUMNS, ...qs.map(row)]), sheetName(label(c), used));
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true }) as Buffer;
}
