import { z } from "zod";
import { AUTO_PLATFORMS } from "../config";
import { chooseDirection, type Weights } from "../directions";
import { alreadyCovered, freshResearch, history, redact } from "../memory";
import { LIMITS, MAX_HASHTAGS, TELEGRAM_CAPTION_LIMIT } from "../platforms";
import type { Direction, Platform, Post, PostContent } from "../types";
import { fingerprint } from "../uniqueness";
import { child, istInstant, istParts, type AgentDef, type Ctx } from "./core";

export const FORMAT_FOR: Record<Platform, string> = {
  bluesky: "image-post", telegram: "image-post", linkedin: "text-post", x: "text-post", instagram: "reel", youtube: "short",
};
export const isVideoFormat = (f: string) => f === "reel" || f === "short";
export const usesLink = (d: Partial<Direction>) => d.cta === "practice-free-at-vocalisai";

/** Characters left for the writer after the link and hashtags are added. */
export function bodyBudget(platform: Platform, includeLink: boolean): number {
  const limit = platform === "telegram" ? TELEGRAM_CAPTION_LIMIT : LIMITS[platform];
  return limit - (includeLink ? 48 : 0) - MAX_HASHTAGS[platform] * 14 - 4;
}

async function growthWeights(ctx: Ctx): Promise<Weights> {
  try { return JSON.parse((await ctx.store.getSetting("growth:weights")) ?? "{}"); } catch { return {}; }
}

// ---------- Content Strategist agent ----------
const conceptsSchema = z.object({
  concepts: z.array(z.object({
    topic: z.string().min(5).max(120), angle: z.string().min(10).max(300),
    noteId: z.string().nullable(),
  })),
});

export const strategistAgent: AgentDef = {
  id: "strategist", name: "Content Strategist agent",
  responsibility: "Turns research into a content calendar: fills empty posting slots, gives every post its own creative direction (hook, story shape, cast, visual style, CTA) by rotation, and picks a distinct topic for each.",
  inputs: ["fresh research and audience notes", "post history", "growth weights", "posting slots, platforms and posts/day settings"],
  outputs: ["IDEA posts with schedule time and direction", "content.write tasks"],
  tools: ["database", "Gemini (free tier, capped)"],
  usesAi: true,
  failureConditions: ["no research or audience notes available (waits for research)", "AI reply not in the expected shape"],
  handlers: {
    "strategy.plan": async (task, ctx) => {
      const now = ctx.now();
      const existing = await ctx.store.listPosts({ limit: 300, sinceDays: 14 });
      const taken = new Set(existing.filter((p) => !["REJECTED", "FAILED"].includes(p.status) && p.scheduledFor).map((p) => `${p.platform}|${p.scheduledFor!.toISOString()}`));
      const slots: { platform: Platform; at: Date }[] = [];
      const today = istParts(now).date;
      for (let d = 0; d < ctx.config.planDaysAhead; d++) {
        const date = new Date(Date.parse(today + "T00:00:00Z") + d * 864e5).toISOString().slice(0, 10);
        for (const hhmm of ctx.config.slotsIst.slice(0, ctx.config.postsPerDay)) {
          ctx.config.platforms.forEach((platform, i) => {
            const at = new Date(istInstant(date, hhmm).getTime() + i * 7 * 60_000); // stagger platforms
            if (at.getTime() > now.getTime() + 20 * 60_000 && !taken.has(`${platform}|${at.toISOString()}`)) slots.push({ platform, at });
          });
        }
      }
      const need = slots.slice(0, 8);
      if (!need.length) return { result: { planned: 0, reason: "calendar already full" } };

      const research = await freshResearch(ctx.store, now);
      const audience = (await ctx.store.listNotes("AUDIENCE", 8)).filter((n) => now.getTime() - n.createdAt.getTime() < 14 * 864e5);
      const hist = await history(ctx.store);
      const weights = await growthWeights(ctx);
      const recent: Partial<Direction>[] = hist.posts.map((p) => p.direction);
      const dirs = need.map(() => { const d = chooseDirection(recent, weights, ctx.rng); recent.unshift(d); return d; });

      const prompt = `You plan social posts for: ${ctx.config.niche}.
Give ONE distinct concept for each slot below. Each concept must fit the slot's pillar, differ from every other concept here, and avoid topics already covered: ${JSON.stringify(hist.topics.slice(0, 30))}.
Prefer ideas backed by a research note (set noteId to its id); audience notes show what people struggle with. Use evergreen ideas (noteId null) if nothing fits. Never invent facts.
RESEARCH NOTES: ${JSON.stringify(research.map((n) => ({ id: n.id, title: n.title, detail: n.body.slice(0, 220), verified: n.verified })))}
AUDIENCE NOTES: ${JSON.stringify(audience.map((n) => ({ insight: n.title, idea: n.body })))}
SLOTS: ${JSON.stringify(need.map((s, i) => ({ slot: i, platform: s.platform, pillar: dirs[i].pillar })))}
Return JSON {"concepts":[{"topic":string,"angle":string (a specific, surprising take - not a generic tip),"noteId":string|null}]} with exactly ${need.length} items in slot order.`;
      const out = await ctx.ai.json(conceptsSchema, prompt, "content concepts");

      const next = [];
      let planned = 0;
      for (let i = 0; i < need.length && i < out.concepts.length; i++) {
        const c = out.concepts[i];
        if (alreadyCovered(c.topic, hist.topics)) continue;
        hist.topics.unshift(c.topic);
        const note = research.find((n) => n.id === c.noteId);
        const post = await ctx.store.createPost({
          platform: need[i].platform, format: FORMAT_FOR[need[i].platform], topic: redact(c.topic),
          direction: { ...dirs[i], angle: c.angle, evidence: note ? [{ title: note.title, url: note.sourceUrl ?? undefined, date: note.createdAt.toISOString().slice(0, 10) }] : [] },
        });
        await ctx.store.updatePost(post.id, { scheduledFor: need[i].at });
        next.push(child(task, { kind: "content.write", agent: "writer", dedupeKey: `write:${post.id}:r0`, postId: post.id, payload: { postId: post.id } }));
        planned++;
      }
      return { result: { planned, slotsOpen: need.length }, next };
    },
  },
};

// ---------- Content Writer agent ----------
const videoSchema = z.object({
  scenes: z.array(z.object({ speaker: z.string(), line: z.string().max(220), visual: z.string().max(200), sfx: z.string().max(80).optional() })).min(3).max(12),
  music: z.string().max(120), durationSec: z.number().int().min(10).max(90),
});
const writeSchema = z.object({
  hook: z.string().min(5).max(160), body: z.string().min(20),
  hashtags: z.array(z.string().max(30)).max(6),
  cardText: z.string().max(110).optional(),
  claims: z.array(z.object({ text: z.string(), source: z.string().optional() })).max(8),
  video: videoSchema.optional(),
});

export const BANNED_STYLE = ["delve", "in today's fast-paced world", "game-changer", "game changer", "unlock your potential", "elevate your", "navigate the landscape", "tapestry", "supercharge", "revolutionize"];

export const writerAgent: AgentDef = {
  id: "writer", name: "Content Writer agent",
  responsibility: "Writes the post inside the creative direction it was given - platform-specific text, hook, hashtags, and for reels/shorts a multi-character dialogue script with scene visuals, sound effects and music. Rewrites when a reviewer asks.",
  inputs: ["post topic and direction", "evidence", "recent hooks to avoid", "reviewer feedback"],
  outputs: ["post content (hook, body, hashtags, claims with sources, optional video package)"],
  tools: ["Gemini (free tier, capped)"],
  usesAi: true,
  failureConditions: ["AI reply not in the expected shape", "daily AI cap reached", "post no longer exists or was rejected"],
  handlers: {
    "content.write": async (task, ctx) => {
      const post = await ctx.store.getPost(String(task.payload.postId));
      if (!post || !["IDEA", "DRAFT"].includes(post.status)) return { result: { skipped: "post not writable" } };
      const d = post.direction as Direction;
      const includeLink = usesLink(d);
      const budget = bodyBudget(post.platform, includeLink);
      const hist = await history(ctx.store, 25);
      const video = isVideoFormat(post.format);
      const prompt = `You are a human-sounding writer for a brand in this niche: ${ctx.config.niche}. Brand voice: warm, specific, practical, a little witty; never hype.
Write ONE ${post.format} for ${post.platform}.
TOPIC: ${post.topic}
ANGLE: ${d.angle}
EVIDENCE (the only facts/stats you may cite): ${JSON.stringify(d.evidence ?? [])}
CREATIVE DIRECTION (follow it exactly - it exists so no two posts feel alike):
- hook type: ${d.hookType}; story shape: ${d.narrative}; voice: ${d.voiceStyle}; pillar: ${d.pillar}
- cast: ${(d.characters ?? []).join(" + ")}; closing call to action: ${d.cta}${includeLink ? " (a tracked link is added after your text - do not write a URL)" : " (no link)"}
HARD RULES:
- body must begin with the hook and be at most ${budget} characters.
- Do not open like any of these earlier posts: ${JSON.stringify(hist.hooks.slice(0, 20))}
- Any statistic, study, survey or quotation must be listed in "claims" with a source URL taken from EVIDENCE; if there is none, state no numbers or studies at all.
- English advice must be genuinely correct. No hype words (${BANNED_STYLE.slice(0, 5).join(", ")}). No promises of jobs or guaranteed results. Max 2 emojis.
- hashtags: at most ${MAX_HASHTAGS[post.platform]}, specific, no spam tags.
- cardText: a punchy headline (<= 90 chars) for the image card${d.visualStyle === "split-screen-wrong-vs-right" ? ', written as "wrong phrase || better phrase"' : ""}.
${video ? `- video: write a ${d.characters && d.characters.length > 1 ? "natural conversation between the cast members (use their first names as speaker)" : "single-presenter script"}, 5-9 scenes, 25-45 seconds when spoken, each scene with a visual and optional sound effect, plus a music description (royalty-free style).` : "- omit video."}
${task.payload.feedback ? `REVISION REQUESTED. Fix exactly this: ${String(task.payload.feedback)}\nPrevious attempt: ${JSON.stringify({ hook: post.hookText, body: post.content.body })}` : ""}
Return JSON: {"hook":string,"body":string,"hashtags":string[],"cardText":string,"claims":[{"text":string,"source":string?}]${video ? ',"video":{"scenes":[{"speaker":string,"line":string,"visual":string,"sfx":string?}],"music":string,"durationSec":number}' : ""}}`;
      const w = await ctx.ai.json(writeSchema, prompt, "post copy");
      const body = w.body.trim().startsWith(w.hook.trim()) ? w.body.trim() : `${w.hook.trim()}\n\n${w.body.trim()}`;
      const content: Partial<PostContent> = {
        hook: w.hook.trim(), body, hashtags: w.hashtags, cardText: w.cardText, claims: w.claims,
        sources: (d.evidence ?? []).filter((e) => e.url).map((e) => ({ title: e.title, url: e.url! })),
        ...(video && w.video ? { video: { ...w.video, renderStatus: "spec-only" as const } } : {}),
      };
      await ctx.store.updatePost(post.id, { status: "DRAFT", content, hookText: content.hook!, fingerprint: fingerprint(content.hook!, body), direction: { ...d, feedback: undefined } });
      return { result: { postId: post.id, chars: body.length, revision: post.revisionCount }, next: [child(task, { kind: "content.factcheck", agent: "factchecker", dedupeKey: `fact:${post.id}:r${post.revisionCount}`, postId: post.id, payload: { postId: post.id } })] };
    },
  },
};

// ---------- Creative Director agent ----------
const briefSchema = z.object({ cardText: z.string().min(2).max(110), alt: z.string().min(5).max(250), visualNotes: z.string().max(400) });

export const creativeAgent: AgentDef = {
  id: "creative", name: "Creative Director agent",
  responsibility: "Owns the look: confirms the visual style from the post's direction, writes the final card headline and accessibility description, and gives the media step a short creative brief (for videos, how scenes should look and cut).",
  inputs: ["written post", "direction (visual style)"],
  outputs: ["card headline, alt text, visual notes"],
  tools: ["Gemini (free tier, capped)"],
  usesAi: true,
  failureConditions: ["AI reply not in the expected shape"],
  handlers: {
    "creative.brief": async (task, ctx) => {
      const post = await ctx.store.getPost(String(task.payload.postId));
      if (!post || post.status !== "DRAFT") return { result: { skipped: "post not in draft" } };
      const d = post.direction as Direction;
      let brief = { cardText: post.content.cardText ?? post.content.hook ?? post.topic, alt: "", visualNotes: "" };
      if (post.format !== "text-post") {
        const prompt = `You are the art director for a brand about ${ctx.config.niche}.
Visual style (fixed): ${d.visualStyle}. Post hook: "${post.content.hook}". Draft card text: "${post.content.cardText ?? ""}".
Return JSON {"cardText":string (<= 90 chars; for split-screen-wrong-vs-right use "wrong || right"),"alt":string (plain description of the image for blind users),"visualNotes":string (2-3 sentences: colours, composition${isVideoFormat(post.format) ? ", scene pacing and cuts" : ""})}.`;
        brief = await ctx.ai.json(briefSchema, prompt, "creative brief");
      }
      await ctx.store.updatePost(post.id, { content: { ...post.content, cardText: brief.cardText, alt: brief.alt, visualNotes: brief.visualNotes } });
      return { result: { postId: post.id, style: d.visualStyle }, next: [child(task, { kind: "media.produce", agent: "media", dedupeKey: `media:${post.id}:r${post.revisionCount}`, postId: post.id, payload: { postId: post.id } })] };
    },
  },
};

// ---------- Media Production agent ----------
const PNG_MAGIC = "89504e47";
export async function validateCard(png: Buffer): Promise<string | null> {
  if (png.subarray(0, 4).toString("hex") !== PNG_MAGIC) return "Card is not a valid PNG";
  if (png.length > 900_000) return "Card is too large for Bluesky (over 900 KB)";
  const { default: sharp } = await import("sharp");
  const meta = await sharp(png).metadata();
  if (meta.width !== 1080 || meta.height !== 1080) return `Card is ${meta.width}x${meta.height}, expected 1080x1080`;
  return null;
}

export function validateVideoPackage(v: NonNullable<PostContent["video"]>, cast: string[]): string | null {
  const firstNames = cast.map((c) => c.split(" ")[0].toLowerCase());
  for (const s of v.scenes) {
    const who = s.speaker.split(" ")[0].toLowerCase();
    if (firstNames.length && !firstNames.includes(who)) return `Scene speaker "${s.speaker}" is not in the cast`;
    if (!s.line.trim() || /\bS\d:/.test(s.line)) return "A scene line is empty or has a speaker label in it";
  }
  const spokenWords = v.scenes.reduce((n, s) => n + s.line.split(/\s+/).length, 0);
  const secs = spokenWords / 2.5;
  if (secs < 12 || secs > 75) return `Spoken length is about ${Math.round(secs)}s; reels should be 15-60s`;
  return null;
}

export const mediaAgent: AgentDef = {
  id: "media", name: "Media Production agent",
  responsibility: "Produces the image card with the free renderer and checks it (real PNG, 1080x1080, small enough for the platform). For reels/shorts it validates the dialogue package (cast, length, no labels) and marks it 'spec-only' because video rendering is not automated yet.",
  inputs: ["card text and visual style", "video scene package"],
  outputs: ["validated card (re-rendered at publish time), media check result"],
  tools: ["next/og image renderer (bundled with Next.js)", "sharp (already installed)"],
  usesAi: false,
  failureConditions: ["card cannot be rendered or fails the size/format check", "video package fails validation (sent back to the writer)"],
  handlers: {
    "media.produce": async (task, ctx) => {
      const post = await ctx.store.getPost(String(task.payload.postId));
      if (!post || post.status !== "DRAFT") return { result: { skipped: "post not in draft" } };
      const d = post.direction as Direction;
      let problem: string | null = null;
      if (post.format !== "text-post") {
        const png = await ctx.renderCard({ text: post.content.cardText ?? post.hookText, style: d.visualStyle });
        problem = await validateCard(png);
      }
      if (!problem && post.content.video) problem = validateVideoPackage(post.content.video, d.characters ?? []);
      if (problem) {
        // Re-render problems are ours (permanent for this attempt); video problems go back to the writer.
        if (post.content.video) {
          const { requestRevision } = await import("./review");
          return requestRevision(task, ctx, post, `Media check failed: ${problem}`);
        }
        throw new Error(problem);
      }
      await ctx.store.updatePost(post.id, { content: { ...post.content, mediaChecked: true } });
      return { result: { postId: post.id, mediaChecked: true }, next: [child(task, { kind: "qa.review", agent: "qa", dedupeKey: `qa:${post.id}:r${post.revisionCount}`, postId: post.id, payload: { postId: post.id } })] };
    },
  },
};

export { AUTO_PLATFORMS };
export type { Post };
