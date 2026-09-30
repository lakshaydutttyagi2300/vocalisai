// Admin management of the exam catalogue and its question bank
// (docs/CATALOGUE.md). Server-only; every caller has passed requireAdmin().

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { DIFFICULTIES, PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { getQuestionTypeDef } from "@/lib/question-types";
import { TEST_QUESTION_TYPES } from "@/lib/practice-bank";

export class CatalogAdminError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

/** Category of a question whose subject has no older bank: kept out of the older practice modes. */
export const CATALOG_ONLY_CATEGORY = "CATALOG";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lower-case letters, numbers and hyphens.").max(60);
const name = z.string().trim().min(1, "Enter a name.").max(120);
const text = z.string().trim().max(1000).nullish();

export const categorySchema = z.object({ name, slug: slug.optional(), description: text, sortOrder: z.number().int().min(0).max(9999).default(0), isActive: z.boolean().default(true) });
export const examSchema = z.object({
  categoryId: z.string().min(1).max(40),
  name,
  slug: slug.optional(),
  description: text,
  keywords: z.string().trim().max(300).nullish(),
  isPopular: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
  mockMinutes: z.number().int().min(1).max(600).nullish(),
  subjects: z.array(z.object({ subjectId: z.string().min(1).max(40), mockQuestionCount: z.number().int().min(0).max(300).default(10) })).max(40).optional(),
});
export const subjectSchema = z.object({
  name,
  slug: slug.optional(),
  description: text,
  legacyCategory: z.enum(PRACTICE_MODES.map((m) => m.category) as [string, ...string[]]).nullish(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});
export const skillSchema = z.object({ subjectId: z.string().min(1).max(40), name, slug: slug.optional(), description: text, sortOrder: z.number().int().min(0).max(9999).default(0), isActive: z.boolean().default(true) });

export const KINDS = ["categories", "exams", "subjects", "skills"] as const;
export type Kind = (typeof KINDS)[number];

function uniqueError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new CatalogAdminError("That short name (slug) is already used. Choose another.", 409);
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") throw new CatalogAdminError("A linked item doesn't exist.", 400);
  throw err;
}

async function setExamSubjects(examId: string, subjects: { subjectId: string; mockQuestionCount: number }[]) {
  await db.$transaction([
    db.catalogExamSubject.deleteMany({ where: { examId } }),
    db.catalogExamSubject.createMany({ data: subjects.map((s, i) => ({ examId, subjectId: s.subjectId, mockQuestionCount: s.mockQuestionCount, sortOrder: i })) }),
  ]);
}

export async function createItem(kind: Kind, body: unknown) {
  try {
    switch (kind) {
      case "categories": {
        const d = categorySchema.parse(body);
        return await db.catalogCategory.create({ data: { ...d, slug: d.slug ?? slugify(d.name) } });
      }
      case "exams": {
        const { subjects, ...d } = examSchema.parse(body);
        const exam = await db.catalogExam.create({ data: { ...d, slug: d.slug ?? slugify(d.name) } });
        if (subjects) await setExamSubjects(exam.id, subjects);
        return exam;
      }
      case "subjects": {
        const d = subjectSchema.parse(body);
        return await db.catalogSubject.create({ data: { ...d, slug: d.slug ?? slugify(d.name) } });
      }
      case "skills": {
        const d = skillSchema.parse(body);
        return await db.catalogSkill.create({ data: { ...d, slug: d.slug ?? slugify(d.name) } });
      }
    }
  } catch (err) {
    if (err instanceof z.ZodError) throw new CatalogAdminError(err.issues[0]?.message ?? "Check the form.");
    uniqueError(err);
  }
}

export async function updateItem(kind: Kind, id: string, body: unknown) {
  try {
    switch (kind) {
      case "categories":
        return await db.catalogCategory.update({ where: { id }, data: categorySchema.partial().parse(body) });
      case "exams": {
        const { subjects, ...d } = examSchema.partial().parse(body);
        const exam = await db.catalogExam.update({ where: { id }, data: d });
        if (subjects) await setExamSubjects(id, subjects);
        return exam;
      }
      case "subjects":
        return await db.catalogSubject.update({ where: { id }, data: subjectSchema.partial().parse(body) });
      case "skills":
        return await db.catalogSkill.update({ where: { id }, data: skillSchema.partial().parse(body) });
    }
  } catch (err) {
    if (err instanceof z.ZodError) throw new CatalogAdminError(err.issues[0]?.message ?? "Check the form.");
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") throw new CatalogAdminError("That item no longer exists.", 404);
    uniqueError(err);
  }
}

/** Deletes only what nothing depends on; anything in use must be switched off instead. */
export async function deleteItem(kind: Kind, id: string) {
  const inUse = "It's in use. Switch it off instead, so history is kept.";
  switch (kind) {
    case "categories":
      if (await db.catalogExam.count({ where: { categoryId: id } })) throw new CatalogAdminError("This category still has exams. Move or delete them first, or switch the category off.", 409);
      await db.catalogCategory.delete({ where: { id } });
      return;
    case "exams":
      if (await db.practiceTest.count({ where: { examId: id } })) throw new CatalogAdminError(inUse, 409);
      await db.catalogExam.delete({ where: { id } });
      return;
    case "subjects":
      if ((await db.practiceQuestion.count({ where: { subjectId: id } })) || (await db.practiceTest.count({ where: { subjectId: id } }))) throw new CatalogAdminError(inUse, 409);
      await db.catalogSubject.delete({ where: { id } });
      return;
    case "skills":
      if ((await db.practiceQuestion.count({ where: { catalogSkillId: id } })) || (await db.practiceTest.count({ where: { catalogSkillId: id } }))) throw new CatalogAdminError(inUse, 409);
      await db.catalogSkill.delete({ where: { id } });
      return;
  }
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export const QUESTION_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export function statusOf(q: { isActive: boolean; archivedAt: Date | null }): QuestionStatus {
  return q.archivedAt ? "ARCHIVED" : q.isActive ? "ACTIVE" : "INACTIVE";
}

function statusData(status: QuestionStatus) {
  return status === "ARCHIVED" ? { isActive: false, archivedAt: new Date() } : { isActive: status === "ACTIVE", archivedAt: null };
}

export const questionSchema = z.object({
  subjectId: z.string().min(1).max(40),
  skillId: z.string().min(1).max(40).nullish(),
  examIds: z.array(z.string().min(1).max(40)).max(100).default([]),
  difficulty: z.enum(DIFFICULTIES),
  type: z.enum(TEST_QUESTION_TYPES as [string, ...string[]]),
  prompt: z.string().trim().min(1, "Enter the question.").max(5000),
  passage: z.string().trim().max(20000).nullish(),
  options: z.array(z.string().trim().min(1).max(1000)).max(12).nullish(),
  correctAnswer: z.string().trim().min(1, "Enter the correct answer.").max(5000),
  explanation: z.string().trim().max(5000).nullish(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  status: z.enum(QUESTION_STATUSES).default("ACTIVE"),
  timeLimitSeconds: z.number().int().min(10).max(3600).default(60),
});
export type QuestionInput = z.infer<typeof questionSchema>;

const CHOICE_TYPES = new Set(["MULTIPLE_CHOICE", "READING_COMPREHENSION", "LISTENING_COMPREHENSION", "MATCHING"]);
const FIXED_OPTIONS: Record<string, string[]> = { TRUE_FALSE_NOT_GIVEN: ["TRUE", "FALSE", "NOT_GIVEN"], YES_NO_NOT_GIVEN: ["YES", "NO", "NOT_GIVEN"] };

/** The answer a candidate would give to be right, built from the stored correct answer - null if it can't be. */
function idealAnswer(type: string, correct: string): unknown {
  if (CHOICE_TYPES.has(type) || FIXED_OPTIONS[type]) return correct;
  try {
    const parsed = JSON.parse(correct);
    if (type === "GAP_FILL") return Array.isArray(parsed) ? parsed.map((b) => (Array.isArray(b) ? String(b[0]) : String(b))) : null;
    if (type === "NUMERIC_ENTRY") return typeof parsed?.value === "number" ? parsed.value : null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Checks a question can really be answered and marked: options where the
 * type needs them, and a correct answer that the type's own marker accepts.
 * Returns a plain-English problem, or null when it's fine.
 */
export function questionProblem(q: Pick<QuestionInput, "type" | "options" | "correctAnswer">): string | null {
  const options = q.options ?? [];
  if (CHOICE_TYPES.has(q.type) || q.type === "MULTI_SELECT") {
    if (options.length < 2) return "Add at least two options.";
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return "Options must all be different.";
  }
  if (CHOICE_TYPES.has(q.type) && !options.includes(q.correctAnswer)) return "The correct answer must match one of the options exactly.";
  if (FIXED_OPTIONS[q.type] && !FIXED_OPTIONS[q.type].includes(q.correctAnswer)) return `The correct answer must be one of ${FIXED_OPTIONS[q.type].join(", ")}.`;
  const def = getQuestionTypeDef(q.type);
  const ideal = idealAnswer(q.type, q.correctAnswer);
  const parsed = def?.answerSchema.safeParse(ideal);
  if (!def || !parsed?.success || def.grade(parsed.data, q.correctAnswer).isCorrect !== true) {
    return q.type === "GAP_FILL"
      ? 'For gap fill, write the answer as JSON: one list of accepted answers per blank, e.g. [["a","an"],["comfortable"]].'
      : q.type === "NUMERIC_ENTRY"
        ? 'For numeric entry, write the answer as JSON, e.g. {"value": 42} or {"value": 3.5, "tolerance": 0.1}.'
        : q.type === "MULTI_SELECT" || q.type === "ORDERING"
          ? 'Write the answer as a JSON list, e.g. ["first","second"].'
          : "The correct answer doesn't mark as correct for this question type.";
  }
  if (q.type === "MULTI_SELECT" && !(ideal as string[]).every((a) => options.includes(a))) return "Every correct answer must be one of the options.";
  return null;
}

async function resolveQuestion(input: QuestionInput) {
  const subject = await db.catalogSubject.findUnique({ where: { id: input.subjectId }, select: { id: true, legacyCategory: true } });
  if (!subject) throw new CatalogAdminError("Choose a subject that exists.");
  if (input.skillId && !(await db.catalogSkill.findFirst({ where: { id: input.skillId, subjectId: subject.id } }))) throw new CatalogAdminError("That skill isn't part of the chosen subject.");
  if (input.examIds.length && (await db.catalogExam.count({ where: { id: { in: input.examIds } } })) !== new Set(input.examIds).size) throw new CatalogAdminError("One of the chosen exams doesn't exist.");
  const problem = questionProblem(input);
  if (problem) throw new CatalogAdminError(problem);
  return subject;
}

function questionData(input: QuestionInput, legacyCategory: string | null) {
  return {
    category: legacyCategory ?? CATALOG_ONLY_CATEGORY,
    subjectId: input.subjectId,
    catalogSkillId: input.skillId ?? null,
    difficulty: input.difficulty,
    type: input.type,
    prompt: input.prompt,
    passage: input.passage ?? null,
    options: CHOICE_TYPES.has(input.type) || input.type === "MULTI_SELECT" || input.type === "ORDERING" ? JSON.stringify(input.options ?? []) : null,
    correctAnswer: input.correctAnswer,
    explanation: input.explanation ?? null,
    tags: [...new Set(input.tags.map((t) => t.toLowerCase()))],
    timeLimitSeconds: input.timeLimitSeconds,
    ...statusData(input.status),
  };
}

/** Same question text already in this subject at this level (exact, ignoring case and spacing). */
async function duplicateOf(input: QuestionInput, exceptId?: string) {
  const clash = await db.practiceQuestion.findFirst({
    where: { subjectId: input.subjectId, difficulty: input.difficulty, prompt: { equals: input.prompt, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  return clash?.id ?? null;
}

export async function createQuestion(body: unknown) {
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) throw new CatalogAdminError(parsed.error.issues[0]?.message ?? "Check the question.");
  const input = parsed.data;
  const subject = await resolveQuestion(input);
  if (await duplicateOf(input)) throw new CatalogAdminError("This question already exists in this subject at this level.", 409);
  return db.practiceQuestion.create({
    data: { ...questionData(input, subject.legacyCategory), source: "SEEDED", exams: { create: [...new Set(input.examIds)].map((examId) => ({ examId })) } },
    select: { id: true },
  });
}

export async function updateQuestion(id: string, body: unknown) {
  const existing = await db.practiceQuestion.findUnique({ where: { id }, include: { exams: { select: { examId: true } } } });
  if (!existing || !existing.subjectId) throw new CatalogAdminError("That question isn't part of the exam catalogue.", 404);
  const current: QuestionInput = {
    subjectId: existing.subjectId,
    skillId: existing.catalogSkillId,
    examIds: existing.exams.map((e) => e.examId),
    difficulty: existing.difficulty as QuestionInput["difficulty"],
    type: existing.type,
    prompt: existing.prompt,
    passage: existing.passage,
    options: existing.options ? (JSON.parse(existing.options) as string[]) : null,
    correctAnswer: existing.correctAnswer ?? "",
    explanation: existing.explanation,
    tags: existing.tags,
    status: statusOf(existing),
    timeLimitSeconds: existing.timeLimitSeconds,
  };
  const parsed = questionSchema.safeParse({ ...current, ...(body as object) });
  if (!parsed.success) throw new CatalogAdminError(parsed.error.issues[0]?.message ?? "Check the question.");
  const input = parsed.data;
  const subject = await resolveQuestion(input);
  if (await duplicateOf(input, id)) throw new CatalogAdminError("This question already exists in this subject at this level.", 409);
  const data = questionData(input, subject.legacyCategory);
  // Keep the original archive date when it stays archived.
  if (input.status === "ARCHIVED" && existing.archivedAt) data.archivedAt = existing.archivedAt;
  await db.$transaction([
    db.practiceQuestion.update({ where: { id }, data }),
    db.questionExam.deleteMany({ where: { questionId: id } }),
    db.questionExam.createMany({ data: [...new Set(input.examIds)].map((examId) => ({ questionId: id, examId })) }),
  ]);
  return { before: current, after: input };
}

/** Deletes a never-answered question; one with answers is archived instead so history stays intact. */
export async function removeQuestion(id: string): Promise<"deleted" | "archived"> {
  const q = await db.practiceQuestion.findUnique({ where: { id }, select: { subjectId: true, _count: { select: { attempts: true, itemResponses: true } } } });
  if (!q?.subjectId) throw new CatalogAdminError("That question isn't part of the exam catalogue.", 404);
  if (q._count.attempts + q._count.itemResponses > 0) {
    await db.practiceQuestion.update({ where: { id }, data: statusData("ARCHIVED") });
    return "archived";
  }
  await db.practiceQuestion.delete({ where: { id } });
  return "deleted";
}

export interface QuestionStats {
  timesServed: number;
  candidates: number;
  attempts: number;
  correct: number;
  accuracy: number | null;
  avgSeconds: number | null;
}

/** Usage and performance for a set of questions. */
export async function questionStats(ids: string[]): Promise<Map<string, QuestionStats>> {
  if (ids.length === 0) return new Map();
  const [seen, attempts, correct] = await Promise.all([
    db.questionSeen.groupBy({ by: ["questionId"], where: { questionId: { in: ids } }, _sum: { timesSeen: true }, _count: { _all: true } }),
    db.practiceAttempt.groupBy({ by: ["questionId"], where: { questionId: { in: ids } }, _count: { _all: true }, _avg: { timeTakenSeconds: true } }),
    db.practiceAttempt.groupBy({ by: ["questionId"], where: { questionId: { in: ids }, isCorrect: true }, _count: { _all: true } }),
  ]);
  const seenBy = new Map(seen.map((s) => [s.questionId, s]));
  const attemptsBy = new Map(attempts.map((a) => [a.questionId, a]));
  const correctBy = new Map(correct.map((c) => [c.questionId, c._count._all]));
  return new Map(
    ids.map((id) => {
      const a = attemptsBy.get(id);
      const n = a?._count._all ?? 0;
      const c = correctBy.get(id) ?? 0;
      return [
        id,
        {
          timesServed: seenBy.get(id)?._sum.timesSeen ?? 0,
          candidates: seenBy.get(id)?._count._all ?? 0,
          attempts: n,
          correct: c,
          accuracy: n ? Math.round((c / n) * 100) : null,
          avgSeconds: a?._avg.timeTakenSeconds != null ? Math.round(a._avg.timeTakenSeconds) : null,
        },
      ];
    })
  );
}

// ---------------------------------------------------------------------------
// Bulk import: one spreadsheet row per question. Subjects, skills and exams
// are referred to by their short names (slugs); lists use ";" or "|".
// ---------------------------------------------------------------------------

export const IMPORT_COLUMNS = ["subject", "skill", "exams", "difficulty", "type", "question", "passage", "options", "correctAnswer", "explanation", "tags", "status", "timeLimitSeconds"] as const;
export const IMPORT_MAX_ROWS = 2000;

export type ImportRow = Partial<Record<(typeof IMPORT_COLUMNS)[number], unknown>>;

export interface ImportResult {
  total: number;
  valid: number;
  created: number;
  errors: { row: number; message: string }[];
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  // Spreadsheets read TRUE/FALSE cells as yes/no values; keep them as the words.
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return String(v).trim();
}

function list(v: unknown, sep: RegExp): string[] {
  const raw = cell(v);
  if (!raw) return [];
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean);
    } catch {
      // not JSON - split instead
    }
  }
  return raw.split(sep).map((x) => x.trim()).filter(Boolean);
}

/** Checks every row; saves them only when all are valid and `dryRun` is false. */
export async function importQuestions(rows: ImportRow[], dryRun: boolean): Promise<ImportResult> {
  if (rows.length > IMPORT_MAX_ROWS) throw new CatalogAdminError(`Import at most ${IMPORT_MAX_ROWS} questions at a time.`);
  const [subjects, skills, exams] = await Promise.all([
    db.catalogSubject.findMany({ select: { id: true, slug: true, legacyCategory: true } }),
    db.catalogSkill.findMany({ select: { id: true, slug: true, subjectId: true } }),
    db.catalogExam.findMany({ select: { id: true, slug: true } }),
  ]);
  const subjectBySlug = new Map(subjects.map((s) => [s.slug, s]));
  const skillByKey = new Map(skills.map((k) => [`${k.subjectId}:${k.slug}`, k.id]));
  const examBySlug = new Map(exams.map((e) => [e.slug, e.id]));

  const errors: ImportResult["errors"] = [];
  const ready: { input: QuestionInput; legacyCategory: string | null }[] = [];
  const seenInFile = new Set<string>();

  for (const [i, row] of rows.entries()) {
    const n = i + 2; // spreadsheet row number, after the header
    const subject = subjectBySlug.get(cell(row.subject).toLowerCase());
    if (!subject) {
      errors.push({ row: n, message: `Unknown subject "${cell(row.subject)}".` });
      continue;
    }
    const skillSlug = cell(row.skill).toLowerCase();
    const skillId = skillSlug ? skillByKey.get(`${subject.id}:${skillSlug}`) : null;
    if (skillSlug && !skillId) {
      errors.push({ row: n, message: `Unknown skill "${cell(row.skill)}" in ${subject.slug}.` });
      continue;
    }
    const examSlugs = list(row.exams, /[;|,]/).map((s) => s.toLowerCase());
    const unknownExam = examSlugs.find((s) => !examBySlug.has(s));
    if (unknownExam) {
      errors.push({ row: n, message: `Unknown exam "${unknownExam}".` });
      continue;
    }
    const parsed = questionSchema.safeParse({
      subjectId: subject.id,
      skillId,
      examIds: examSlugs.map((s) => examBySlug.get(s)!),
      difficulty: cell(row.difficulty).toUpperCase(),
      type: (cell(row.type) || "MULTIPLE_CHOICE").toUpperCase(),
      prompt: cell(row.question),
      passage: cell(row.passage) || null,
      options: list(row.options, /\|/),
      correctAnswer: cell(row.correctAnswer),
      explanation: cell(row.explanation) || null,
      tags: list(row.tags, /[;|,]/),
      status: (cell(row.status) || "ACTIVE").toUpperCase(),
      timeLimitSeconds: cell(row.timeLimitSeconds) ? Number(cell(row.timeLimitSeconds)) : 60,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      errors.push({ row: n, message: `${issue?.path.join(".") || "row"}: ${issue?.message ?? "invalid"}` });
      continue;
    }
    const problem = questionProblem(parsed.data);
    if (problem) {
      errors.push({ row: n, message: problem });
      continue;
    }
    const key = `${subject.id}:${parsed.data.difficulty}:${parsed.data.prompt.toLowerCase().replace(/\s+/g, " ")}`;
    if (seenInFile.has(key)) {
      errors.push({ row: n, message: "Repeats an earlier row (same subject, level and question)." });
      continue;
    }
    seenInFile.add(key);
    ready.push({ input: parsed.data, legacyCategory: subject.legacyCategory });
  }

  // Questions already in the bank (same subject, level and text).
  for (const [subjectId, group] of Object.entries(Object.groupBy(ready, (r) => r.input.subjectId))) {
    const existing = await db.practiceQuestion.findMany({ where: { subjectId, prompt: { in: group!.map((g) => g.input.prompt), mode: "insensitive" } }, select: { prompt: true, difficulty: true } });
    const taken = new Set(existing.map((e) => `${e.difficulty}:${e.prompt.toLowerCase()}`));
    for (const g of group!) {
      if (taken.has(`${g.input.difficulty}:${g.input.prompt.toLowerCase()}`)) errors.push({ row: rows.findIndex((r) => cell(r.question) === g.input.prompt) + 2, message: "Already in the question bank." });
    }
  }

  const result: ImportResult = { total: rows.length, valid: rows.length - errors.length, created: 0, errors: errors.sort((a, b) => a.row - b.row) };
  if (dryRun || errors.length > 0) return result;

  for (let start = 0; start < ready.length; start += 200) {
    const chunk = ready.slice(start, start + 200).map((r) => ({ id: crypto.randomUUID(), ...r }));
    await db.$transaction([
      db.practiceQuestion.createMany({ data: chunk.map((r) => ({ id: r.id, source: "SEEDED", ...questionData(r.input, r.legacyCategory) })) }),
      db.questionExam.createMany({ data: chunk.flatMap((r) => [...new Set(r.input.examIds)].map((examId) => ({ questionId: r.id, examId }))) }),
    ]);
    result.created += chunk.length;
  }
  return result;
}
