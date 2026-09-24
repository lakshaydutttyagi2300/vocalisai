// LONG_WRITING: an extended written response (an essay task, a report,
// ...) - not auto-graded, same "no invented score for open-ended
// content" rule as the existing SHORT_ANSWER type. grade() only ever
// returns null/null; the word count is exposed separately via
// wordCount() so a caller (a future writing-task results view) can show
// it without this module pretending to have scored the content.
import { z } from "zod";
import { NOT_GRADED, type QuestionTypeDef } from "../types";

export const longWritingAnswerSchema = z.string();
export type LongWritingAnswer = z.infer<typeof longWritingAnswerSchema>;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const longWritingGrader: QuestionTypeDef<LongWritingAnswer> = {
  key: "LONG_WRITING",
  label: "Long Writing",
  answerSchema: longWritingAnswerSchema,
  autoGradable: false,
  grade() {
    return NOT_GRADED;
  },
  importColumns: ["Target Word Count"],
};
