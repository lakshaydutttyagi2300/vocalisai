// Aliases for the four question types that already exist and are already
// live in api/practice/attempts/route.ts. These graders reproduce that
// route's exact, unmodified grading logic:
//
//   if (question.correctAnswer !== null) {
//     isCorrect = (responseText ?? "").trim() === question.correctAnswer.trim();
//     score = isCorrect ? 100 : 0;
//   }
//
// - a case-SENSITIVE trim-only compare, deliberately not the
// case-insensitive exactMatch() used by this registry's own new types, so
// this file matches real production behaviour exactly rather than
// "improving" it. That route itself is untouched and does not use this
// registry - these aliases exist so P1-E's exam runner and P1-G's admin
// tooling can look up all 16 types (12 new + these 4) through one
// consistent interface.
import { z } from "zod";
import { NOT_GRADED, type GradeResult, type QuestionTypeDef } from "../types";

const responseTextAnswerSchema = z.string();
type ResponseTextAnswer = z.infer<typeof responseTextAnswerSchema>;

function gradeAgainstCorrectAnswer(answer: string, correctAnswerRaw: string | null): GradeResult {
  if (correctAnswerRaw === null) return NOT_GRADED;
  const isCorrect = (answer ?? "").trim() === correctAnswerRaw.trim();
  return { isCorrect, score: isCorrect ? 100 : 0 };
}

export const multipleChoiceGrader: QuestionTypeDef<ResponseTextAnswer> = {
  key: "MULTIPLE_CHOICE",
  label: "Multiple Choice",
  answerSchema: responseTextAnswerSchema,
  autoGradable: true,
  grade: gradeAgainstCorrectAnswer,
  importColumns: [],
};

export const readingComprehensionGrader: QuestionTypeDef<ResponseTextAnswer> = {
  key: "READING_COMPREHENSION",
  label: "Reading Comprehension",
  answerSchema: responseTextAnswerSchema,
  autoGradable: true,
  grade: gradeAgainstCorrectAnswer,
  importColumns: [],
};

export const listeningComprehensionGrader: QuestionTypeDef<ResponseTextAnswer> = {
  key: "LISTENING_COMPREHENSION",
  label: "Listening Comprehension",
  answerSchema: responseTextAnswerSchema,
  autoGradable: true,
  grade: gradeAgainstCorrectAnswer,
  importColumns: [],
};

// SHORT_ANSWER is graded the same way IF it has a correctAnswer (some do
// - e.g. "read this exact sentence aloud"), otherwise falls through to
// NOT_GRADED via gradeAgainstCorrectAnswer's own null check - identical
// to the real route, which never special-cases this type.
export const shortAnswerGrader: QuestionTypeDef<ResponseTextAnswer> = {
  key: "SHORT_ANSWER",
  label: "Short Answer",
  answerSchema: responseTextAnswerSchema,
  autoGradable: false, // not ALWAYS gradable (most have no correctAnswer) - grade() still handles the cases that do
  grade: gradeAgainstCorrectAnswer,
  importColumns: [],
};
