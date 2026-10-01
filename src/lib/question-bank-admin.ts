import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// Question Bank admin: shared filters (list, review export, bulk delete),
// duplicate detection and bulk delete. Archived questions count as removed:
// they are left out everywhere here.

export interface BankFilters {
  category?: string | null;
  difficulty?: string | null;
  search?: string | null;
  active?: string | null; // "true" | "false" | absent
  duplicates?: boolean;
}

export function filtersFromParams(params: URLSearchParams): BankFilters {
  return {
    category: params.get("category"),
    difficulty: params.get("difficulty"),
    search: params.get("search")?.trim() || null,
    active: params.get("active"),
    duplicates: params.get("duplicates") === "true",
  };
}

export function hasFilters(f: BankFilters) {
  return Boolean(f.category || f.difficulty || f.search || f.active === "true" || f.active === "false" || f.duplicates);
}

export interface DuplicateInfo {
  /** Group number per question id (1, 2, ...), only for questions that share their text with another. */
  group: Map<string, number>;
  /** Position within its group by age: 1 is the oldest copy. */
  copy: Map<string, number>;
}

/**
 * Questions whose text (and passage, if any) matches another question's,
 * ignoring case and spacing. Two questions with the same prompt under
 * different passages are not duplicates.
 */
export async function findDuplicates(): Promise<DuplicateInfo> {
  const rows = await db.$queryRaw<{ id: string; k: string; rn: bigint }[]>`
    SELECT id, k, rn FROM (
      SELECT id, k,
        count(*) OVER (PARTITION BY k) AS c,
        row_number() OVER (PARTITION BY k ORDER BY "createdAt", id) AS rn
      FROM (
        SELECT id, "createdAt",
          md5(lower(regexp_replace(btrim(prompt), '\\s+', ' ', 'g')) || '|' || lower(regexp_replace(btrim(coalesce(passage, '')), '\\s+', ' ', 'g'))) AS k
        FROM "PracticeQuestion" WHERE "archivedAt" IS NULL
      ) keyed
    ) t WHERE c > 1 ORDER BY k, rn`;
  const group = new Map<string, number>();
  const copy = new Map<string, number>();
  const groupOfKey = new Map<string, number>();
  for (const r of rows) {
    if (!groupOfKey.has(r.k)) groupOfKey.set(r.k, groupOfKey.size + 1);
    group.set(r.id, groupOfKey.get(r.k)!);
    copy.set(r.id, Number(r.rn));
  }
  return { group, copy };
}

export async function bankWhere(f: BankFilters, dupes?: DuplicateInfo): Promise<Prisma.PracticeQuestionWhereInput> {
  const duplicateIds = f.duplicates ? [...(dupes ?? (await findDuplicates())).group.keys()] : null;
  return {
    archivedAt: null,
    ...(f.category ? { category: f.category } : {}),
    ...(f.difficulty ? { difficulty: f.difficulty } : {}),
    ...(f.search ? { prompt: { contains: f.search, mode: "insensitive" as const } } : {}),
    ...(f.active === "true" ? { isActive: true } : f.active === "false" ? { isActive: false } : {}),
    ...(duplicateIds ? { id: { in: duplicateIds } } : {}),
  };
}

const CHUNK = 1000;

/**
 * Deletes questions for good, except ones candidates have already used
 * (answers, conversations, exam answers or a practice test that lists them):
 * those are switched off and archived instead, so nobody's history breaks.
 */
export async function deleteQuestions(ids: string[]): Promise<{ deleted: number; archived: number }> {
  const unique = [...new Set(ids)];
  let deleted = 0;
  let archived = 0;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const [rows, tests] = await Promise.all([
      db.practiceQuestion.findMany({
        where: { id: { in: chunk } },
        select: { id: true, _count: { select: { attempts: true, conversationSessions: true, itemResponses: true } } },
      }),
      db.practiceTest.findMany({ where: { questionIds: { hasSome: chunk } }, select: { questionIds: true } }),
    ]);
    const inTests = new Set(tests.flatMap((t) => t.questionIds));
    const used = rows.filter((r) => r._count.attempts + r._count.conversationSessions + r._count.itemResponses > 0 || inTests.has(r.id)).map((r) => r.id);
    const usedSet = new Set(used);
    const free = rows.map((r) => r.id).filter((id) => !usedSet.has(id));
    const [del, arc] = await db.$transaction([
      db.practiceQuestion.deleteMany({ where: { id: { in: free } } }),
      db.practiceQuestion.updateMany({ where: { id: { in: used } }, data: { isActive: false, archivedAt: new Date() } }),
    ]);
    deleted += del.count;
    archived += arc.count;
  }
  return { deleted, archived };
}
