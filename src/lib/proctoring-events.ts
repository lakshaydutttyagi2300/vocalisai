// Every proctoring signal we can genuinely raise from the browser. Each one
// is a flag requiring human interpretation, never proof of misconduct - the
// label text is deliberately neutral, not accusatory.
//
// Deliberately absent: multi-voice/"additional person speaking" detection.
// That needs real speaker-diarization audio analysis, which cannot be done
// reliably client-side without a cloud model - so per the "don't claim
// capabilities that don't exist" rule, it is not attempted here at all,
// not faked with a weak heuristic dressed up as the real thing.

export const PROCTORING_EVENT_LABELS: Record<string, string> = {
  FACE_NOT_DETECTED: "No face detected",
  MULTIPLE_FACES: "Multiple faces detected",
  FACE_REAPPEARED: "Face visible again",
  TAB_HIDDEN: "Tab or window switched away",
  TAB_VISIBLE: "Returned to the assessment tab",
  WINDOW_BLUR: "Assessment window lost focus",
  WINDOW_FOCUS: "Assessment window regained focus",
  FULLSCREEN_EXIT: "Exited fullscreen",
  NAVIGATION_ATTEMPT: "Attempted to leave or reload the page",
  COPY_ATTEMPT: "Copy action detected",
  PASTE_ATTEMPT: "Paste action detected",
  CUT_ATTEMPT: "Cut action detected",
  MIC_DISCONNECTED: "Microphone disconnected",
  EXTENDED_SILENCE: "Extended silence on microphone",
};

export type ProctoringEventType = keyof typeof PROCTORING_EVENT_LABELS;

export function describeProctoringEvent(eventType: string): string {
  return PROCTORING_EVENT_LABELS[eventType] ?? eventType;
}
