// MATCHING: covers the "match headings to paragraphs", "match features to
// statements" and "match sentence endings" family of item types - all the
// same shape underneath (an item, matched to one label from a list).
// correctAnswerRaw is the single correct label for this item (e.g. "C",
// or a sentence-ending's own id) - one PracticeQuestion row per item to
// match, consistent with how every other question type here is one row
// per gradable unit.
import { z } from "zod";
import { exactMatch, binaryGrade, NOT_GRADED, type QuestionTypeDef } from "../types";

export const matchingAnswerSchema = z.string();
export type MatchingAnswer = z.infer<typeof matchingAnswerSchema>;

export const matchingGrader: QuestionTypeDef<MatchingAnswer> = {
  key: "MATCHING",
  label: "Matching",
  answerSchema: matchingAnswerSchema,
  autoGradable: true,
  grade(answer, correctAnswerRaw) {
    if (!correctAnswerRaw) return NOT_GRADED;
    return binaryGrade(exactMatch(answer, correctAnswerRaw));
  },
  importColumns: [],
};
