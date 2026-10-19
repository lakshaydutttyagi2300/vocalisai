import { z } from "zod";
import { canPublish, dayKey, isStopped, setStopped } from "../config";
import { BlockedError, PermanentError, TransientError } from "../errors";
import { redact } from "../memory";
import { composeText, trackedLink } from "../platforms";
import type { Direction } from "../types";
import { usesLink } from "./content";
import type { AgentDef } from "./core";

export const HARD_DAILY_CAP = 8; // per platform, whatever the settings say
const STALE_AFTER_MS = 12 * 3600_000;

// ---------- Publishing agent ----------
export const publisherAgent: AgentDef = {
  id: "publisher", name: "Publishing agent",
  responsibility: "Posts approved content at its scheduled time through the platform's official free API. Posts exactly once (the SCHEDULED->PUBLISHING switch is atomic), retries only temporary failures, reports permanent ones, and refuses to post while Emergency stop is on or the mode is Draft.",
  inputs: ["SCHEDULED post", "platform credentials from environment", "mode and emergency-stop state"],
  outputs: ["PUBLISHED post with platform id and link, or FAILED with a plain reason"],
  tools: ["Bluesky / Telegram / LinkedIn official APIs", "image renderer"],
  usesAi: false, publicAction: true,
  failureConditions: ["Emergency stop on (task waits)", "Draft mode (task waits)", "credentials missing or rejected (human action)", "network/5xx/429 (retried with back-off)", "post missed its slot by over 12 hours (sent back for review)"],
  handlers: {
    "publish.post": async (task, ctx) => {
      const post = await ctx.store.getPost(String(task.payload.postId));
      if (!post || post.status !== "SCHEDULED") return { result: { skipped: `post is ${post?.status ?? "missing"}` } };
      if (await isStopped(ctx.store)) throw new BlockedError("Emergency stop is on");
      if (!canPublish(ctx.config.mode)) throw new BlockedError("Draft mode: publishing is off");
      const now = ctx.now();
      if (post.scheduledFor && now.getTime() - post.scheduledFor.getTime() > STALE_AFTER_MS) {
        await ctx.store.transitionPost(post.id, ["SCHEDULED"], "NEEDS_REVIEW", { error: "Missed its time slot (publishing was paused or down); check it is still relevant" });
        return { result: { postId: post.id, outcome: "stale-sent-to-review" } };
      }
      const pub = ctx.publishers[post.platform];
      if (!pub) throw new BlockedError(`${post.platform} cannot be published automatically; post it by hand`);
      if (!pub.configured()) throw new BlockedError(`${post.platform} is not connected (credentials missing)`);
      const today = (await ctx.store.listPosts({ statuses: ["PUBLISHED", "PUBLISHING"], limit: 100, sinceDays: 1 }))
        .filter((p) => p.platform === post.platform && p.publishedAt && dayKey(p.publishedAt) === dayKey(now)).length;
      if (today >= HARD_DAILY_CAP) { const t = new Date(now); t.setUTCHours(24, 0, 0, 0); throw new BlockedError(`Daily ${post.platform} post cap (${HARD_DAILY_CAP}) reached`, t); }

      // Atomic: if two workers race, only one gets past this line.
      if (!(await ctx.store.transitionPost(post.id, ["SCHEDULED"], "PUBLISHING"))) return { result: { skipped: "another worker has it" } };
      try {
        const d = post.direction as Direction;
        const text = composeText(post.platform, post.content, usesLink(d) ? trackedLink(ctx.config.siteUrl, post) : undefined);
        const imagePng = post.format === "text-post" ? undefined : await ctx.renderCard({ text: post.content.cardText ?? post.hookText, style: d.visualStyle });
        // Re-check just before the public call: a stop pressed while we were rendering must win.
        if (await isStopped(ctx.store)) { await ctx.store.transitionPost(post.id, ["PUBLISHING"], "SCHEDULED"); throw new BlockedError("Emergency stop is on"); }
        const r = await pub.publish({ text, imagePng, alt: post.content.alt });
        await ctx.store.transitionPost(post.id, ["PUBLISHING"], "PUBLISHED", { publishedAt: ctx.now(), externalId: r.id, externalUrl: r.url ?? null, error: null });
        return { result: { postId: post.id, outcome: "published", url: r.url ?? null } };
      } catch (err) {
        if (err instanceof BlockedError) throw err;
        if (err instanceof TransientError) { await ctx.store.transitionPost(post.id, ["PUBLISHING"], "SCHEDULED"); throw err; }
        const msg = redact(err instanceof Error ? err.message : "Unknown publishing error").slice(0, 300);
        await ctx.store.transitionPost(post.id, ["PUBLISHING"], "FAILED", { error: msg });
        await ctx.notify(`VocalisAi Autopilot: a ${post.platform} post failed and was not retried.\n${msg}`);
        throw new PermanentError(msg);
      }
    },
  },
};

// ---------- Community Management agent ----------
const triageSchema = z.object({
  category: z.enum(["question", "praise", "feedback", "complaint", "spam", "lead", "legal", "financial", "sensitive", "other"]),
  confidence: z.number().min(0).max(1), draftReply: z.string().max(280),
});
const ESCALATE = new Set(["complaint", "legal", "financial", "sensitive"]);

export const communityAgent: AgentDef = {
  id: "community", name: "Community Management agent",
  responsibility: "Reads new public replies and mentions, classifies them (question, praise, complaint, spam, lead, legal/financial/sensitive), drafts a helpful reply for questions and praise, and escalates complaints and anything sensitive to the owner. It never posts a reply itself.",
  inputs: ["recent replies/mentions from Bluesky"],
  outputs: ["COMMENT notes with category, confidence and a draft reply; ALERT notes for escalations"],
  tools: ["Bluesky notifications API (read only)", "Gemini (free tier, capped)"],
  usesAi: true,
  failureConditions: ["Bluesky not connected (skipped)", "AI reply not in the expected shape"],
  handlers: {
    "community.monitor": async (_task, ctx) => {
      const pub = ctx.publishers.bluesky;
      if (!pub?.configured() || !pub.fetchReplies) return { result: { skipped: "Bluesky is not connected" } };
      const replies = await pub.fetchReplies();
      const known = new Set((await ctx.store.listNotes("COMMENT", 300)).map((n) => n.dedupeKey));
      let classified = 0, escalated = 0;
      for (const r of replies.filter((x) => !known.has(`comment:${x.id}`)).slice(0, 8)) {
        const t = await ctx.ai.json(triageSchema, `You triage a public reply to a brand account about ${ctx.config.niche}. Reply text: ${JSON.stringify(r.text.slice(0, 500))}
Classify it. Only draft a short, friendly, honest reply (max 250 chars, no promises, no discounts, no personal data requests) for "question" or "praise"; otherwise draftReply is "". Return JSON {"category":...,"confidence":0-1,"draftReply":string}.`, "comment triage");
        const escalate = ESCALATE.has(t.category) || t.confidence < 0.6;
        await ctx.store.addNote({ kind: "COMMENT", title: redact(r.text).slice(0, 140), body: JSON.stringify({ category: t.category, confidence: t.confidence, draftReply: t.draftReply, replyTo: r.id, escalate }), dedupeKey: `comment:${r.id}` });
        classified++;
        if (escalate) {
          escalated++;
          const n = await ctx.store.addNote({ kind: "ALERT", title: `Needs you: ${t.category} comment`, body: `A ${t.category} comment needs a human reply: "${redact(r.text).slice(0, 160)}" (${r.id})`, dedupeKey: `alert:comment:${r.id}` });
          if (n) await ctx.notify(`VocalisAi Autopilot: ${t.category} comment needs your reply. ${r.id}`);
        }
      }
      return { result: { seen: replies.length, classified, escalated } };
    },
  },
};

// ---------- Analytics agent ----------
export const analyticsAgent: AgentDef = {
  id: "analytics", name: "Analytics agent",
  responsibility: "Collects the numbers each platform really exposes for published posts (Bluesky: likes, replies, reposts+quotes). Anything a platform does not report is stored as 'unknown', never as zero. Site clicks come from tracked links.",
  inputs: ["published posts", "platform metrics APIs"],
  outputs: ["metric snapshots per post"],
  tools: ["Bluesky public API"],
  usesAi: false,
  failureConditions: ["platform API unreachable (retried)"],
  handlers: {
    "analytics.collect": async (_task, ctx) => {
      const posts = (await ctx.store.listPosts({ statuses: ["PUBLISHED"], limit: 100, sinceDays: 21 })).filter((p) => p.externalId);
      let collected = 0;
      const unsupported = new Set<string>();
      for (const platform of new Set(posts.map((p) => p.platform))) {
        const pub = ctx.publishers[platform];
        if (!pub?.fetchMetrics) { unsupported.add(platform); continue; }
        const mine = posts.filter((p) => p.platform === platform);
        const got = await pub.fetchMetrics(mine.map((p) => p.externalId!));
        for (const p of mine) {
          const m = got.get(p.externalId!);
          if (m) { await ctx.store.addMetric({ postId: p.id, collectedAt: ctx.now(), ...m }); collected++; }
        }
      }
      return { result: { collected, platformsWithoutMetrics: [...unsupported] } };
    },
  },
};

export { setStopped };
