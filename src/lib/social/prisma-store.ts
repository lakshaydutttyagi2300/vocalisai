import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SocialStore } from "./store";
import type { Metric, NewNote, NewPost, NewTask, Note, NoteKind, Post, PostStatus, Task } from "./types";

const json = <T,>(s: string | null | undefined, fallback: T): T => {
  try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
};

type TaskRow = Awaited<ReturnType<typeof db.socialTask.findFirstOrThrow>>;
type PostRow = Awaited<ReturnType<typeof db.socialPost.findFirstOrThrow>>;

const toTask = (r: TaskRow): Task => ({
  ...r, status: r.status as Task["status"], payload: json(r.payload, {}), result: r.result ? json(r.result, {}) : null,
});
const toPost = (r: PostRow): Post => ({
  id: r.id, platform: r.platform as Post["platform"], status: r.status as PostStatus, format: r.format, topic: r.topic,
  direction: json(r.directionJson, {}), content: json(r.contentJson, {}), hookText: r.hookText, fingerprint: r.fingerprint,
  qa: r.qaJson ? json(r.qaJson, {}) : null, revisionCount: r.revisionCount, scheduledFor: r.scheduledFor,
  publishedAt: r.publishedAt, externalId: r.externalId, externalUrl: r.externalUrl, clicks: r.clicks,
  decidedBy: r.decidedBy, error: r.error, createdAt: r.createdAt,
});
function postPatch(p: Partial<Post>): Prisma.SocialPostUpdateInput {
  const { direction, content, qa, ...rest } = p;
  const data: Record<string, unknown> = { ...rest };
  delete data.id; delete data.createdAt;
  if (direction !== undefined) data.directionJson = JSON.stringify(direction);
  if (content !== undefined) data.contentJson = JSON.stringify(content);
  if (qa !== undefined) data.qaJson = qa === null ? null : JSON.stringify(qa);
  return data as Prisma.SocialPostUpdateInput;
}

export class PrismaSocialStore implements SocialStore {
  async getSetting(key: string) { return (await db.socialSetting.findUnique({ where: { key } }))?.value ?? null; }
  async setSetting(key: string, value: string) {
    await db.socialSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  async incrementSetting(key: string, by: number) {
    // One atomic statement so concurrent workers cannot lose an update.
    const rows = await db.$queryRaw<{ value: string }[]>`
      INSERT INTO "SocialSetting" ("key","value","updatedAt") VALUES (${key}, ${String(by)}, NOW())
      ON CONFLICT ("key") DO UPDATE SET "value" = (CAST("SocialSetting"."value" AS INTEGER) + ${by})::text, "updatedAt" = NOW()
      RETURNING "value"`;
    return Number(rows[0].value);
  }

  async enqueue(t: NewTask) {
    const existing = await db.socialTask.findUnique({ where: { dedupeKey: t.dedupeKey } });
    if (existing) return { task: toTask(existing), created: false };
    try {
      const row = await db.socialTask.create({
        data: {
          kind: t.kind, agent: t.agent, dedupeKey: t.dedupeKey, payload: JSON.stringify(t.payload ?? {}),
          runAfter: t.runAfter ?? new Date(), maxAttempts: t.maxAttempts ?? 3, depth: t.depth ?? 0,
          parentId: t.parentId ?? null, postId: t.postId ?? null,
        },
      });
      return { task: toTask(row), created: true };
    } catch (err) {
      // Lost a race with another worker creating the same key: that's the dedupe working.
      const again = await db.socialTask.findUnique({ where: { dedupeKey: t.dedupeKey } });
      if (again) return { task: toTask(again), created: false };
      throw err;
    }
  }
  async claimNext(now: Date, workerId: string) {
    for (let i = 0; i < 5; i++) {
      const next = await db.socialTask.findFirst({
        where: { status: "QUEUED", runAfter: { lte: now } }, orderBy: [{ runAfter: "asc" }, { createdAt: "asc" }],
      });
      if (!next) return null;
      // Compare-and-set: only one worker's updateMany can flip QUEUED -> RUNNING.
      const won = await db.socialTask.updateMany({
        where: { id: next.id, status: "QUEUED" },
        data: { status: "RUNNING", lockedAt: now, lockedBy: workerId, attempts: { increment: 1 } },
      });
      if (won.count === 1) return toTask(await db.socialTask.findUniqueOrThrow({ where: { id: next.id } }));
    }
    return null;
  }
  async completeTask(id: string, result: Record<string, unknown>, durationMs: number) {
    await db.socialTask.update({
      where: { id }, data: { status: "DONE", result: JSON.stringify(result), durationMs, finishedAt: new Date(), lockedAt: null, error: null },
    });
  }
  async failTask(id: string, error: string, durationMs: number, retryAt: Date | null) {
    const t = await db.socialTask.findUniqueOrThrow({ where: { id } });
    if (retryAt && t.attempts < t.maxAttempts) {
      await db.socialTask.update({ where: { id }, data: { status: "QUEUED", runAfter: retryAt, error, durationMs, lockedAt: null } });
      return "requeued" as const;
    }
    await db.socialTask.update({ where: { id }, data: { status: "FAILED", error, durationMs, finishedAt: new Date(), lockedAt: null } });
    return "failed" as const;
  }
  async blockTask(id: string, reason: string, until?: Date) {
    await db.socialTask.update({
      where: { id },
      data: { status: until ? "QUEUED" : "BLOCKED", error: reason, lockedAt: null, attempts: { decrement: 1 }, ...(until ? { runAfter: until } : {}) },
    });
  }
  async recoverStale(before: Date) {
    const stale = await db.socialTask.findMany({ where: { status: "RUNNING", lockedAt: { lt: before } } });
    let n = 0;
    for (const t of stale) {
      const exhausted = t.attempts >= t.maxAttempts;
      const r = await db.socialTask.updateMany({
        where: { id: t.id, status: "RUNNING", lockedAt: { lt: before } },
        data: { status: exhausted ? "FAILED" : "QUEUED", lockedAt: null, error: "Worker stopped mid-task; re-queued", finishedAt: exhausted ? new Date() : null },
      });
      n += r.count;
    }
    return n;
  }
  async unblockTasks(kinds: string[]) {
    return (await db.socialTask.updateMany({ where: { status: "BLOCKED", kind: { in: kinds } }, data: { status: "QUEUED", error: null } })).count;
  }
  async cancelTasks(statuses: string[]) {
    return (await db.socialTask.updateMany({ where: { status: { in: statuses } }, data: { status: "CANCELLED", finishedAt: new Date() } })).count;
  }
  async listTasks(o: { status?: string; limit: number; postId?: string }) {
    const rows = await db.socialTask.findMany({
      where: { ...(o.status ? { status: o.status } : {}), ...(o.postId ? { postId: o.postId } : {}) },
      orderBy: { createdAt: "desc" }, take: o.limit,
    });
    return rows.map(toTask);
  }
  async countTasks() {
    const g = await db.socialTask.groupBy({ by: ["status"], _count: { _all: true } });
    return Object.fromEntries(g.map((x) => [x.status, x._count._all]));
  }

  async createPost(p: NewPost) {
    return toPost(await db.socialPost.create({
      data: { platform: p.platform, format: p.format, topic: p.topic, directionJson: JSON.stringify(p.direction) },
    }));
  }
  async getPost(id: string) { const r = await db.socialPost.findUnique({ where: { id } }); return r ? toPost(r) : null; }
  async updatePost(id: string, patch: Partial<Post>) { return toPost(await db.socialPost.update({ where: { id }, data: postPatch(patch) })); }
  async transitionPost(id: string, from: PostStatus[], to: PostStatus, patch: Partial<Post> = {}) {
    const r = await db.socialPost.updateMany({
      where: { id, status: { in: from } }, data: postPatch({ ...patch, status: to }) as Prisma.SocialPostUpdateManyMutationInput,
    });
    return r.count === 1;
  }
  async listPosts(o: { statuses?: PostStatus[]; limit: number; sinceDays?: number }) {
    const rows = await db.socialPost.findMany({
      where: {
        ...(o.statuses ? { status: { in: o.statuses } } : {}),
        ...(o.sinceDays ? { createdAt: { gte: new Date(Date.now() - o.sinceDays * 864e5) } } : {}),
      },
      orderBy: { createdAt: "desc" }, take: o.limit,
    });
    return rows.map(toPost);
  }
  async incrementClicks(id: string) { await db.socialPost.update({ where: { id }, data: { clicks: { increment: 1 } } }).catch(() => undefined); }

  async addMetric(m: Metric) { await db.socialMetric.create({ data: m }); }
  async latestMetrics(ids: string[]) {
    const rows = await db.socialMetric.findMany({ where: { postId: { in: ids } }, orderBy: { collectedAt: "asc" } });
    const out = new Map<string, Metric>();
    for (const r of rows) out.set(r.postId, r);
    return out;
  }

  async addNote(n: NewNote) {
    if (n.dedupeKey && (await db.socialNote.findUnique({ where: { dedupeKey: n.dedupeKey } }))) return null;
    try {
      return (await db.socialNote.create({ data: { ...n, kind: n.kind } })) as Note;
    } catch { return null; }
  }
  async listNotes(kind: NoteKind | null, limit: number) {
    return (await db.socialNote.findMany({ where: kind ? { kind } : {}, orderBy: { createdAt: "desc" }, take: limit })) as Note[];
  }
}
