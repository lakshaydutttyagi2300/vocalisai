// Shared toolkit for the computer-generated question banks. Every bank
// builds a fresh kit from its own fixed seed on every call, so the same
// source always produces exactly the same questions (their prompt text is
// their identity in the database).

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export const lcm = (a, b) => (a * b) / gcd(a, b);
export const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
export const rupees = (n) => `₹${Number.isInteger(n) ? n.toLocaleString("en-IN") : fmt(n)}`;
/** A number with brackets when negative, for use inside working: 7 × (-4). */
export const par = (n) => (n < 0 ? `(${n})` : String(n));
export const frac = (p, q) => {
  const g = gcd(p, q);
  const [a, b] = [p / g, q / g];
  return b === 1 ? String(a) : `${a}/${b}`;
};
export const ordinal = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
export const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));
export const nCr = (n, r) => factorial(n) / (factorial(r) * factorial(n - r));
export const isPrime = (n) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};

export function makeKit(seed) {
  const R = rng(seed);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const int = (lo, hi) => lo + Math.floor(R() * (hi - lo + 1));
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const sample = (arr, n) => shuffle(arr).slice(0, n);

  // One MCQ. `wrong` = [{ value, reason }]; duplicates of the answer or of
  // each other are dropped, negatives too (unless the answer is negative);
  // a numeric answer is topped up with near misses. Needs 2+ distractors.
  function mcq({ skillId, level, prompt, answer, wrong, explanation, hint, time, keepOrder = false }) {
    answer = String(answer);
    const seen = new Set([answer]);
    const distractors = [];
    const add = (w) => {
      const value = String(w.value);
      if (seen.has(value) || (/^-/.test(value) && !/^-/.test(answer))) return;
      if (/NaN|Infinity|undefined/.test(value)) return;
      seen.add(value);
      distractors.push({ value, reason: w.reason });
    };
    for (const w of wrong) add(w);
    const num = answer.match(/^(₹?)([\d,]+(?:\.\d+)?)(.*)$/);
    for (const step of [1, -1, 2, 10]) {
      if (distractors.length >= 3 || !num) break;
      const v = Number(num[2].replace(/,/g, "")) + step;
      const shown = num[2].includes(",") && Number.isInteger(v) ? v.toLocaleString("en-IN") : fmt(v);
      if (v > 0) add({ value: `${num[1]}${shown}${num[3]}`, reason: "A near miss - recheck each step of the working." });
    }
    if (distractors.length < 2) return null;
    const opts = distractors.slice(0, 3);
    const options = keepOrder ? [answer, ...opts.map((d) => d.value)] : shuffle([answer, ...opts.map((d) => d.value)]);
    return {
      skillId,
      level,
      prompt,
      options,
      correctAnswer: answer,
      explanation,
      hint,
      distractorReasons: Object.fromEntries(opts.map((d) => [d.value, d.reason])),
      timeLimitSeconds: time ?? 60 + level * 15,
    };
  }

  // Up to n questions with distinct prompts from a factory (i = attempt index).
  function take(n, factory) {
    const out = [];
    const prompts = new Set();
    for (let i = 0; i < n * 25 && out.length < n; i++) {
      const q = factory(i);
      if (!q || prompts.has(q.prompt)) continue;
      prompts.add(q.prompt);
      out.push(q);
    }
    return out;
  }

  return { R, pick, int, shuffle, sample, mcq, take };
}
