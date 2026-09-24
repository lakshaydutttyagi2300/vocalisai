// ORDERING: put items in the correct sequence (e.g. steps of a process).
// correctAnswerRaw is a JSON array of item ids in the correct order;
// candidate answer is the same shape in whatever order they arranged it.
// Correct iff the full sequence matches exactly - no credit for a
// partially-correct order, the same all-or-nothing rule as every other
// type here.
import { z } from "zod";
import { binaryGrade, NOT_GRADED, type QuestionTypeDef } from "../types";

export const orderingAnswerSchema = z.array(z.string());
export type OrderingAnswer = z.infer<typeof orderingAnswerSchema>;

export const orderingGrader: QuestionTypeDef<OrderingAnswer> = {
  key: "ORDERING",
  label: "Ordering",
  answerSchema: orderingAnswerSchema,
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
    const correctSeq = correct as string[];
    const sequenceMatches =
      answer.length === correctSeq.length && answer.every((v, i) => v.trim().toLowerCase() === correctSeq[i].trim().toLowerCase());
    return binaryGrade(sequenceMatches);
  },
  importColumns: ["Correct Order (JSON array of item ids)"],
};
