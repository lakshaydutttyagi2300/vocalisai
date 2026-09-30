// Anti-repetition ordering for catalogue practice (docs/CATALOGUE.md).
// Pure and dependency-free so it can be unit-tested and reused.
//
// Normal practice: questions the candidate has never seen come first, in
// random order; then seen ones, least recently seen first (fewest views
// breaking ties). So nothing repeats until the pool runs out.
// Revision: only seen questions, on purpose - last answered wrong first,
// then seen but never answered, then answered right; oldest first in each.

export interface SeenInfo {
  lastSeenAt: Date;
  timesSeen: number;
  lastCorrect: boolean | null;
  timesAttempted: number;
}

export interface PoolQuestion {
  id: string;
  itemGroupId?: string | null;
  orderInGroup?: number | null;
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const byOldest = (seen: Map<string, SeenInfo>) => (a: string, b: string) => {
  const x = seen.get(a)!;
  const y = seen.get(b)!;
  return x.lastSeenAt.getTime() - y.lastSeenAt.getTime() || x.timesSeen - y.timesSeen;
};

export function orderQuestions(ids: string[], seen: Map<string, SeenInfo>, revision = false, random: () => number = Math.random): string[] {
  const seenIds = ids.filter((id) => seen.has(id));
  if (revision) {
    const rank = (id: string) => {
      const s = seen.get(id)!;
      if (s.timesAttempted > 0 && s.lastCorrect === false) return 0;
      if (s.timesAttempted === 0) return 1;
      return 2;
    };
    const oldest = byOldest(seen);
    return [...seenIds].sort((a, b) => rank(a) - rank(b) || oldest(a, b));
  }
  const unseen = shuffled(ids.filter((id) => !seen.has(id)), random);
  return [...unseen, ...[...seenIds].sort(byOldest(seen))];
}

/**
 * Takes `count` questions in the given order, keeping questions that share
 * a passage together (the whole group, in its own order, where the first of
 * them appears). May return a few more than `count` to finish a group.
 */
export function takeWithGroups(ordered: string[], pool: PoolQuestion[], count: number): string[] {
  const byId = new Map(pool.map((q) => [q.id, q]));
  const groups = new Map<string, PoolQuestion[]>();
  for (const q of pool) {
    if (!q.itemGroupId) continue;
    groups.set(q.itemGroupId, [...(groups.get(q.itemGroupId) ?? []), q]);
  }
  const picked: string[] = [];
  const taken = new Set<string>();
  for (const id of ordered) {
    if (picked.length >= count) break;
    if (taken.has(id)) continue;
    const q = byId.get(id);
    const members = q?.itemGroupId ? [...groups.get(q.itemGroupId)!].sort((a, b) => (a.orderInGroup ?? 0) - (b.orderInGroup ?? 0)) : [q ?? { id }];
    for (const m of members) {
      taken.add(m.id);
      picked.push(m.id);
    }
  }
  return picked;
}
