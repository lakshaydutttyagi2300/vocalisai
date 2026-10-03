// Pure helpers for the dashboard: streaks, weekly progress and achievements,
// all worked out from per-day answer counts the page reads from the database.
// Days are UTC calendar days ("YYYY-MM-DD"). Nothing here invents a number:
// no answers means zero, and no marked answers means "no accuracy" (null).

const DAY = 86_400_000;

export interface DayActivity {
  day: string; // YYYY-MM-DD (UTC)
  answers: number;
  /** Answers with a right/wrong result (voice and open answers have none). */
  marked: number;
  correct: number;
  seconds: number;
}

export function dayKey(at: Date | number): string {
  return new Date(at).toISOString().slice(0, 10);
}

function startOfDay(at: Date): number {
  return Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
}

/** Days in a row with at least one answer, ending today (or yesterday, so a streak isn't lost before today's practice). */
export function currentStreak(days: DayActivity[], now = new Date()): number {
  const active = new Set(days.filter((d) => d.answers > 0).map((d) => d.day));
  let cursor = startOfDay(now);
  if (!active.has(dayKey(cursor))) cursor -= DAY;
  let n = 0;
  while (active.has(dayKey(cursor))) {
    n++;
    cursor -= DAY;
  }
  return n;
}

/** The longest run of consecutive active days in the history given. */
export function longestStreak(days: DayActivity[]): number {
  const sorted = [...new Set(days.filter((d) => d.answers > 0).map((d) => d.day))].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const day of sorted) {
    const t = Date.parse(`${day}T00:00:00Z`);
    run = prev !== null && t - prev === DAY ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

export interface Totals {
  answers: number;
  marked: number;
  correct: number;
  seconds: number;
  /** Correct share of marked answers, 0-100, or null when nothing was marked. */
  accuracy: number | null;
}

function total(days: DayActivity[]): Totals {
  const answers = days.reduce((s, d) => s + d.answers, 0);
  const marked = days.reduce((s, d) => s + d.marked, 0);
  const correct = days.reduce((s, d) => s + d.correct, 0);
  const seconds = days.reduce((s, d) => s + d.seconds, 0);
  return { answers, marked, correct, seconds, accuracy: marked ? Math.round((correct / marked) * 100) : null };
}

/** Totals over the last `n` days, today included. */
export function lastDays(days: DayActivity[], n: number, now = new Date()): Totals {
  const from = startOfDay(now) - (n - 1) * DAY;
  return total(days.filter((d) => Date.parse(`${d.day}T00:00:00Z`) >= from));
}

export interface WeekPoint {
  /** Monday the week starts on (YYYY-MM-DD, UTC). */
  start: string;
  answers: number;
  accuracy: number | null;
}

/** The last `weeks` Monday-to-Sunday weeks, oldest first, the current week last. */
export function weeklySeries(days: DayActivity[], weeks = 8, now = new Date()): WeekPoint[] {
  const today = startOfDay(now);
  const monday = today - ((new Date(today).getUTCDay() + 6) % 7) * DAY;
  const out: WeekPoint[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const start = monday - w * 7 * DAY;
    const inWeek = days.filter((d) => {
      const t = Date.parse(`${d.day}T00:00:00Z`);
      return t >= start && t < start + 7 * DAY;
    });
    const t = total(inWeek);
    out.push({ start: dayKey(start), answers: t.answers, accuracy: t.accuracy });
  }
  return out;
}

export interface Achievement {
  id: string;
  title: string;
  detail: string;
  earned: boolean;
  /** How far along an unearned one is, e.g. 12 of 50 answers. */
  progress: { value: number; target: number } | null;
}

export interface AchievementInput {
  totalAnswers: number;
  bestStreak: number;
  practiceTestsFinished: number;
  mockExamsFinished: number;
  speechAnalyses: number;
  hasGoal: boolean;
}

/** Milestones earned from real activity; unearned ones show how close they are. */
export function achievements(a: AchievementInput): Achievement[] {
  const count = (id: string, title: string, detail: string, value: number, target: number): Achievement => ({
    id,
    title,
    detail,
    earned: value >= target,
    progress: value >= target || target === 1 ? null : { value, target },
  });
  return [
    { id: "goal", title: "Goal set", detail: "Chose what you're preparing for", earned: a.hasGoal, progress: null },
    count("first-answer", "First answer", "Answered your first practice question", a.totalAnswers, 1),
    count("answers-50", "50 answers", "Answered 50 practice questions", a.totalAnswers, 50),
    count("answers-250", "250 answers", "Answered 250 practice questions", a.totalAnswers, 250),
    count("streak-3", "3 days in a row", "Practised three days running", a.bestStreak, 3),
    count("streak-7", "7 days in a row", "Practised every day for a week", a.bestStreak, 7),
    count("practice-test", "Test finished", "Finished an exam practice test", a.practiceTestsFinished, 1),
    count("mock-exam", "Mock exam done", "Finished a proctored mock exam", a.mockExamsFinished, 1),
    count("speech", "Voice analysed", "Had a recording analysed", a.speechAnalyses, 1),
  ];
}
