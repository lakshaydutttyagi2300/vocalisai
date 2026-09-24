// LABELLING: label parts of a diagram/map/plan from a word list.
// correctAnswerRaw is a JSON object mapping labelId -> the correct word.
// Candidate answer is the same shape. Correct iff every label matches -
// one diagram is one PracticeQuestion row, same as every multi-part
// question type in this registry.
import { z } from "zod";
import { exactMatch, binaryGrade, NOT_GRADED, type QuestionTypeDef } from "../types";

export const labellingAnswerSchema = z.record(z.string(), z.string());
export type LabellingAnswer = z.infer<typeof labellingAnswerSchema>;

export const labellingGrader: QuestionTypeDef<LabellingAnswer> = {
  key: "LABELLING",
  label: "Labelling",
  answerSchema: labellingAnswerSchema,
  autoGradable: true,
  grade(answer, correctAnswerRaw) {
    if (!correctAnswerRaw) return NOT_GRADED;
    let correct: Record<string, string>;
    try {
      correct = JSON.parse(correctAnswerRaw);
      if (!correct || typeof correct !== "object" || Array.isArray(correct)) return NOT_GRADED;
    } catch {
      return NOT_GRADED;
    }
    const correctKeys = Object.keys(correct);
    const allCorrect =
      correctKeys.length > 0 &&
      correctKeys.every((k) => typeof answer[k] === "string" && exactMatch(answer[k], correct[k]));
    return binaryGrade(allCorrect);
  },
  importColumns: ["Labels (JSON object of labelId -> correct word)"],
};
