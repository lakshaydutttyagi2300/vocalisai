// "Fresh first" question selection, shared by every place a candidate is
// served questions (solo practice, v1 mock tests, v2 exams, Skill Drills,
// diagnostics, AI conversations).
//
// Rule: questions this candidate has NEVER seen come first, in random
// order. Only when those run out are seen ones reused - the ones seen
// LONGEST ago first. So nothing repeats until the whole pool for that
// area/level has been seen, and even then the oldest come back first.
//
// "Seen" means any trace of the question for this user, from any activity:
// a practice/drill/mock answer (PracticeAttempt), a new-style exam item
// (ItemResponse - created even when skipped), or an AI conversation that
// started from it (ConversationSession).

import { db } from "@/lib/db";

export type LastSeen = Map<string, Date>;

function remember(map: LastSeen, id: string | null, at: Date | null) {
  if (!id || !at) return;
  const prev = map.get(id);
  if (!prev || prev < at) map.set(id, at);
}

/** When this user last met each question (limited to `questionIds` when given). */
export async function lastSeenByUser(userId: string, questionIds?: string[]): Promise<LastSeen> {
  const only = questionIds ? { questionId: { in: questionIds } } : {};
  const [attempts, items, conversations] = await Promise.all([
    db.practiceAttempt.groupBy({ by: ["questionId"], where: { userId, ...only }, _max: { createdAt: true } }),
    db.itemResponse.groupBy({ by: ["questionId"], where: { mockTestSession: { userId }, ...only }, _max: { updatedAt: true } }),
    db.conversationSession.groupBy({
      by: ["questionId"],
      where: { userId, questionId: questionIds ? { in: questionIds } : { not: null } },
      _max: { startedAt: true },
    }),
  ]);
  const seen: LastSeen = new Map();
  for (const a of attempts) remember(seen, a.questionId, a._max.createdAt);
  for (const i of items) remember(seen, i.questionId, i._max.updatedAt);
  for (const c of conversations) remember(seen, c.questionId, c._max.startedAt);
  return seen;
}

/** Unseen first (random order), then seen from least- to most-recently seen. */
export function orderByFreshness<T extends { id: string }>(pool: T[], lastSeen: LastSeen, random: () => number = Math.random): T[] {
  const unseen: { q: T; k: number }[] = [];
  const seen: { q: T; at: number; k: number }[] = [];
  for (const q of pool) {
    const at = lastSeen.get(q.id);
    if (at) seen.push({ q, at: at.getTime(), k: random() });
    else unseen.push({ q, k: random() });
  }
  unseen.sort((a, b) => a.k - b.k);
  seen.sort((a, b) => a.at - b.at || a.k - b.k);
  return [...unseen.map((u) => u.q), ...seen.map((s) => s.q)];
}

export function pickFresh<T extends { id: string }>(pool: T[], lastSeen: LastSeen, count: number, random: () => number = Math.random): T[] {
  return orderByFreshness(pool, lastSeen, random).slice(0, Math.max(0, count));
}
