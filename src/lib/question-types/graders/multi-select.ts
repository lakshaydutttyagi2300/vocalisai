// MULTI_SELECT: "choose the two/three correct answers" - correctAnswerRaw
// is a JSON array of the correct option strings. Correct iff the
// candidate's selected set exactly matches (order-independent, no
// partial credit for getting some but not all).
import { z } from "zod";
import { binaryGrade, NOT_GRADED, type QuestionTypeDef } from "../types";

export const multiSelectAnswerSchema = z.array(z.string());
export type MultiSelectAnswer = z.infer<typeof multiSelectAnswerSchema>;

function toSet(values: string[]): Set<string> {
  return new Set(values.map((v) => v.trim().toLowerCase()));
}

export const multiSelectGrader: QuestionTypeDef<MultiSelectAnswer> = {
  key: "MULTI_SELECT",
  label: "Multi-Select",
  answerSchema: multiSelectAnswerSchema,
  autoGradable: true,
  grade(answer, correctAnswerRaw) {
    if (!correctAnswerRaw) return NOT_GRADED;
    let correct: unknown;
    try {
      correct = JSON.parse(correctAnswerRaw);
      if (!Array.isArray(correct)) return NOT_GRADED;
    } catch {
      return NOT_GRADED;
    }
    const correctSet = toSet(correct as string[]);
    const answerSet = toSet(answer);
    const setsEqual = correctSet.size === answerSet.size && [...correctSet].every((v) => answerSet.has(v));
    return binaryGrade(setsEqual);
  },
  importColumns: [],
};
