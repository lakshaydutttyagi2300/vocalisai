import { describe, expect, it } from "vitest";
import { MAX_DEPTH } from "@/lib/social/agents/core";
import { BlockedError, PermanentError, TransientError } from "@/lib/social/errors";
import { backoffMs, tick, withTimeout } from "@/lib/social/orchestrator";
import { HANDLERS } from "@/lib/social/registry";
import { setStopped } from "@/lib/social/config";
import { emergencyStop } from "@/lib/social/actions";
import { MemoryStore } from "@/lib/social/store";
import { makeCtx } from "./social-harness";

const testAgent = (publicAction = false) => ({ id: "test", name: "t", responsibility: "", inputs: [], outputs: [], tools: [], usesAi: false, failureConditions: [], publicAction, handlers: {} });
const register = (kind: string, run: (t: never) => Promise<{ result: Record<string, unknown>; next?: never[] }>, publicAction = false) => { (HANDLERS as Record<string, unknown>)[kind] = { agent: testAgent(publicAction), run }; };

describe("task queue", () => {
  it("never creates the same task twice (dedupe key)", async () => {
    const s = new MemoryStore();
    const a = await s.enqueue({ kind: "x", agent: "a", dedupeKey: "k" });
    const b = await s.enqueue({ kind: "x", agent: "a", dedupeKey: "k" });
    expect(a.created).toBe(true); expect(b.created).toBe(false); expect(b.task.id).toBe(a.task.id);
  });

  it("two workers claiming at once never get the same task", async () => {
    const s = new MemoryStore();
    for (let i = 0; i < 20; i++) await s.enqueue({ kind: "x", agent: "a", dedupeKey: `k${i}` });
    const claimed = (await Promise.all(Array.from({ length: 30 }, (_, i) => s.claimNext(new Date(), `w${i % 5}`)))).filter(Boolean);
    expect(claimed).toHaveLength(20);
    expect(new Set(claimed.map((t) => t!.id)).size).toBe(20);
  });

  it("recovers a task whose worker died, and gives up after max attempts", async () => {
    const s = new MemoryStore();
    await s.enqueue({ kind: "x", agent: "a", dedupeKey: "k", maxAttempts: 2 });
    const t0 = new Date("2026-10-20T00:00:00Z");
    await s.claimNext(t0, "dead-worker");
    expect(await s.recoverStale(new Date(t0.getTime() - 1))).toBe(0); // lock is newer than the cut-off
    expect(await s.recoverStale(new Date(t0.getTime() + 60_000))).toBe(1);
    await s.claimNext(new Date(t0.getTime() + 61_000), "dead-worker-2");
    await s.recoverStale(new Date(t0.getTime() + 600_000));
    expect((await s.listTasks({ limit: 5 }))[0].status).toBe("FAILED");
  });
});

describe("orchestrator", () => {
  it("retries a temporary failure with back-off, then succeeds", async () => {
    const { ctx, store, advance } = await makeCtx();
    let n = 0;
    register("test.flaky", async () => { if (++n < 3) throw new TransientError("network"); return { result: { n } }; });
    await store.enqueue({ kind: "test.flaky", agent: "test", dedupeKey: "flaky", maxAttempts: 4 });
    await tick(ctx);
    let t = (await store.listTasks({ limit: 50 })).find((x) => x.kind === "test.flaky")!;
    expect(t.status).toBe("QUEUED"); expect(t.runAfter.getTime()).toBeGreaterThan(ctx.now().getTime());
    expect(n).toBe(1); // not retried within the same tick: it waits for back-off
    advance(backoffMs(1) + 1000); await tick(ctx); advance(backoffMs(2) + 1000); await tick(ctx);
    t = (await store.listTasks({ limit: 50 })).find((x) => x.kind === "test.flaky")!;
    expect(t.status).toBe("DONE"); expect(t.attempts).toBe(3);
  });

  it("stops retrying after max attempts and records the error", async () => {
    const { ctx, store, advance } = await makeCtx();
    register("test.down", async () => { throw new TransientError("still down"); });
    await store.enqueue({ kind: "test.down", agent: "test", dedupeKey: "down", maxAttempts: 2 });
    await tick(ctx); advance(3 * 3600_000); await tick(ctx);
    const t = (await store.listTasks({ limit: 50 })).find((x) => x.kind === "test.down")!;
    expect(t.status).toBe("FAILED"); expect(t.error).toContain("still down"); expect(t.attempts).toBe(2);
  });

  it("does not retry a permanent failure", async () => {
    const { ctx, store } = await makeCtx();
    let n = 0;
    register("test.bad", async () => { n++; throw new PermanentError("bad token"); });
    await store.enqueue({ kind: "test.bad", agent: "test", dedupeKey: "bad" });
    await tick(ctx);
    expect(n).toBe(1);
    expect((await store.listTasks({ limit: 50 })).find((x) => x.kind === "test.bad")!.status).toBe("FAILED");
  });

  it("re-queues work blocked until a time (daily AI limit) instead of losing it", async () => {
    const { ctx, store, advance } = await makeCtx();
    let allowed = false;
    register("test.budget", async () => { if (!allowed) throw new BlockedError("limit", new Date(ctx.now().getTime() + 3600_000)); return { result: {} }; });
    await store.enqueue({ kind: "test.budget", agent: "test", dedupeKey: "budget" });
    const sum = await tick(ctx);
    expect(sum.blocked).toBe(1);
    const t = (await store.listTasks({ limit: 50 })).find((x) => x.kind === "test.budget")!;
    expect(t.status).toBe("QUEUED"); expect(t.attempts).toBe(0);
    allowed = true; advance(3700_000); await tick(ctx);
    expect((await store.listTasks({ limit: 50 })).find((x) => x.kind === "test.budget")!.status).toBe("DONE");
  });

  it("runs independent tasks concurrently", async () => {
    const { ctx, store } = await makeCtx({ concurrency: 3 });
    let active = 0, peak = 0;
    register("test.slow", async () => { active++; peak = Math.max(peak, active); await new Promise((r) => setTimeout(r, 40)); active--; return { result: {} }; });
    for (let i = 0; i < 6; i++) await store.enqueue({ kind: "test.slow", agent: "test", dedupeKey: `s${i}` });
    await tick(ctx);
    expect(peak).toBe(3);
    expect((await store.listTasks({ limit: 50 })).filter((t) => t.kind === "test.slow" && t.status === "DONE")).toHaveLength(6);
  });

  it("cuts off a runaway chain of tasks", async () => {
    const { ctx, store } = await makeCtx({ maxTasksPerTick: 100 });
    register("test.loop", async (t: { depth: number; id: string }) => ({ result: {}, next: [{ kind: "test.loop", agent: "test", dedupeKey: `loop${t.id}`, depth: t.depth + 1, parentId: t.id }] as never[] }));
    await store.enqueue({ kind: "test.loop", agent: "test", dedupeKey: "loop-root" });
    await tick(ctx);
    const loops = (await store.listTasks({ limit: 500 })).filter((t) => t.kind === "test.loop");
    expect(loops.length).toBeLessThanOrEqual(MAX_DEPTH + 1);
    expect(Math.max(...loops.map((t) => t.depth))).toBeLessThanOrEqual(MAX_DEPTH);
  });

  it("times out a task that hangs", async () => {
    await expect(withTimeout(new Promise(() => undefined), 30)).rejects.toThrow(/timed out/);
  });

  it("recovers tasks left RUNNING by a crashed worker on the next tick", async () => {
    const { ctx, store, advance } = await makeCtx();
    register("test.crash", async () => ({ result: { ok: true } }));
    await store.enqueue({ kind: "test.crash", agent: "test", dedupeKey: "crash" });
    await store.claimNext(ctx.now(), "dead"); // claimed, never finished
    advance(10 * 60_000);
    const sum = await tick(ctx);
    expect(sum.recovered).toBe(1);
    expect((await store.listTasks({ limit: 50 })).find((x) => x.kind === "test.crash")!.status).toBe("DONE");
  });
});

describe("emergency stop", () => {
  it("blocks public tasks immediately but lets research keep running; releasing them runs them", async () => {
    const { ctx, store } = await makeCtx();
    let posted = 0, researched = 0;
    register("test.public", async () => { posted++; return { result: {} }; }, true);
    register("test.research", async () => { researched++; return { result: {} }; });
    await emergencyStop(store);
    await store.enqueue({ kind: "test.public", agent: "test", dedupeKey: "pub" });
    await store.enqueue({ kind: "test.research", agent: "test", dedupeKey: "res" });
    const sum = await tick(ctx);
    expect(sum.stopped).toBe(true);
    expect(posted).toBe(0); expect(researched).toBe(1);
    expect((await store.listTasks({ limit: 50 })).find((x) => x.kind === "test.public")!.status).toBe("BLOCKED");
    await setStopped(store, false);
    await store.unblockTasks(["test.public"]); // resume() does this for the real publish task (see pipeline test)
    await tick(ctx);
    expect(posted).toBe(1);
  });
});
