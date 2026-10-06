// How close a candidate's words are to the expected sentence - for "listen
// and repeat" (what speech recognition heard) and dictation (what they typed).
// Pure and deterministic: case, punctuation, spacing inside codes, "14th" vs
// "fourteenth" and "I'll" vs "I will" never cost marks; wrong or missing
// words, names and digits do.

const UNITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30,
};
const CONTRACTIONS: Record<string, string> = {
  "i'm": "i am", "you're": "you are", "we're": "we are", "they're": "they are", "it's": "it is", "that's": "that is",
  "there's": "there is", "what's": "what is", "i'll": "i will", "you'll": "you will", "we'll": "we will", "it'll": "it will",
  "i've": "i have", "we've": "we have", "you've": "you have", "i'd": "i would", "we'd": "we would", "you'd": "you would",
  "don't": "do not", "doesn't": "does not", "didn't": "did not", "can't": "cannot", "won't": "will not", "isn't": "is not",
  "aren't": "are not", "wasn't": "was not", "weren't": "were not", "haven't": "have not", "hasn't": "has not",
  "couldn't": "could not", "wouldn't": "would not", "shouldn't": "should not", "let's": "let us",
};

function numberWord(word: string): number | null {
  const unit = UNITS.indexOf(word);
  if (unit >= 0) return unit;
  const ten = TENS.indexOf(word);
  if (ten >= 2) return ten * 10;
  return ORDINALS[word] ?? null;
}

/** Lower-case words with numbers as digits, contractions expanded and punctuation gone. */
export function normalizeWords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/&/g, " and ")
    .replace(/(\d),(\d)/g, "$1$2") // 2,450 -> 2450
    .replace(/(\d+)(st|nd|rd|th)\b/g, "$1") // 14th -> 14
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/[\s-]+/)
    .flatMap((w) => (CONTRACTIONS[w] ?? w).split(" "))
    .map((w) => w.replace(/'/g, ""))
    .filter(Boolean);

  // "twenty five" / "twenty-five" -> 25; "fourteenth" -> 14.
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const n = numberWord(words[i]);
    if (n === null) {
      out.push(words[i]);
      continue;
    }
    const next = i + 1 < words.length ? numberWord(words[i + 1]) : null;
    if (n >= 20 && n % 10 === 0 && n < 100 && next !== null && next > 0 && next < 10) {
      out.push(String(n + next));
      i++;
    } else out.push(String(n));
  }
  return out;
}

function editDistance<T>(a: readonly T[], b: readonly T[]): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** 0..1 - share of the expected words said correctly, in order (word error rate, floored at 0). */
export function wordAccuracy(expected: string, actual: string): number {
  const want = normalizeWords(expected);
  if (want.length === 0) return 0;
  const got = normalizeWords(actual);
  return Math.max(0, 1 - editDistance(want, got) / want.length);
}

/**
 * 0..1 for dictation. Compared letter by letter with all spacing removed, so
 * "BK-4729", "bk4729" and "B K 4 7 2 9" are the same answer, while a wrong
 * digit or a misspelt name still loses marks.
 */
export function dictationAccuracy(expected: string, typed: string): number {
  const want = [...normalizeWords(expected).join("")];
  if (want.length === 0) return 0;
  const got = [...normalizeWords(typed).join("")];
  return Math.max(0, 1 - editDistance(want, got) / want.length);
}
