// TRUE_FALSE_NOT_GIVEN: a classic IELTS-style reading/listening item.
// correctAnswerRaw is the plain string "TRUE" | "FALSE" | "NOT_GIVEN".
import { z } from "zod";
import { binaryGrade, NOT_GRADED, type QuestionTypeDef } from "../types";

export const TFNG_VALUES = ["TRUE", "FALSE", "NOT_GIVEN"] as const;
export const trueFalseNotGivenAnswerSchema = z.enum(TFNG_VALUES);
export type TrueFalseNotGivenAnswer = z.infer<typeof trueFalseNotGivenAnswerSchema>;

export const trueFalseNotGivenGrader: QuestionTypeDef<TrueFalseNotGivenAnswer> = {
  key: "TRUE_FALSE_NOT_GIVEN",
  label: "True / False / Not Given",
  answerSchema: trueFalseNotGivenAnswerSchema,
  autoGradable: true,
  grade(answer, correctAnswerRaw) {
    if (!correctAnswerRaw) return NOT_GRADED;
    const correct = correctAnswerRaw.trim().toUpperCase();
    if (!(TFNG_VALUES as readonly string[]).includes(correct)) return NOT_GRADED;
    return binaryGrade(answer === correct);
  },
  importColumns: [],
};
