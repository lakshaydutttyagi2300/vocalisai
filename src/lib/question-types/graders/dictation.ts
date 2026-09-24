// DICTATION: type exactly what was heard. correctAnswerRaw is the
// expected transcript. Graded on a normalized exact match (case folded,
// whitespace collapsed, trimmed) rather than raw string equality - real
// dictation answers legitimately vary in incidental whitespace/casing
// without that being a genuine mistake, but this is still a strict
// content match, not a fuzzy one.
import { z } from "zod";
import { binaryGrade, NOT_GRADED, type QuestionTypeDef } from "../types";

export const dictationAnswerSchema = z.string();
export type DictationAnswer = z.infer<typeof dictationAnswerSchema>;

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export const dictationGrader: QuestionTypeDef<DictationAnswer> = {
  key: "DICTATION",
  label: "Dictation",
  answerSchema: dictationAnswerSchema,
  autoGradable: true,
  grade(answer, correctAnswerRaw) {
    if (!correctAnswerRaw) return NOT_GRADED;
    return binaryGrade(normalize(answer) === normalize(correctAnswerRaw));
  },
  importColumns: [],
};
