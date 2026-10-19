// Persistence boundary. The orchestrator and agents only talk to SocialStore,
// so the same logic runs on Postgres (prisma-store.ts) and in memory (tests).

import type { Metric, NewNote, NewPost, NewTask, Note, NoteKind, Post, PostStatus, Task } from "./types";

export interface SocialStore {
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  /** Adds `by` to a numeric setting and returns the new value (used for daily AI-call counts). */
  incrementSetting(key: string, by: number): Promise<number>;

  /** Idempotent: a second task with the same dedupeKey returns the first and creates nothing. */
  enqueue(task: NewTask): Promise<{ task: Task; created: boolean }>;
  /** Atomically moves one due QUEUED task to RUNNING for this worker, or returns null. Two workers never get the same task. */
  claimNext(now: Date, workerId: string): Promise<Task | null>;
  completeTask(id: string, result: Record<string, unknown>, durationMs: number): Promise<void>;
  /** Re-queues with back-off while attempts remain, otherwise marks FAILED. */
  failTask(id: string, error: string, durationMs: number, retryAt: Date | null): Promise<"requeued" | "failed">;
  /** Without `until`: BLOCKED until a human acts. With `until`: back to QUEUED at that time (e.g. daily AI limit). Either way the attempt is not counted. */
  blockTask(id: string, reason: string, until?: Date): Promise<void>;
  /** RUNNING tasks locked before `staleBefore` (a crashed worker) go back to QUEUED. Returns how many. */
  recoverStale(staleBefore: Date): Promise<number>;
  unblockTasks(kinds: string[]): Promise<number>;
  cancelTasks(statuses: string[]): Promise<number>;
  listTasks(opts: { status?: string; limit: number; postId?: string }): Promise<Task[]>;
  countTasks(): Promise<Record<string, number>>;

  createPost(p: NewPost): Promise<Post>;
  getPost(id: string): Promise<Post | null>;
  updatePost(id: string, patch: Partial<Omit<Post, "id" | "createdAt">>): Promise<Post>;
  /** Compare-and-set a status change; false if the post was not in `from`. Prevents double publishing. */
  transitionPost(id: string, from: PostStatus[], to: PostStatus, patch?: Partial<Post>): Promise<boolean>;
  listPosts(opts: { statuses?: PostStatus[]; limit: number; sinceDays?: number }): Promise<Post[]>;
  incrementClicks(id: string): Promise<void>;

  addMetric(m: Metric): Promise<void>;
  latestMetrics(postIds: string[]): Promise<Map<string, Metric>>;

  addNote(n: NewNote): Promise<Note | null>; // null when dedupeKey already exists
  listNotes(kind: NoteKind | null, limit: number): Promise<Note[]>;
}

let counter = 0;
const nid = (p: string) => `${p}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export class MemoryStore implements SocialStore {
  settings = new Map<string, string>();
  tasks = new Map<string, Task>();
  posts = new Map<string, Post>();
  metrics: Metric[] = [];
  notes: Note[] = [];

  async getSetting(k: string) { return this.settings.get(k) ?? null; }
  async setSetting(k: string, v: string) { this.settings.set(k, v); }
  async incrementSetting(k: string, by: number) {
    const n = Number(this.settings.get(k) ?? 0) + by;
    this.settings.set(k, String(n));
    return n;
  }

  async enqueue(t: NewTask) {
    for (const x of this.tasks.values()) if (x.dedupeKey === t.dedupeKey) return { task: x, created: false };
    const task: Task = {
      id: nid("t"), kind: t.kind, agent: t.agent, status: "QUEUED", dedupeKey: t.dedupeKey,
      payload: t.payload ?? {}, result: null, error: null, attempts: 0, maxAttempts: t.maxAttempts ?? 3,
      depth: t.depth ?? 0, runAfter: t.runAfter ?? new Date(0), lockedAt: null, lockedBy: null,
      parentId: t.parentId ?? null, postId: t.postId ?? null, durationMs: null, createdAt: new Date(), finishedAt: null,
    };
    this.tasks.set(task.id, task);
    return { task, created: true };
  }
  async claimNext(now: Date, workerId: string) {
    // Synchronous body: in a single JS thread this is atomic, like the SQL compare-and-set.
    const due = [...this.tasks.values()]
      .filter((t) => t.status === "QUEUED" && t.runAfter <= now)
      .sort((a, b) => a.runAfter.getTime() - b.runAfter.getTime() || a.createdAt.getTime() - b.createdAt.getTime());
    const t = due[0];
    if (!t) return null;
    t.status = "RUNNING"; t.lockedAt = now; t.lockedBy = workerId; t.attempts += 1;
    return { ...t };
  }
  async completeTask(id: string, result: Record<string, unknown>, durationMs: number) {
    const t = this.tasks.get(id); if (!t) return;
    Object.assign(t, { status: "DONE", result, durationMs, finishedAt: new Date(), lockedAt: null, error: null });
  }
  async failTask(id: string, error: string, durationMs: number, retryAt: Date | null) {
    const t = this.tasks.get(id); if (!t) return "failed" as const;
    t.error = error; t.durationMs = durationMs; t.lockedAt = null;
    if (retryAt && t.attempts < t.maxAttempts) { t.status = "QUEUED"; t.runAfter = retryAt; return "requeued" as const; }
    t.status = "FAILED"; t.finishedAt = new Date();
    return "failed" as const;
  }
  async blockTask(id: string, reason: string, until?: Date) {
    const t = this.tasks.get(id); if (!t) return;
    Object.assign(t, { status: until ? "QUEUED" : "BLOCKED", error: reason, lockedAt: null, attempts: Math.max(0, t.attempts - 1) });
    if (until) t.runAfter = until;
  }
  async recoverStale(before: Date) {
    let n = 0;
    for (const t of this.tasks.values()) {
      if (t.status === "RUNNING" && t.lockedAt && t.lockedAt < before) {
        t.lockedAt = null;
        t.error = "Worker stopped mid-task; re-queued";
        if (t.attempts >= t.maxAttempts) { t.status = "FAILED"; t.finishedAt = new Date(); } else t.status = "QUEUED";
        n++;
      }
    }
    return n;
  }
  async unblockTasks(kinds: string[]) {
    let n = 0;
    for (const t of this.tasks.values()) if (t.status === "BLOCKED" && kinds.includes(t.kind)) { t.status = "QUEUED"; t.error = null; n++; }
    return n;
  }
  async cancelTasks(statuses: string[]) {
    let n = 0;
    for (const t of this.tasks.values()) if (statuses.includes(t.status)) { t.status = "CANCELLED"; t.finishedAt = new Date(); n++; }
    return n;
  }
  async listTasks(o: { status?: string; limit: number; postId?: string }) {
    return [...this.tasks.values()]
      .filter((t) => (!o.status || t.status === o.status) && (!o.postId || t.postId === o.postId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, o.limit);
  }
  async countTasks() {
    const out: Record<string, number> = {};
    for (const t of this.tasks.values()) out[t.status] = (out[t.status] ?? 0) + 1;
    return out;
  }

  async createPost(p: NewPost) {
    const post: Post = {
      id: nid("p"), platform: p.platform, status: "IDEA", format: p.format, topic: p.topic, direction: p.direction,
      content: {}, hookText: "", fingerprint: "", qa: null, revisionCount: 0, scheduledFor: null, publishedAt: null,
      externalId: null, externalUrl: null, clicks: 0, decidedBy: null, error: null, createdAt: new Date(),
    };
    this.posts.set(post.id, post);
    return { ...post };
  }
  async getPost(id: string) { const p = this.posts.get(id); return p ? { ...p } : null; }
  async updatePost(id: string, patch: Partial<Post>) {
    const p = this.posts.get(id); if (!p) throw new Error("post not found");
    Object.assign(p, patch);
    return { ...p };
  }
  async transitionPost(id: string, from: PostStatus[], to: PostStatus, patch: Partial<Post> = {}) {
    const p = this.posts.get(id);
    if (!p || !from.includes(p.status)) return false;
    Object.assign(p, patch, { status: to });
    return true;
  }
  async listPosts(o: { statuses?: PostStatus[]; limit: number; sinceDays?: number }) {
    const since = o.sinceDays ? Date.now() - o.sinceDays * 864e5 : 0;
    return [...this.posts.values()]
      .filter((p) => (!o.statuses || o.statuses.includes(p.status)) && p.createdAt.getTime() >= since)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, o.limit).map((p) => ({ ...p }));
  }
  async incrementClicks(id: string) { const p = this.posts.get(id); if (p) p.clicks += 1; }

  async addMetric(m: Metric) { this.metrics.push(m); }
  async latestMetrics(ids: string[]) {
    const out = new Map<string, Metric>();
    for (const m of this.metrics) {
      if (!ids.includes(m.postId)) continue;
      const cur = out.get(m.postId);
      if (!cur || cur.collectedAt <= m.collectedAt) out.set(m.postId, m);
    }
    return out;
  }

  async addNote(n: NewNote) {
    if (n.dedupeKey && this.notes.some((x) => x.dedupeKey === n.dedupeKey)) return null;
    const note: Note = {
      id: nid("n"), kind: n.kind, title: n.title, body: n.body, sourceUrl: n.sourceUrl ?? null,
      verified: n.verified ?? false, dedupeKey: n.dedupeKey ?? null, expiresAt: n.expiresAt ?? null, createdAt: new Date(),
    };
    this.notes.push(note);
    return note;
  }
  async listNotes(kind: NoteKind | null, limit: number) {
    return this.notes.filter((n) => !kind || n.kind === kind).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }
}
