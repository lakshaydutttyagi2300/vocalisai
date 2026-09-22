// Cooldown-aware random selection - replaces a plain Math.random() shuffle
// over the whole pool, which had no memory of what a candidate already
// saw and would happily serve the exact same question again on the very
// next attempt whenever a pool was small.
//
// The rule is self-adjusting rather than a fixed "wait N attempts" number:
// exclude as many of the candidate's most-recently-seen questions as
// possible while still leaving enough left to fulfill the request. A large
// pool relative to `count` avoids every recently-seen question entirely; a
// small/exhausted pool falls back to reusing the *least*-recently-seen
// ones first, rather than either failing outright or ignoring history.
export function selectWithCooldown<T extends { id: string }>(
  pool: T[],
  recentlySeenIdsMostRecentFirst: string[],
  count: number
): T[] {
  const excludeCount = Math.max(0, pool.length - count);
  const excludeSet = new Set(recentlySeenIdsMostRecentFirst.slice(0, excludeCount));

  const eligible = pool.filter((q) => !excludeSet.has(q.id));
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, eligible.length));
}

// How many past question IDs (per user, per category+difficulty) to look
// at when deciding what's "recently seen". Bounded rather than unlimited
// history so the lookup query stays cheap regardless of how long a
// candidate has been practicing.
export const RECENT_HISTORY_LIMIT = 50;
