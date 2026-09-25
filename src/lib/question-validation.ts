// Shared validation for a PracticeQuestion's content fields - used by both
// the bulk-import route (whole new rows) and the single-question edit
// route (partial updates merged onto an existing row), so the two paths
// can never validate a "valid" question differently from each other.

import { isValidDifficulty, PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { QUESTION_TYPE_KEYS } from "@/lib/question-types";
import { validateCorrectAnswerForType } from "@/lib/question-types/correct-answer";

export const VALID_CATEGORIES = new Set(PRACTICE_MODES.map((m) => m.category));

// The 4 original types - the only ones today's practice, mock-test and
// interview-simulation screens can render. Candidate-facing selection in
// api/practice/questions and api/conversations filters to exactly these,
// so a new-type question imported into a shared category (e.g.
// READING_COMPREHENSION) is only ever served by exam runner v2.
export const LEGACY_QUESTION_TYPES = ["MULTIPLE_CHOICE", "READING_COMPREHENSION", "LISTENING_COMPREHENSION", "SHORT_ANSWER"];

// P1-G: every type in the P1-C registry (the 4 above + 12 new).
export const VALID_TYPES = new Set(QUESTION_TYPE_KEYS);

export interface QuestionFields {
  category: string;
  difficulty: string;
  type: string;
  prompt: string;
  options?: string[] | null;
  correctAnswer?: string | null;
  timeLimitSeconds: number;
}

// Validates a fully-assembled question (every field already merged with
// its existing values, for an edit) and returns the first error found, or
// null if it's valid.
export function validateQuestionFields(q: QuestionFields): string | null {
  if (!VALID_CATEGORIES.has(q.category)) return `Invalid category "${q.category}".`;
  if (!isValidDifficulty(q.difficulty)) return `Invalid difficulty "${q.difficulty}".`;
  if (!VALID_TYPES.has(q.type)) return `Invalid type "${q.type}".`;
  if (!q.prompt || typeof q.prompt !== "string" || q.prompt.trim().length < 3) return "Prompt is missing or too short.";
  if (!Number.isFinite(q.timeLimitSeconds) || q.timeLimitSeconds < 5 || q.timeLimitSeconds > 300) {
    return "timeLimitSeconds must be between 5 and 300.";
  }
  if (q.type === "MULTIPLE_CHOICE" || q.type === "READING_COMPREHENSION" || q.type === "LISTENING_COMPREHENSION") {
    if (!Array.isArray(q.options) || q.options.length < 2) return "This type needs at least 2 options.";
    if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
      return "correctAnswer must exactly match one of the options.";
    }
  }
  // The 4 original types keep exactly the rules above; each new type
  // (P1-G) gets its own shape check for its stored correct answer.
  if (!LEGACY_QUESTION_TYPES.includes(q.type)) {
    return validateCorrectAnswerForType(q.type, q.correctAnswer, q.options);
  }
  return null;
}
