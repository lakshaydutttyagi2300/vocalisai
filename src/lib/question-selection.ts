// Shared shuffling helper. (The old cooldown-based question selection that
// lived here was replaced by src/lib/question-freshness.ts - fresh first,
// used by every activity - and has been removed.)

// Proper Fisher-Yates - used to shuffle MCQ option order per attempt, so
// the correct answer isn't always in the same position. correctAnswer is
// stored and validated as the option's text (src/app/api/practice/attempts
// /route.ts), never a positional index, so reordering options here can
// never desync from the stored correct answer - nothing downstream needs
// to change to stay correct.
export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
