import { loadConfig, dayKey, isStopped, setStopped, AUTO_PLATFORMS } from "../config";
import { redact } from "../memory";
import type { Metric, Post } from "../types";
import type { Direction } from "../types";
import { istParts, type AgentDef, type Ctx } from "./core";

// ---------- Growth Optimization agent ----------
export const MIN_SCORED_POSTS = 12; // below this there is no trustworthy baseline
export const MIN_ARM_POSTS = 3; // per hook/format/etc. before it may move a weight
const DIMENSIONS = ["hookType", "narrative", "visualStyle", "cta", "pillar", "voiceStyle"] as const;

export const engagement = (m: Metric) => (m.likes ?? 0) + 2 * (m.replies ?? 0) + 3 * (m.shares ?? 0);
const hasNumbers = (m?: Metric): m is Metric => !!m && m.likes !== null;

export function computeWeights(scored: { post: Post; score: number }[]) {
  const byPlatform = new Map<string, number[]>();
  for (const s of scored) byPlatform.set(s.post.platform, [...(byPlatform.get(s.post.platform) ?? []), s.score]);
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  // Normalise inside each platform so a busy platform does not drown out a quiet one.
  const rel = scored.map((s) => ({ post: s.post, v: mean(byPlatform.get(s.post.platform)!) > 0 ? s.score / mean(byPlatform.get(s.post.platform)!) : 1 }));
  const weights: Record<string, Record<string, number>> = {};
  const table: { dimension: string; value: string; posts: number; relative: number; weight: number }[] = [];
  for (const dim of DIMENSIONS) {
    const groups = new Map<string, number[]>();
    for (const r of rel) { const k = (r.post.direction as Direction)[dim]; if (k) groups.set(k, [...(groups.get(k) ?? []), r.v]); }
    for (const [value, vs] of groups) {
      if (vs.length < MIN_ARM_POSTS) continue;
      const r = mean(vs), shrink = vs.length / (vs.length + 4);
      const w = Math.min(1.4, Math.max(0.7, 1 + (r - 1) * shrink));
      (weights[dim] ??= {})[value] = Math.round(w * 100) / 100;
      table.push({ dimension: dim, value, posts: vs.length, relative: Math.round(r * 100) / 100, weight: Math.round(w * 100) / 100 });
    }
  }
  return { weights, table, baseline: Math.round(mean(scored.map((s) => s.score)) * 10) / 10 };
}

export const growthAgent: AgentDef = {
  id: "growth", name: "Growth Optimization agent",
  responsibility: "Learns from real results without chasing noise: compares each hook, story shape, visual style, CTA, pillar and voice against the platform average, only after enough posts (12 scored posts overall, 3 per option), and nudges the strategist's choices by at most 0.7x-1.4x. The strategist still rotates, so winners are never simply copied.",
  inputs: ["metric snapshots of posts at least 24 hours old", "post directions"],
  outputs: ["growth weights (setting)", "EXPERIMENT/DECISION note with baseline and table"],
  tools: ["rules only (no AI)"],
  usesAi: false,
  failureConditions: ["not enough data (no change, and the report says so)"],
  handlers: {
    "growth.optimize": async (_task, ctx) => {
      const posts = (await ctx.store.listPosts({ statuses: ["PUBLISHED"], limit: 200, sinceDays: 90 }))
        .filter((p) => p.publishedAt && ctx.now().getTime() - p.publishedAt.getTime() >= 24 * 3600_000);
      const metrics = await ctx.store.latestMetrics(posts.map((p) => p.id));
      const scored = posts.flatMap((post) => { const m = metrics.get(post.id); return hasNumbers(m) ? [{ post, score: engagement(m) }] : []; });
      if (scored.length < MIN_SCORED_POSTS) {
        await ctx.store.addNote({ kind: "DECISION", title: "Growth: not enough data to change strategy", body: `${scored.length} of ${MIN_SCORED_POSTS} posts have usable numbers. Keeping the current mix.`, dedupeKey: `growth:${dayKey(ctx.now())}` });
        return { result: { changed: false, scored: scored.length, needed: MIN_SCORED_POSTS } };
      }
      const { weights, table, baseline } = computeWeights(scored);
      await ctx.store.setSetting("growth:weights", JSON.stringify(weights));
      await ctx.store.addNote({
        kind: "EXPERIMENT", title: `Growth weights updated from ${scored.length} posts`,
        body: JSON.stringify({ baselineEngagementPerPost: baseline, scoring: "likes + 2*replies + 3*reposts, relative to platform average", table }),
        dedupeKey: `growth:${dayKey(ctx.now())}`,
      });
      return { result: { changed: true, scored: scored.length, baseline, options: table.length } };
    },
  },
};

// ---------- Operations & Security agent ----------
export const opsAgent: AgentDef = {
  id: "ops", name: "Operations & Security agent",
  responsibility: "Watches the machine: missing or expiring credentials, repeated publish failures (it switches publishing off by itself after 3 in a row), posts stuck mid-publish, failed tasks, AI quota use and an empty calendar. Redacts secrets from everything stored. Alerts the owner on Telegram once per problem per day.",
  inputs: ["tasks, posts, settings, environment (presence of credentials only)"],
  outputs: ["ALERT notes + owner notification; emergency stop when publishing keeps failing"],
  tools: ["database", "Telegram owner chat"],
  usesAi: false,
  failureConditions: ["none expected; it is the thing that reports the others"],
  handlers: {
    "ops.health": async (_task, ctx) => {
      const alerts: { code: string; text: string }[] = [];
      const cfg = await loadConfig(ctx.store);
      for (const p of cfg.platforms.filter((x) => AUTO_PLATFORMS.includes(x))) {
        const pub = ctx.publishers[p];
        if (!pub || !pub.configured()) alerts.push({ code: `creds:${p}`, text: `${p} is enabled but not connected - add its credentials (see docs/SOCIAL_AUTOPILOT.md).` });
      }
      const exp = process.env.LINKEDIN_TOKEN_EXPIRES;
      if (cfg.platforms.includes("linkedin") && exp && Date.parse(exp) - ctx.now().getTime() < 7 * 864e5) alerts.push({ code: "linkedin-token", text: "The LinkedIn access token expires within 7 days - renew it." });

      const recent = await ctx.store.listPosts({ statuses: ["PUBLISHED", "FAILED"], limit: 3 });
      let autoStopped = false;
      if (recent.length === 3 && recent.every((p) => p.status === "FAILED") && !(await isStopped(ctx.store))) {
        await setStopped(ctx.store, true); autoStopped = true;
        alerts.push({ code: "auto-stop", text: "Publishing was switched off automatically: the last 3 posts all failed. Fix the cause, then turn publishing back on in the panel." });
      }
      const stuck = (await ctx.store.listPosts({ statuses: ["PUBLISHING"], limit: 20 })).filter((p) => p.scheduledFor && ctx.now().getTime() - p.scheduledFor.getTime() > 15 * 60_000);
      if (stuck.length) alerts.push({ code: "stuck-publishing", text: `${stuck.length} post(s) stuck mid-publish. They may or may not be live - check the platform, then mark them published or failed in the panel. They are NOT retried automatically, to avoid double posts.` });
      const failed = (await ctx.store.listTasks({ status: "FAILED", limit: 50 })).filter((t) => t.finishedAt && ctx.now().getTime() - t.finishedAt.getTime() < 864e5);
      if (failed.length >= 5) alerts.push({ code: "task-failures", text: `${failed.length} tasks failed in the last 24 hours. See the Failures list in the panel.` });
      const used = Number((await ctx.store.getSetting(`ai:${dayKey(ctx.now())}`)) ?? 0);
      if (cfg.maxAiCallsPerDay > 0 && used / cfg.maxAiCallsPerDay >= 0.8) alerts.push({ code: "ai-budget", text: `${used} of ${cfg.maxAiCallsPerDay} free AI calls used today.` });
      const upcoming = await ctx.store.listPosts({ statuses: ["DRAFT", "NEEDS_REVIEW", "SCHEDULED"], limit: 50 });
      if (cfg.postsPerDay > 0 && !upcoming.length) alerts.push({ code: "empty-calendar", text: "Nothing is queued or waiting for review." });
      const lastTick = await ctx.store.getSetting("lastTick");
      let sent = 0;
      for (const a of alerts) {
        const n = await ctx.store.addNote({ kind: "ALERT", title: a.text.slice(0, 100), body: redact(a.text), dedupeKey: `alert:${a.code}:${dayKey(ctx.now())}` });
        if (n && !["ai-budget", "empty-calendar"].includes(a.code)) { await ctx.notify(`VocalisAi Autopilot: ${a.text}`); sent++; }
      }
      return { result: { alerts: alerts.map((a) => a.code), notified: sent, autoStopped, lastTick } };
    },
  },
};

// ---------- Reporting agent ----------
async function snapshot(ctx: Ctx, days: number) {
  const since = ctx.now().getTime() - days * 864e5;
  const tasks = (await ctx.store.listTasks({ limit: 500 })).filter((t) => t.createdAt.getTime() >= since);
  const posts = await ctx.store.listPosts({ limit: 300, sinceDays: days });
  const by = <T,>(xs: T[], f: (x: T) => string) => xs.reduce<Record<string, number>>((o, x) => ((o[f(x)] = (o[f(x)] ?? 0) + 1), o), {});
  return { tasks, posts, taskStatus: by(tasks, (t) => t.status), postStatus: by(posts, (p) => p.status) };
}
const fmt = (o: Record<string, number>) => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(", ") || "none";

export const reportingAgent: AgentDef = {
  id: "reporting", name: "Reporting agent",
  responsibility: "Writes a daily operations summary and a weekly performance report, with 'what happened' (facts from the database) kept apart from 'what we suggest' (recommendations), and says plainly when there is not enough data. Sends a short version to the owner on Telegram.",
  inputs: ["tasks, posts, metrics, alerts, growth notes"],
  outputs: ["REPORT notes (markdown)"],
  tools: ["database", "Telegram owner chat"],
  usesAi: false,
  failureConditions: ["none expected"],
  handlers: {
    "report.daily": async (_t, ctx) => {
      const s = await snapshot(ctx, 1);
      const alerts = (await ctx.store.listNotes("ALERT", 10)).filter((n) => ctx.now().getTime() - n.createdAt.getTime() < 864e5);
      const review = s.posts.filter((p) => p.status === "NEEDS_REVIEW");
      const published = s.posts.filter((p) => p.status === "PUBLISHED");
      const body = [
        `# Daily report ${dayKey(ctx.now())}`, "", "## What happened",
        `- Tasks (24h): ${fmt(s.taskStatus)}`, `- Posts created (24h): ${fmt(s.postStatus)}`,
        `- Published: ${published.length ? published.map((p) => `${p.platform} "${p.hookText.slice(0, 50)}"`).join("; ") : "none"}`,
        `- Alerts: ${alerts.length ? alerts.map((a) => a.title).join(" | ") : "none"}`,
        "", "## Needs you", review.length ? review.map((p) => `- Review ${p.platform}: "${p.hookText.slice(0, 60)}"`).join("\n") : "- Nothing waiting for approval",
        "", "## Suggestions", "- Reports describe results only; suggestions come from the weekly report once enough posts have numbers.",
      ].join("\n");
      await ctx.store.addNote({ kind: "REPORT", title: `Daily report ${dayKey(ctx.now())}`, body, dedupeKey: `report:daily:${dayKey(ctx.now())}` });
      await ctx.notify(`VocalisAi Autopilot daily: ${published.length} published, ${review.length} waiting for your approval, ${alerts.length} alerts.`);
      return { result: { published: published.length, awaitingReview: review.length, alerts: alerts.length } };
    },
    "report.weekly": async (_t, ctx) => {
      const s = await snapshot(ctx, 7);
      const published = s.posts.filter((p) => p.status === "PUBLISHED");
      const metrics = await ctx.store.latestMetrics(published.map((p) => p.id));
      const rows = published.map((p) => ({ p, m: metrics.get(p.id) })).map(({ p, m }) => ({ p, m, score: m && m.likes !== null ? engagement(m) : null }));
      const known = rows.filter((r) => r.score !== null).sort((a, b) => b.score! - a.score!);
      const weights = (await ctx.store.listNotes("EXPERIMENT", 1))[0];
      const clicks = published.reduce((n, p) => n + p.clicks, 0);
      const line = (r: (typeof rows)[number]) => `- ${r.p.platform} ${(r.p.direction as Direction).hookType}/${(r.p.direction as Direction).narrative}: "${r.p.hookText.slice(0, 60)}" - ${r.score} (likes ${r.m?.likes}, replies ${r.m?.replies}, reposts ${r.m?.shares})`;
      const body = [
        `# Weekly report ${dayKey(ctx.now())}`, "", "## Results (actual numbers)",
        `- Posts published: ${published.length}; with numbers available: ${known.length}; without (platform does not report): ${rows.length - known.length}`,
        `- Clicks from tracked links to the site: ${clicks}`,
        known.length ? "- Best:\n" + known.slice(0, 3).map(line).join("\n") : "- No post has numbers yet.",
        known.length > 3 ? "- Weakest:\n" + known.slice(-2).map(line).join("\n") : "",
        "", "## What the data supports",
        weights ? `- ${weights.title} (see Memory: ${weights.createdAt.toISOString().slice(0, 10)})` : `- Not enough data yet: the optimizer needs ${MIN_SCORED_POSTS} posts with numbers before changing anything. Treat any single post's result as luck.`,
        "", "## Not measured", "- Followers gained, watch time and retention are not available through the free APIs used here; check them in each app's own insights.",
        "- Sign-ups from social are not attributed yet; tracked-link clicks are the closest measure.",
      ].filter((x) => x !== "").join("\n");
      await ctx.store.addNote({ kind: "REPORT", title: `Weekly report ${dayKey(ctx.now())}`, body, dedupeKey: `report:weekly:${dayKey(ctx.now())}` });
      await ctx.notify(`VocalisAi Autopilot weekly: ${published.length} posts published, ${clicks} link clicks. Full report in the panel.`);
      return { result: { published: published.length, withNumbers: known.length, clicks } };
    },
  },
};

export { istParts };
