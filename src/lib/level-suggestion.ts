// "Move up / move down a level" suggestions (docs/DIFFICULTY_LEVELS.md).
// A suggestion only - the candidate always chooses their level.
//
// Practice has no session table, so a session is rebuilt from answer times:
// answers in one category and level less than SESSION_GAP_MS apart belong to
// the same session. The last SESSIONS sessions must average at least
// LEVEL_UP to suggest the next level, or below LEVEL_DOWN to suggest the one
// before - and the latest session must agree, so a candidate who just did
// well is never told to drop a level. No imports on purpose: usable from
// server and browser code.

export const LEVEL_ORDER = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
export const SESSION_GAP_MS = 30 * 60 * 1000;
export const SESSIONS = 3;
export const LEVEL_UP = 0.8;
export const LEVEL_DOWN = 0.4;

export interface MarkedAnswer {
  createdAt: Date;
  /** 0-1: 1 for a right answer, 0 for a wrong one. */
  value: number;
}

export interface LevelSuggestion {
  direction: "up" | "down";
  to: (typeof LEVEL_ORDER)[number];
  /** Average of the last SESSIONS sessions, 0-100. */
  average: number;
}

/** Groups answers (any order) into sessions, newest session first. */
export function groupSessions(answers: MarkedAnswer[]): MarkedAnswer[][] {
  const sorted = [...answers].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const sessions: MarkedAnswer[][] = [];
  for (const a of sorted) {
    const current = sessions[sessions.length - 1];
    const previous = current?.[current.length - 1];
    if (previous && previous.createdAt.getTime() - a.createdAt.getTime() < SESSION_GAP_MS) current.push(a);
    else sessions.push([a]);
  }
  return sessions;
}

export function suggestLevel(level: string, answers: MarkedAnswer[]): LevelSuggestion | null {
  const index = (LEVEL_ORDER as readonly string[]).indexOf(level);
  if (index === -1) return null;
  const recent = groupSessions(answers).slice(0, SESSIONS);
  if (recent.length < SESSIONS) return null;
  const scores = recent.map((s) => s.reduce((t, a) => t + a.value, 0) / s.length);
  const average = scores.reduce((sum, v) => sum + v, 0) / scores.length;
  const [latest] = scores;
  const rounded = Math.round(average * 100);
  if (average >= LEVEL_UP && latest >= LEVEL_UP && index < LEVEL_ORDER.length - 1) return { direction: "up", to: LEVEL_ORDER[index + 1], average: rounded };
  if (average < LEVEL_DOWN && latest < LEVEL_DOWN && index > 0) return { direction: "down", to: LEVEL_ORDER[index - 1], average: rounded };
  return null;
}
