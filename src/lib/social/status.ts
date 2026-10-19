// Everything the control panel shows, assembled in one place. Never includes
// credential values - only whether each platform is connected.

import { AGENTS, FOLDED_AGENTS, NOT_TASK_AGENTS } from "./registry";
import { dayKey, isStopped, loadConfig } from "./config";
import { publishersFor } from "./platforms";
import type { SocialStore } from "./store";

export async function socialStatus(store: SocialStore, now = new Date()) {
  const [config, stopped, lastTick, counts, failed, recent, posts, notes] = await Promise.all([
    loadConfig(store), isStopped(store), store.getSetting("lastTick"), store.countTasks(),
    store.listTasks({ status: "FAILED", limit: 15 }), store.listTasks({ limit: 40 }),
    store.listPosts({ limit: 60 }), Promise.all((["REPORT", "ALERT", "RESEARCH", "AUDIENCE", "COMMENT", "DECISION", "EXPERIMENT"] as const).map((k) => store.listNotes(k, k === "REPORT" ? 6 : 12))),
  ]);
  const blocked = await store.listTasks({ status: "BLOCKED", limit: 15 });
  const metrics = await store.latestMetrics(posts.map((p) => p.id));
  const pubs = publishersFor();
  const used = Number((await store.getSetting(`ai:${dayKey(now)}`)) ?? 0);
  const [reports, alerts, research, audience, comments, decisions, experiments] = notes;
  const brief = (n: (typeof reports)[number]) => ({ id: n.id, title: n.title, body: n.body, sourceUrl: n.sourceUrl, verified: n.verified, at: n.createdAt.toISOString() });
  return {
    now: now.toISOString(), config, stopped, lastTick,
    minutesSinceTick: lastTick ? Math.round((now.getTime() - Date.parse(lastTick)) / 60_000) : null,
    ai: { usedToday: used, limit: config.maxAiCallsPerDay },
    taskCounts: counts,
    connections: Object.fromEntries(["bluesky", "telegram", "linkedin"].map((p) => [p, !!pubs[p as "bluesky"]?.configured()])),
    ownerAlertsConnected: !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_OWNER_CHAT_ID,
    cronSecretSet: !!process.env.CRON_SECRET, geminiKeySet: !!process.env.GEMINI_API_KEY,
    agents: AGENTS.map((a) => ({ id: a.id, name: a.name, responsibility: a.responsibility, inputs: a.inputs, outputs: a.outputs, tools: a.tools, usesAi: a.usesAi, publicAction: !!a.publicAction, failureConditions: a.failureConditions, taskKinds: Object.keys(a.handlers) })),
    otherAgents: NOT_TASK_AGENTS, foldedAgents: FOLDED_AGENTS,
    tasks: recent.map((t) => ({ id: t.id, kind: t.kind, agent: t.agent, status: t.status, attempts: t.attempts, error: t.error, durationMs: t.durationMs, at: t.createdAt.toISOString(), postId: t.postId })),
    failed: failed.map((t) => ({ id: t.id, kind: t.kind, agent: t.agent, error: t.error, attempts: t.attempts, at: (t.finishedAt ?? t.createdAt).toISOString() })),
    blocked: blocked.map((t) => ({ id: t.id, kind: t.kind, reason: t.error })),
    posts: posts.map((p) => {
      const m = metrics.get(p.id);
      return {
        id: p.id, platform: p.platform, status: p.status, format: p.format, topic: p.topic, hook: p.hookText, body: p.content.body ?? "", hashtags: p.content.hashtags ?? [],
        cardText: p.content.cardText ?? null, alt: p.content.alt ?? null, video: p.content.video ?? null, sources: p.content.sources ?? [],
        direction: { hookType: p.direction.hookType, narrative: p.direction.narrative, visualStyle: p.direction.visualStyle, cta: p.direction.cta, characters: p.direction.characters },
        scheduledFor: p.scheduledFor?.toISOString() ?? null, publishedAt: p.publishedAt?.toISOString() ?? null, url: p.externalUrl, clicks: p.clicks, error: p.error, revisions: p.revisionCount,
        metrics: m ? { likes: m.likes, replies: m.replies, shares: m.shares } : null,
      };
    }),
    notes: { reports: reports.map(brief), alerts: alerts.map(brief), research: research.map(brief), audience: audience.map(brief), comments: comments.map(brief), decisions: [...decisions, ...experiments].map(brief) },
  };
}
