// Typing test scoring, word by word against the passage - simple and
// explainable, like the typing rounds in chat and back-office hiring.
//
//  - Gross speed: words typed per minute (a "word" is 5 characters, the
//    standard measure, so long and short words count fairly).
//  - Accuracy: share of typed words that match the passage word in the same place.
//  - Net speed: only the correctly typed words, per minute.
//
// No imports on purpose: the page shows live figures with it and the server
// re-scores the saved text with the same function.

export const MIN_SECONDS = 10;
export const MAX_SECONDS = 300;
/** The test ends here even if the passage is not finished. */
export const TEST_SECONDS = 180;
/** Above this, a result is not believable for typing by hand. */
export const MAX_WPM = 200;

/** What chat, email and back-office jobs commonly ask for. */
export const JOB_TARGET = { netWpm: 30, accuracy: 90 };

export interface TypingStats {
  typedWords: number;
  correctWords: number;
  grossWpm: number;
  netWpm: number;
  accuracy: number; // 0-100
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

export function scoreTyping(passage: string, typed: string, seconds: number): TypingStats {
  const target = words(passage);
  const done = words(typed);
  const minutes = Math.max(seconds, 1) / 60;
  let correctChars = 0;
  let correctWords = 0;
  done.forEach((w, i) => {
    if (w === target[i]) {
      correctWords++;
      correctChars += w.length + 1;
    }
  });
  const typedChars = done.reduce((n, w) => n + w.length + 1, 0);
  const cap = (n: number) => Math.min(MAX_WPM, Math.round(n));
  return {
    typedWords: done.length,
    correctWords,
    grossWpm: cap(typedChars / 5 / minutes),
    netWpm: cap(correctChars / 5 / minutes),
    accuracy: done.length ? Math.round((correctWords / done.length) * 100) : 0,
  };
}

/** One plain sentence about a result, against the common job target. */
export function typingVerdict(s: Pick<TypingStats, "netWpm" | "accuracy">): string {
  const fast = s.netWpm >= JOB_TARGET.netWpm;
  const accurate = s.accuracy >= JOB_TARGET.accuracy;
  if (fast && accurate) return "Job-ready: fast and accurate enough for most chat, email and back-office roles.";
  if (accurate) return `Accurate, but a little slow: aim for ${JOB_TARGET.netWpm} words per minute.`;
  if (fast) return `Fast, but too many mistakes: slow down slightly and aim for ${JOB_TARGET.accuracy}% accuracy.`;
  return `Keep practising: aim for ${JOB_TARGET.netWpm} words per minute at ${JOB_TARGET.accuracy}% accuracy.`;
}

/** 0-100 for the readiness score: 40 net words per minute or more is full marks. */
export function typingReadinessScore(netWpm: number): number {
  return Math.round((Math.min(Math.max(netWpm, 0), 40) / 40) * 100);
}
