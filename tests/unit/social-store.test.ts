import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { PrismaSocialStore } from "@/lib/social/prisma-store";
import { MemoryStore, type SocialStore } from "@/lib/social/store";

// The same behaviour is required of the in-memory store (used by the fast
// tests) and the real database store (used in production). The database
// store needs the Social Autopilot migration applied to the test database.
const RUN = `ct${Date.now().toString(36)}`;

afterAll(async () => {
  await db.socialMetric.deleteMany({ where: { post: { topic: { startsWith: RUN } } } });
  await db.socialPost.deleteMany({ where: { topic: { startsWith: RUN } } });
  await db.socialTask.deleteMany({ where: { dedupeKey: { startsWith: RUN } } });
  await db.socialNote.deleteMany({ where: { dedupeKey: { startsWith: RUN } } });
  await db.socialSetting.deleteMany({ where: { key: { startsWith: RUN } } });
});

describe.each<[string, () => SocialStore]>([["memory", () => new MemoryStore()], ["database", () => new PrismaSocialStore()]])("SocialStore contract: %s", (name, make) => {
  const key = (k: string) => `${RUN}-${name}-${k}`;

  it("dedupes tasks, even when created at the same moment", async () => {
    const s = make();
    const results = await Promise.all(Array.from({ length: 6 }, () => s.enqueue({ kind: "k", agent: "a", dedupeKey: key("dedupe") })));
    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(new Set(results.map((r) => r.task.id)).size).toBe(1);
  });

  it("hands each task to exactly one of several concurrent workers", async () => {
    const s = make();
    for (let i = 0; i < 8; i++) await s.enqueue({ kind: "claim", agent: "a", dedupeKey: key(`claim${i}`) });
    const got = (await Promise.all(Array.from({ length: 16 }, (_, i) => s.claimNext(new Date(Date.now() + 1000), `w${i}`)))).filter((t) => t?.dedupeKey.startsWith(key("claim")));
    expect(got.length).toBeLessThanOrEqual(8);
    expect(new Set(got.map((t) => t!.id)).size).toBe(got.length); // no task claimed twice
    // Drain whatever is left; every one of ours ends up claimed once in total.
    const rest = [];
    for (;;) { const t = await s.claimNext(new Date(Date.now() + 1000), "drain"); if (!t) break; if (t.dedupeKey.startsWith(key("claim"))) rest.push(t); }
    expect(got.length + rest.length).toBe(8);
  });

  it("requeues with back-off, then fails after max attempts; blocked-until gives the attempt back", async () => {
    const s = make();
    const { task } = await s.enqueue({ kind: "retry", agent: "a", dedupeKey: key("retry"), maxAttempts: 2 });
    const first = await s.claimNext(new Date(Date.now() + 1000), "w");
    expect(first?.id).toBeDefined();
    let mine = first!.id === task.id ? first! : null;
    while (!mine) { const t = await s.claimNext(new Date(Date.now() + 1000), "w"); mine = t?.id === task.id ? t : null; if (!t) break; }
    expect(mine!.attempts).toBe(1);
    expect(await s.failTask(task.id, "boom", 5, new Date(Date.now() + 60_000))).toBe("requeued");
    const again = (await s.listTasks({ limit: 200 })).find((t) => t.id === task.id)!;
    expect(again.status).toBe("QUEUED");
    await s.claimNext(new Date(Date.now() + 120_000), "w");
    const second = (await s.listTasks({ limit: 200 })).find((t) => t.id === task.id)!;
    if (second.status === "RUNNING") expect(await s.failTask(task.id, "boom2", 5, new Date(Date.now() + 60_000))).toBe("failed");
    const { task: t2 } = await s.enqueue({ kind: "wait", agent: "a", dedupeKey: key("wait") });
    for (let i = 0; i < 20; i++) { const c = await s.claimNext(new Date(Date.now() + 1000), "w"); if (c?.id === t2.id) break; }
    await s.blockTask(t2.id, "limit", new Date(Date.now() + 3600_000));
    const blocked = (await s.listTasks({ limit: 200 })).find((t) => t.id === t2.id)!;
    expect(blocked.status).toBe("QUEUED"); expect(blocked.attempts).toBe(0);
  });

  it("recovers a crashed worker's task", async () => {
    const s = make();
    const { task } = await s.enqueue({ kind: "stale", agent: "a", dedupeKey: key("stale") });
    for (let i = 0; i < 20; i++) { const c = await s.claimNext(new Date(Date.now() + 1000), "dead"); if (c?.id === task.id) break; }
    expect(await s.recoverStale(new Date(Date.now() + 3600_000))).toBeGreaterThanOrEqual(1);
    expect((await s.listTasks({ limit: 200 })).find((t) => t.id === task.id)!.status).toBe("QUEUED");
  });

  it("lets only one caller win a post status change (no double publish)", async () => {
    const s = make();
    const p = await s.createPost({ platform: "bluesky", format: "text-post", topic: key("cas"), direction: { hookType: "myth-bust" } });
    await s.updatePost(p.id, { status: "SCHEDULED", content: { body: "hi", hashtags: ["a"] }, scheduledFor: new Date() });
    const wins = await Promise.all(Array.from({ length: 5 }, () => s.transitionPost(p.id, ["SCHEDULED"], "PUBLISHING")));
    expect(wins.filter(Boolean)).toHaveLength(1);
    const back = (await s.getPost(p.id))!;
    expect(back.status).toBe("PUBLISHING"); expect(back.content.body).toBe("hi"); expect(back.direction.hookType).toBe("myth-bust");
  });

  it("counts atomically under concurrency", async () => {
    const s = make();
    await Promise.all(Array.from({ length: 25 }, () => s.incrementSetting(key("counter"), 1)));
    expect(await s.getSetting(key("counter"))).toBe("25");
  });

  it("keeps 'not reported' metrics as null and dedupes notes", async () => {
    const s = make();
    const p = await s.createPost({ platform: "telegram", format: "text-post", topic: key("metric"), direction: {} });
    await s.addMetric({ postId: p.id, collectedAt: new Date(), likes: null, replies: null, shares: null, saves: null, views: null });
    const m = (await s.latestMetrics([p.id])).get(p.id)!;
    expect(m.likes).toBeNull(); expect(m.views).toBeNull();
    expect(await s.addNote({ kind: "RESEARCH", title: "t", body: "b", dedupeKey: key("note") })).not.toBeNull();
    expect(await s.addNote({ kind: "RESEARCH", title: "t", body: "b", dedupeKey: key("note") })).toBeNull();
  });
});
