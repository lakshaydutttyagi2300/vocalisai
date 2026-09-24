// GAP_FILL: one or more blanks in a sentence/passage, each with one or
// more accepted strings. correctAnswerRaw is a JSON array of arrays -
// one inner array of accepted answers per blank, e.g.
// '[["a","an"],["comfortable"]]' for two blanks. Candidate answer is a
// plain string per blank, in order. All-or-nothing per question, the same
// exactness MULTIPLE_CHOICE already uses - no partial credit, to keep
// this a genuinely deterministic 0/100, not an invented in-between score.
import { z } from "zod";
import { exactMatch, binaryGrade, NOT_GRADED, type QuestionTypeDef } from "../types";

export const gapFillAnswerSchema = z.array(z.string());
export type GapFillAnswer = z.infer<typeof gapFillAnswerSchema>;

export const gapFillGrader: QuestionTypeDef<GapFillAnswer> = {
  key: "GAP_FILL",
  label: "Gap Fill",
  answerSchema: gapFillAnswerSchema,
  autoGradable: true,
  grade(answer, correctAnswerRaw) {
    if (!correctAnswerRaw) return NOT_GRADED;
    let accepted: string[][];
    try {
      accepted = JSON.parse(correctAnswerRaw);
      if (!Array.isArray(accepted)) return NOT_GRADED;
    } catch {
      return NOT_GRADED;
    }
    if (answer.length !== accepted.length) return binaryGrade(false);
    const allCorrect = answer.every((blank, i) => {
      const options = accepted[i];
      return Array.isArray(options) && options.some((opt) => typeof opt === "string" && exactMatch(blank, opt));
    });
    return binaryGrade(allCorrect);
  },
  importColumns: ["Blanks (JSON array of accepted-answer arrays)"],
};
