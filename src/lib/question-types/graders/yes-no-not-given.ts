// YES_NO_NOT_GIVEN: same shape as TRUE_FALSE_NOT_GIVEN, used where the
// source passage expresses the writer's claims/opinions rather than
// facts (the standard IELTS-style distinction between the two item
// types) - kept as its own type/grader rather than reusing
// TRUE_FALSE_NOT_GIVEN under the hood, so the registry's key/label always
// matches what the candidate actually sees.
import { z } from "zod";
import { binaryGrade, NOT_GRADED, type QuestionTypeDef } from "../types";

export const YNNG_VALUES = ["YES", "NO", "NOT_GIVEN"] as const;
export const yesNoNotGivenAnswerSchema = z.enum(YNNG_VALUES);
export type YesNoNotGivenAnswer = z.infer<typeof yesNoNotGivenAnswerSchema>;

export const yesNoNotGivenGrader: QuestionTypeDef<YesNoNotGivenAnswer> = {
  key: "YES_NO_NOT_GIVEN",
  label: "Yes / No / Not Given",
  answerSchema: yesNoNotGivenAnswerSchema,
  autoGradable: true,
  grade(answer, correctAnswerRaw) {
    if (!correctAnswerRaw) return NOT_GRADED;
    const correct = correctAnswerRaw.trim().toUpperCase();
    if (!(YNNG_VALUES as readonly string[]).includes(correct)) return NOT_GRADED;
    return binaryGrade(answer === correct);
  },
  importColumns: [],
};
