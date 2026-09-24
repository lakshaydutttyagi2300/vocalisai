// Shared types for the question-type registry (P1-C). Kept separate from
// src/lib/practice-taxonomy.ts's QuestionType union on purpose - that
// union is the existing, still-unchanged answer-shape contract every
// current route (api/practice/attempts, api/practice/questions,
// question-validation.ts) already relies on. This registry is a NEW,
// currently-unwired way of describing a much larger set of types (used by
// P1-E's exam runner and P1-G's admin import extension), not a
// replacement for the old one.

import type { z } from "zod";

// Mirrors PracticeAttempt.isCorrect/score exactly (nullable boolean,
// nullable 0-100 int) - the same "a category with no deterministic answer
// gets null, never a fabricated number" discipline as scoring-engine.ts.
export interface GradeResult {
  isCorrect: boolean | null;
  score: number | null;
}

export interface QuestionTypeDef<Answer = unknown> {
  key: string;
  label: string;
  answerSchema: z.ZodType<Answer>;
  autoGradable: boolean;
  // Pure: given the candidate's answer and the question's stored
  // correctAnswer (the raw DB string - JSON-encoded for any non-primitive
  // shape, exactly how PracticeQuestion.options already is), returns a
  // grade. Never throws on a malformed correctAnswer/answer - returns
  // { isCorrect: null, score: null } instead, the same "don't fabricate"
  // rule as everywhere else in this app's scoring.
  grade: (answer: Answer, correctAnswerRaw: string | null) => GradeResult;
  // Column names this type would add to the bulk-import template beyond
  // the existing TEMPLATE_COLUMNS (src/lib/question-file-format.ts) -
  // declared here as metadata for P1-G to wire in; not used by any
  // existing import path yet.
  importColumns: string[];
}

export const NOT_GRADED: GradeResult = { isCorrect: null, score: null };

export function exactMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function binaryGrade(correct: boolean): GradeResult {
  return { isCorrect: correct, score: correct ? 100 : 0 };
}
