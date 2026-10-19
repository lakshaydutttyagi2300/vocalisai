import { z } from "zod";
import { AUTO_PLATFORMS } from "../config";
import { history } from "../memory";
import { composeText, MAX_HASHTAGS, platformLimit, trackedLink } from "../platforms";
import type { Direction, Post } from "../types";
import { findDuplicate } from "../uniqueness";
import { BANNED_STYLE, usesLink } from "./content";
import { child, MAX_REVISIONS, type AgentDef, type Ctx, type HandlerResult } from "./core";
import type { Task } from "../types";

/**
 * Any agent that finds a problem calls this: the post goes back to the writer
 * with the reason, at most MAX_REVISIONS times, then it is rejected. This hard
 * cap (stored on the post, not in memory) is what stops writer<->reviewer loops.
 */
export async function requestRevision(task: Task, ctx: Ctx, post: Post, feedback: string): Promise<HandlerResult> {
  if (post.revisionCount >= MAX_REVISIONS) {
    await ctx.store.updatePost(post.id, { status: "REJECTED", error: feedback.slice(0, 500) });
    return { result: { postId: post.id, outcome: "rejected", reason: feedback } };
  }
  const n = post.revisionCount + 1;
  await ctx.store.updatePost(post.id, { revisionCount: n, error: feedback.slice(0, 500) });
  return {
    result: { postId: post.id, outcome: "revision-requested", reason: feedback, revision: n },
    next: [child(task, { kind: "content.write", agent: "writer", dedupeKey: `write:${post.id}:r${n}`, postId: post.id, payload: { postId: post.id, feedback } })],
  };
}

// ---------- Fact-Checking agent ----------
const STAT_RE = /(\d+(\.\d+)?\s?%|\b\d+\s+(out of|in every|in)\s+\d+\b|\b(study|studies|survey|surveyed|research (shows|says|found)|according to|statistics?|percent|report(s|ed)? (that|says))\b|[₹$]\s?\d)/i;
const ATTRIBUTED_QUOTE_RE = /["“][^"”]{20,}["”]\s*[-—–]\s*[A-Z]|\b(said|says|told)\b[^.]{0,40}["“][^"”]{15,}["”]/;

export function deterministicFactIssues(post: Post): string[] {
  const issues: string[] = [];
  const allowed = new Set((post.content.sources ?? []).map((s) => s.url));
  const body = post.content.body ?? "";
  for (const c of post.content.claims ?? []) {
    if (!c.source || !allowed.has(c.source)) issues.push(`Claim has no supporting source from the research: "${c.text.slice(0, 80)}"`);
  }
  if (STAT_RE.test(body) && !(post.content.claims ?? []).some((c) => c.source && allowed.has(c.source)))
    issues.push("Mentions a statistic, study or survey without a source from the research - remove it or rephrase without numbers");
  if (ATTRIBUTED_QUOTE_RE.test(body) && !allowed.size) issues.push("Contains an attributed quotation with no source - remove it");
  return issues;
}

const verdictSchema = z.object({ verdict: z.enum(["pass", "revise", "reject"]), issues: z.array(z.string().max(300)).max(6) });

export const factcheckerAgent: AgentDef = {
  id: "factchecker", name: "Fact-Checking agent",
  responsibility: "Stops unsupported claims: any statistic, study or quotation must trace to a researched source (checked by rules), and an AI reviewer checks the English advice is actually correct and consistent with the evidence. Failed posts go back to the writer or are rejected.",
  inputs: ["written post", "claims with sources", "research evidence"],
  outputs: ["pass, or a revision request / rejection with reasons"],
  tools: ["rules", "Gemini (free tier, capped)"],
  usesAi: true,
  failureConditions: ["unsupported statistic, study or quotation", "AI reviewer finds the advice incorrect or misleading", "AI reply not in the expected shape"],
  handlers: {
    "content.factcheck": async (task, ctx) => {
      const post = await ctx.store.getPost(String(task.payload.postId));
      if (!post || post.status !== "DRAFT") return { result: { skipped: "post not in draft" } };
      const rule = deterministicFactIssues(post);
      if (rule.length) return requestRevision(task, ctx, post, rule.join("; "));
      const prompt = `You are a strict fact-checker and English-language editor for a brand about ${ctx.config.niche}.
Check this post. You cannot browse; judge only (1) whether any English usage advice is actually correct, (2) whether it is consistent with the evidence given, (3) whether anything is misleading, a guarantee, or an unverifiable claim.
EVIDENCE: ${JSON.stringify(post.direction.evidence ?? [])}
POST: ${JSON.stringify(post.content.body)}
Return JSON {"verdict":"pass"|"revise"|"reject","issues":string[]}. Use "revise" for fixable problems (list them), "reject" only if the whole idea is wrong or harmful.`;
      const v = await ctx.ai.json(verdictSchema, prompt, "fact check");
      await ctx.store.updatePost(post.id, { qa: { ...(post.qa ?? {}), factcheck: v } });
      if (v.verdict === "pass") return { result: { postId: post.id, outcome: "pass" }, next: [child(task, { kind: "creative.brief", agent: "creative", dedupeKey: `brief:${post.id}:r${post.revisionCount}`, postId: post.id, payload: { postId: post.id } })] };
      if (v.verdict === "reject") { await ctx.store.updatePost(post.id, { status: "REJECTED", error: v.issues.join("; ").slice(0, 500) }); return { result: { postId: post.id, outcome: "rejected", issues: v.issues } }; }
      return requestRevision(task, ctx, post, v.issues.join("; ") || "Fact-check asked for a revision");
    },
  },
};

// ---------- Content QA agent ----------
const PLACEHOLDER_RE = /\[[A-Z _]{3,}\]|\{\{|lorem ipsum|TODO/i;
const HYPE_RE = /\b(guaranteed?|100% (success|sure)|get rich|viral hack|free followers|overnight success)\b/i;
const LABEL_RE = /\b(S\d|Speaker \d):/;
const EMOJI_RE = /\p{Extended_Pictographic}/gu;

export function qaProblems(post: Post, past: { id: string; hook: string; body: string; topic: string }[], siteUrl: string): string[] {
  const p: string[] = [];
  const c = post.content;
  if (!c.hook || !c.body) return ["Post has no text"];
  const link = usesLink(post.direction as Direction) ? trackedLink(siteUrl, post) : undefined;
  const text = composeText(post.platform, c, link);
  const limit = platformLimit(post.platform);
  if ([...text].length > limit) p.push(`Text is ${[...text].length} characters; ${post.platform} allows ${limit}`);
  if ((c.hashtags ?? []).length > MAX_HASHTAGS[post.platform]) p.push("Too many hashtags");
  if (!text.startsWith(c.hook.trim().slice(0, 30))) p.push("Body does not start with the hook");
  if (PLACEHOLDER_RE.test(text)) p.push("Contains placeholder text");
  if (HYPE_RE.test(text)) p.push("Contains a guarantee or hype claim");
  if (LABEL_RE.test(text)) p.push("Contains a speaker label");
  const lower = text.toLowerCase();
  const cliche = BANNED_STYLE.find((b) => lower.includes(b));
  if (cliche) p.push(`Uses a generic AI phrase ("${cliche}")`);
  if ((text.match(EMOJI_RE) ?? []).length > 3) p.push("More than 3 emojis");
  for (const u of text.match(/https?:\/\/\S+/g) ?? []) { try { new URL(u); } catch { p.push(`Broken link: ${u}`); } }
  for (const s of c.sources ?? []) { try { new URL(s.url); } catch { p.push(`Broken source link: ${s.url}`); } }
  if (post.format !== "text-post" && !c.mediaChecked) p.push("Media has not passed its check");
  if (post.format !== "text-post" && !c.alt) p.push("Image has no description for accessibility");
  const dup = findDuplicate({ hook: c.hook, body: c.body, topic: post.topic }, past.filter((x) => x.id !== post.id));
  if (dup) p.push(dup);
  return p;
}

export const qaAgent: AgentDef = {
  id: "qa", name: "Content QA agent",
  responsibility: "Last gate before anything can be published: length and hashtag limits per platform, placeholders, hype or guarantees, generic AI phrases, broken links, missing media or image description, and duplicate/near-duplicate detection against past posts. Failures go back to the writer; passes are scheduled, held for approval, or kept as drafts depending on the mode.",
  inputs: ["finished post", "post history", "mode and platform"],
  outputs: ["APPROVED-to-schedule, NEEDS_REVIEW, or revision request / rejection"],
  tools: ["rules only (no AI)"],
  usesAi: false,
  failureConditions: ["any mandatory check fails (post is never published)", "revision limit reached (post rejected)"],
  handlers: {
    "qa.review": async (task, ctx) => {
      const post = await ctx.store.getPost(String(task.payload.postId));
      if (!post || post.status !== "DRAFT") return { result: { skipped: "post not in draft" } };
      const { past } = await history(ctx.store, 200);
      const problems = qaProblems(post, past, ctx.config.siteUrl);
      await ctx.store.updatePost(post.id, { qa: { ...(post.qa ?? {}), qa: { problems, at: ctx.now().toISOString() } } });
      if (problems.length) return requestRevision(task, ctx, post, problems.join("; "));
      const auto = ctx.config.mode === "autopilot" && AUTO_PLATFORMS.includes(post.platform);
      if (auto) {
        await ctx.store.transitionPost(post.id, ["DRAFT"], "SCHEDULED", { decidedBy: "autopilot" });
        return { result: { postId: post.id, outcome: "scheduled" }, next: [publishTask(task, post)] };
      }
      await ctx.store.transitionPost(post.id, ["DRAFT"], "NEEDS_REVIEW");
      return { result: { postId: post.id, outcome: "needs-review" } };
    },
  },
};

export function publishTask(parent: Pick<Task, "id" | "depth"> | null, post: Pick<Post, "id" | "scheduledFor">, suffix = "") {
  return {
    kind: "publish.post", agent: "publisher", dedupeKey: `publish:${post.id}${suffix}`, postId: post.id, payload: { postId: post.id },
    runAfter: post.scheduledFor ?? new Date(), maxAttempts: 4, parentId: parent?.id ?? null, depth: (parent?.depth ?? 0) + 1,
  };
}
