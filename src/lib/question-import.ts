// Shared core for every question-bank import path (the original paste-JSON
// box, the manual single-question form, and the new bulk file-upload
// workflow) and for its dry-run preview - one function, called with
// insert:false for "show me what would happen" and insert:true for the
// real thing, so preview and reality can never drift apart.

import { db } from "@/lib/db";
import { validateQuestionFields } from "@/lib/question-validation";
import { findSimilar, questionSignature } from "@/lib/question-dedup";

export interface QuestionInput {
  category: string;
  difficulty: string;
  type: string;
  prompt: string;
  passage?: string | null;
  options?: string[] | null;
  correctAnswer?: string | null;
  expectedAnswer?: string | null;
  explanation?: string | null;
  scoringCriteria?: string | null;
  timeLimitSeconds: number;
  isActive?: boolean;
}

export interface RowResult {
  index: number;
  status: "valid" | "duplicate" | "error";
  prompt: string;
  error?: string;
  matchedExisting?: string;
  matchedInBatch?: number;
}

export interface ProcessOptions {
  insert: boolean;
  // When true, near-duplicate matches are reported (status stays "valid")
  // instead of being skipped - lets an admin knowingly import something
  // that looks similar to existing content.
  allowDuplicates?: boolean;
}

export interface ProcessOutcome {
  results: RowResult[];
  insertedCount: number;
}

export async function processQuestionBatch(inputs: unknown[], options: ProcessOptions): Promise<ProcessOutcome> {
  const results: RowResult[] = [];
  const toInsert: (QuestionInput & { signature: string })[] = [];
  const existingByCategory = new Map<string, { id: string; signature: string }[]>();

  for (const [index, raw] of inputs.entries()) {
    const promptForDisplay = (raw as { prompt?: unknown })?.prompt;
    const promptText = typeof promptForDisplay === "string" ? promptForDisplay : "";

    if (!raw || typeof raw !== "object") {
      results.push({ index, status: "error", prompt: promptText, error: "Not a valid question object." });
      continue;
    }
    const q = raw as QuestionInput;
    const validationError = validateQuestionFields(q);
    if (validationError) {
      results.push({ index, status: "error", prompt: q.prompt ?? "", error: validationError });
      continue;
    }

    if (!options.allowDuplicates) {
      if (!existingByCategory.has(q.category)) {
        const existing = await db.practiceQuestion.findMany({
          where: { category: q.category },
          select: { id: true, prompt: true, passage: true },
        });
        existingByCategory.set(
          q.category,
          existing.map((e) => ({ id: e.id, signature: questionSignature(e) }))
        );
      }
      const existingForCategory = existingByCategory.get(q.category)!;
      const signature = questionSignature(q);

      const existingMatches = findSimilar(signature, existingForCategory.map((e) => e.signature));
      if (existingMatches.length > 0) {
        results.push({
          index,
          status: "duplicate",
          prompt: q.prompt,
          matchedExisting: existingForCategory[existingMatches[0].index].id,
        });
        continue;
      }

      const batchSignatures = toInsert.filter((t) => t.category === q.category).map((t) => t.signature);
      const batchMatches = findSimilar(signature, batchSignatures);
      if (batchMatches.length > 0) {
        results.push({ index, status: "duplicate", prompt: q.prompt, matchedInBatch: batchMatches[0].index });
        continue;
      }

      toInsert.push({ ...q, signature });
    } else {
      toInsert.push({ ...q, signature: questionSignature(q) });
    }
    results.push({ index, status: "valid", prompt: q.prompt });
  }

  let insertedCount = 0;
  if (options.insert && toInsert.length > 0) {
    await db.practiceQuestion.createMany({
      data: toInsert.map((q) => ({
        category: q.category,
        difficulty: q.difficulty,
        type: q.type,
        prompt: q.prompt,
        passage: q.passage ?? null,
        options: q.options ? JSON.stringify(q.options) : null,
        correctAnswer: q.correctAnswer ?? null,
        expectedAnswer: q.expectedAnswer ?? null,
        explanation: q.explanation ?? null,
        scoringCriteria: q.scoringCriteria ?? null,
        timeLimitSeconds: q.timeLimitSeconds,
        isActive: q.isActive ?? true,
        source: "SEEDED",
      })),
    });
    insertedCount = toInsert.length;
  } else if (!options.insert) {
    insertedCount = toInsert.length; // "would insert" count for a dry run
  }

  return { results, insertedCount };
}
