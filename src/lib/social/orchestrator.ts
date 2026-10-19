// The Orchestrator: deterministic code (no AI) that decides what runs next.
// One call to tick() = recover crashed work, seed the recurring schedule,
// then claim and run due tasks (several at once) until the time budget or the
// task cap is used. Every safety limit lives here, not in the prompts.

import { MAX_DEPTH, istInstant, istParts, type Ctx } from "./agents/core";
import { isStopped, loadConfig } from "./config";
import { BlockedError, PermanentError, TransientError } from "./errors";
import { HANDLERS } from "./registry";
import type { NewTask, Task } from "./types";

export interface TickSummary {
  processed: number; ok: number; failed: number; requeued: number; blocked: number; recovered: number;
  stopped: boolean; mode: string; remaining: number; ms: number; stoppedEarly: boolean;
}

const STALE_LOCK_MS = 5 * 60_000;
export const backoffMs = (attempt: number) => Math.min(2 ** attempt * 60_000, 3600_000); // 2m, 4m, 8m ... max 1h

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, rej) => { t = setTimeout(() => rej(new TransientError(`Task timed out after ${Math.round(ms / 1000)}s`)), ms); });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

/** The recurring schedule. Idempotent: each key is created once per period, so ticking often is harmless. */
export async function seedRecurring(ctx: Ctx): Promise<number> {
  const now = ctx.now();
  const { date, dow } = istParts(now);
  const bucket = (ms: number) => Math.floor(now.getTime() / ms);
  const seeds: NewTask[] = [
    { kind: "research.trends", agent: "trend", dedupeKey: `research.trends:${date}`, runAfter: istInstant(date, "05:30") },
    { kind: "strategy.plan", agent: "strategist", dedupeKey: `plan-fallback:${date}`, runAfter: istInstant(date, "09:00") }, // if the research chain stalled
    { kind: "analytics.collect", agent: "analytics", dedupeKey: `analytics:${bucket(6 * 3600_000)}` },
    { kind: "growth.optimize", agent: "growth", dedupeKey: `growth:${date}`, runAfter: istInstant(date, "06:30") },
    { kind: "community.monitor", agent: "community", dedupeKey: `community:${bucket(3 * 3600_000)}` },
    { kind: "ops.health", agent: "ops", dedupeKey: `ops:${bucket(3600_000)}` },
    { kind: "report.daily", agent: "reporting", dedupeKey: `report.daily:${date}`, runAfter: istInstant(date, "21:00") },
  ];
  if (dow === 0) seeds.push({ kind: "report.weekly", agent: "reporting", dedupeKey: `report.weekly:${date}`, runAfter: istInstant(date, "21:15") });
  let created = 0;
  for (const s of seeds) if ((await ctx.store.enqueue({ ...s, runAfter: s.runAfter ?? now })).created) created++;
  return created;
}

async function runOne(task: Task, ctx: Ctx, deadline: number): Promise<"ok" | "failed" | "requeued" | "blocked"> {
  const started = Date.now();
  const elapsed = () => Date.now() - started;
  const h = HANDLERS[task.kind];
  if (!h) { await ctx.store.failTask(task.id, `Unknown task kind "${task.kind}"`, 0, null); return "failed"; }
  if (task.depth > MAX_DEPTH) { await ctx.store.failTask(task.id, "Task chain too deep (possible loop); stopped", 0, null); return "failed"; }
  try {
    if (h.agent.publicAction && (await isStopped(ctx.store))) throw new BlockedError("Emergency stop is on");
    const budget = Math.max(1000, Math.min(ctx.config.taskTimeoutMs, deadline - Date.now()));
    const out = await withTimeout(h.run(task, ctx), budget);
    // Children first: if we crash before completing, the retry re-creates the same keys harmlessly.
    for (const n of out.next ?? []) {
      if ((n.depth ?? 0) > MAX_DEPTH) continue;
      await ctx.store.enqueue(n);
    }
    await ctx.store.completeTask(task.id, out.result, elapsed());
    return "ok";
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    if (err instanceof BlockedError) { await ctx.store.blockTask(task.id, msg, err.until); return "blocked"; }
    if (err instanceof PermanentError) { await ctx.store.failTask(task.id, msg, elapsed(), null); return "failed"; }
    // Transient or unexpected: try again later with back-off until attempts run out.
    return (await ctx.store.failTask(task.id, msg, elapsed(), new Date(ctx.now().getTime() + backoffMs(task.attempts)))) === "requeued" ? "requeued" : "failed";
  }
}

export async function tick(ctx: Ctx, workerId = `w_${Math.random().toString(36).slice(2, 8)}`): Promise<TickSummary> {
  const t0 = Date.now();
  const config = await loadConfig(ctx.store);
  const c: Ctx = { ...ctx, config };
  const deadline = t0 + config.tickBudgetMs;
  const recovered = await c.store.recoverStale(new Date(c.now().getTime() - STALE_LOCK_MS));
  await seedRecurring(c);
  await c.store.setSetting("lastTick", c.now().toISOString());

  const tally = { ok: 0, failed: 0, requeued: 0, blocked: 0 };
  let processed = 0, stoppedEarly = false;
  while (processed < config.maxTasksPerTick) {
    if (Date.now() > deadline - 3000) { stoppedEarly = true; break; }
    const batch: Task[] = [];
    for (let i = 0; i < config.concurrency && processed + batch.length < config.maxTasksPerTick; i++) {
      const t = await c.store.claimNext(c.now(), workerId);
      if (!t) break;
      batch.push(t);
    }
    if (!batch.length) break;
    const results = await Promise.all(batch.map((t) => runOne(t, c, deadline)));
    for (const r of results) tally[r]++;
    processed += batch.length;
  }
  const queued = await c.store.listTasks({ status: "QUEUED", limit: 200 });
  return {
    processed, ...tally, recovered, stopped: await isStopped(c.store), mode: config.mode,
    remaining: queued.filter((t) => t.runAfter <= c.now()).length, ms: Date.now() - t0, stoppedEarly,
  };
}
