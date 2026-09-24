// NUMERIC_ENTRY: a single numeric answer (word count, a calculated
// figure, a year, ...). correctAnswerRaw is JSON: {"value": number,
// "tolerance"?: number} - tolerance defaults to 0 (exact match), set it
// for anything with a legitimately acceptable range (e.g. "±2").
import { z } from "zod";
import { binaryGrade, NOT_GRADED, type QuestionTypeDef } from "../types";

export const numericEntryAnswerSchema = z.number();
export type NumericEntryAnswer = z.infer<typeof numericEntryAnswerSchema>;

interface NumericCorrectAnswer {
  value: number;
  tolerance?: number;
}

export const numericEntryGrader: QuestionTypeDef<NumericEntryAnswer> = {
  key: "NUMERIC_ENTRY",
  label: "Numeric Entry",
  answerSchema: numericEntryAnswerSchema,
  autoGradable: true,
  grade(answer, correctAnswerRaw) {
    if (!correctAnswerRaw) return NOT_GRADED;
    let correct: NumericCorrectAnswer;
    try {
      correct = JSON.parse(correctAnswerRaw);
      if (typeof correct?.value !== "number" || !Number.isFinite(correct.value)) return NOT_GRADED;
    } catch {
      return NOT_GRADED;
    }
    const tolerance = typeof correct.tolerance === "number" && correct.tolerance >= 0 ? correct.tolerance : 0;
    return binaryGrade(Math.abs(answer - correct.value) <= tolerance);
  },
  importColumns: ["Numeric Answer (JSON: {value, tolerance?})"],
};
