// TIMED_SPEAKING: a spoken response with a preparation timer and a
// response timer (e.g. "1 minute to prepare, 2 minutes to speak") - not
// auto-graded here, same as the existing SHORT_ANSWER voice categories:
// real scoring comes from the existing speech-analysis pipeline
// (src/lib/analyze-attempt.ts, src/lib/scoring-engine.ts) once a
// recording exists, never from this registry. The answer "shape" is just
// the recordingId, matching how every existing voice practice mode
// already links a PracticeAttempt to a PracticeRecording.
import { z } from "zod";
import { NOT_GRADED, type QuestionTypeDef } from "../types";

export const timedSpeakingAnswerSchema = z.object({ recordingId: z.string() });
export type TimedSpeakingAnswer = z.infer<typeof timedSpeakingAnswerSchema>;

export const timedSpeakingGrader: QuestionTypeDef<TimedSpeakingAnswer> = {
  key: "TIMED_SPEAKING",
  label: "Timed Speaking",
  answerSchema: timedSpeakingAnswerSchema,
  autoGradable: false,
  grade() {
    return NOT_GRADED;
  },
  importColumns: ["Prep Seconds", "Response Seconds"],
};
