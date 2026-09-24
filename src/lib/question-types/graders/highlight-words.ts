// HIGHLIGHT_WORDS: select the specific word(s) in a passage that answer
// the question (used with an ItemGroup PASSAGE - P1-B). correctAnswerRaw
// is a JSON array of the exact expected words/phrases; candidate answer
// is the set of words they highlighted. Correct iff the sets match
// exactly (order-independent - the order words were clicked in doesn't
// matter, only which ones).
import { z } from "zod";
import { binaryGrade, NOT_GRADED, type QuestionTypeDef } from "../types";

export const highlightWordsAnswerSchema = z.array(z.string());
export type HighlightWordsAnswer = z.infer<typeof highlightWordsAnswerSchema>;

function toSet(values: string[]): Set<string> {
  return new Set(values.map((v) => v.trim().toLowerCase()));
}

export const highlightWordsGrader: QuestionTypeDef<HighlightWordsAnswer> = {
  key: "HIGHLIGHT_WORDS",
  label: "Highlight Words",
  answerSchema: highlightWordsAnswerSchema,
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
  importColumns: ["Highlight Words (JSON array of expected words)"],
};
