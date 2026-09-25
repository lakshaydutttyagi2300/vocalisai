// P1-G: authoring-time validation of a stored correctAnswer for each of
// the 12 new question types - the admin-side counterpart to the P1-C
// graders, which read the same shapes at grading time. Catching a bad
// shape here (at import/edit) means a grader never has to quietly return
// "not graded" for a question that was simply authored wrong.
//
// The 4 original types are NOT handled here - their rules live unchanged
// in question-validation.ts.

import { TFNG_VALUES } from "./graders/true-false-not-given";
import { YNNG_VALUES } from "./graders/yes-no-not-given";

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

export function validateCorrectAnswerForType(
  type: string,
  correctAnswer: string | null | undefined,
  options: string[] | null | undefined
): string | null {
  const raw = correctAnswer ?? null;

  switch (type) {
    case "LONG_WRITING":
    case "TIMED_SPEAKING":
      return null; // never auto-marked - no correct answer needed

    case "TRUE_FALSE_NOT_GIVEN":
      return raw && (TFNG_VALUES as readonly string[]).includes(raw.trim().toUpperCase())
        ? null
        : "correctAnswer must be TRUE, FALSE or NOT_GIVEN.";

    case "YES_NO_NOT_GIVEN":
      return raw && (YNNG_VALUES as readonly string[]).includes(raw.trim().toUpperCase())
        ? null
        : "correctAnswer must be YES, NO or NOT_GIVEN.";

    case "MATCHING":
      if (!isNonEmptyString(raw)) return "correctAnswer is required (the correct label, e.g. \"C\").";
      if (Array.isArray(options) && options.length > 0 && !options.includes(raw)) {
        return "correctAnswer must exactly match one of the options.";
      }
      return null;

    case "DICTATION":
      return isNonEmptyString(raw) ? null : "correctAnswer is required (the exact expected text).";

    case "GAP_FILL": {
      const v = raw ? parseJson(raw) : undefined;
      const ok = Array.isArray(v) && v.length > 0 && v.every((gap) => Array.isArray(gap) && gap.length > 0 && gap.every(isNonEmptyString));
      return ok ? null : 'correctAnswer must be a JSON list of accepted answers per gap, e.g. [["a","an"],["comfortable"]].';
    }

    case "MULTI_SELECT": {
      if (!Array.isArray(options) || options.length < 2) return "This type needs at least 2 options.";
      const v = raw ? parseJson(raw) : undefined;
      if (!Array.isArray(v) || v.length === 0 || !v.every(isNonEmptyString)) {
        return 'correctAnswer must be a JSON list of the correct options, e.g. ["A","C"].';
      }
      return v.every((x) => options.includes(x)) ? null : "Every correct answer must exactly match one of the options.";
    }

    case "ORDERING": {
      if (!Array.isArray(options) || options.length < 2) return "This type needs at least 2 items (in Options) to put in order.";
      const v = raw ? parseJson(raw) : undefined;
      const ok =
        Array.isArray(v) &&
        v.length === options.length &&
        v.every(isNonEmptyString) &&
        [...v].sort().join("\u0000") === [...options].sort().join("\u0000");
      return ok ? null : "correctAnswer must be a JSON list containing every option exactly once, in the correct order.";
    }

    case "LABELLING": {
      if (!Array.isArray(options) || options.length === 0) return "This type needs the label names (e.g. A|B|C) in Options.";
      const v = raw ? parseJson(raw) : undefined;
      if (!v || typeof v !== "object" || Array.isArray(v)) {
        return 'correctAnswer must be a JSON object of label -> word, e.g. {"A":"engine","B":"wheel"}.';
      }
      const entries = Object.entries(v as Record<string, unknown>);
      if (entries.length === 0 || !entries.every(([, w]) => isNonEmptyString(w))) return "Every label needs a non-empty correct word.";
      const keys = entries.map(([k]) => k).sort().join("\u0000");
      return keys === [...options].sort().join("\u0000") ? null : "correctAnswer must have exactly one entry for each label in Options.";
    }

    case "HIGHLIGHT_WORDS": {
      const v = raw ? parseJson(raw) : undefined;
      return Array.isArray(v) && v.length > 0 && v.every(isNonEmptyString)
        ? null
        : 'correctAnswer must be a JSON list of the words to highlight, e.g. ["quickly","carefully"].';
    }

    case "NUMERIC_ENTRY": {
      const v = raw ? (parseJson(raw) as { value?: unknown; tolerance?: unknown } | undefined) : undefined;
      if (!v || typeof v.value !== "number" || !Number.isFinite(v.value)) {
        return 'correctAnswer must be JSON like {"value": 42} or {"value": 42, "tolerance": 2}.';
      }
      if (v.tolerance !== undefined && (typeof v.tolerance !== "number" || !(v.tolerance >= 0))) {
        return "tolerance must be a number of 0 or more.";
      }
      return null;
    }

    default:
      return `Invalid type "${type}".`;
  }
}
