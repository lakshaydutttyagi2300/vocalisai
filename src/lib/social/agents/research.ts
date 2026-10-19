import { z } from "zod";
import { alreadyCovered, freshResearch, history, redact } from "../memory";
import { child, todayKey, type AgentDef, type Ctx } from "./core";

// ---------- Trend Research agent ----------
const QUERIES = [
  "job interview tips India", "English speaking skills for jobs", "hiring trends India freshers",
  "workplace communication skills", "AI in job interviews", "IELTS speaking preparation",
];

export interface FeedItem { title: string; link: string; source: string; date: string }

export function parseRss(xml: string, max = 8): FeedItem[] {
  const items: FeedItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const pick = (tag: string) => (m[1].match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`))?.[1] ?? "").trim();
    const title = pick("title").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
    const link = pick("link"), date = pick("pubDate");
    if (title && /^https?:\/\//.test(link) && date && !Number.isNaN(Date.parse(date)))
      items.push({ title, link, source: pick("source") || "news", date: new Date(date).toISOString() });
    if (items.length >= max) break;
  }
  return items;
}

const opportunitySchema = z.object({
  opportunities: z.array(z.object({
    title: z.string().min(5).max(140), angle: z.string().max(300), whyNow: z.string().max(300),
    sourceIndex: z.number().int().nullable(), // index into the supplied items; null = general knowledge (unverified)
  })).max(8),
});

export const trendAgent: AgentDef = {
  id: "trend", name: "Trend Research agent",
  responsibility: "Finds what people in our niche are reading and asking this week from public news feeds, and turns it into content opportunities with the source and date attached.",
  inputs: ["niche setting", "public Google News RSS feeds", "recent topics (to skip)"],
  outputs: ["RESEARCH notes: opportunity, angle, source link, date, verified flag"],
  tools: ["HTTP GET to public RSS feeds", "Gemini (free tier, capped)"],
  usesAi: true,
  failureConditions: ["all feeds unreachable (retried later)", "AI reply not in the expected shape", "daily AI cap reached (waits until tomorrow)"],
  handlers: {
    "research.trends": async (task, ctx) => {
      const items: FeedItem[] = [];
      const seen = new Set<string>();
      for (const q of QUERIES.slice(0, 4)) {
        try {
          const res = await ctx.fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:7d")}&hl=en-IN&gl=IN&ceid=IN:en`, { signal: AbortSignal.timeout(10_000) });
          if (!res.ok) continue;
          for (const it of parseRss(await res.text(), 6)) if (!seen.has(it.link)) { seen.add(it.link); items.push(it); }
        } catch { /* one feed down is fine; we only fail if all are */ }
      }
      const { topics } = await history(ctx.store);
      const prompt = `You are the trend researcher for a brand in this niche: ${ctx.config.niche}.
Below are real headlines from the last 7 days (numbered). Pick up to 6 content opportunities useful to job seekers and learners.
Rules: base each opportunity on ONE numbered item (sourceIndex) when it genuinely applies; if you propose an evergreen idea not backed by an item, set sourceIndex to null. Never invent statistics, quotes or events. Skip topics already covered: ${JSON.stringify(topics.slice(0, 25))}.
Return JSON: {"opportunities":[{"title":string,"angle":string (a specific, non-generic take),"whyNow":string,"sourceIndex":number|null}]}
ITEMS:\n${items.map((it, i) => `${i}. ${it.title} (${it.source}, ${it.date.slice(0, 10)})`).join("\n") || "(no headlines could be fetched today - use evergreen ideas only, sourceIndex null)"}`;
      const out = await ctx.ai.json(opportunitySchema, prompt, "trend opportunities");
      let stored = 0;
      for (const o of out.opportunities) {
        const src = o.sourceIndex !== null ? items[o.sourceIndex] : undefined;
        const note = await ctx.store.addNote({
          kind: "RESEARCH", title: redact(o.title), body: JSON.stringify({ angle: o.angle, whyNow: o.whyNow, sourceTitle: src?.title, sourceDate: src?.date }),
          sourceUrl: src?.link ?? null, verified: !!src, dedupeKey: `trend:${(src?.link ?? o.title).slice(0, 180)}`,
          expiresAt: new Date(ctx.now().getTime() + 14 * 864e5),
        });
        if (note) stored++;
      }
      return {
        result: { headlinesFetched: items.length, opportunitiesStored: stored, verified: out.opportunities.filter((o) => o.sourceIndex !== null && items[o.sourceIndex]).length },
        next: [child(task, { kind: "audience.analyze", agent: "audience", dedupeKey: `audience:${todayKey(ctx.now())}` })],
      };
    },
  },
};

// ---------- Audience Intelligence agent ----------
const audienceSchema = z.object({
  insights: z.array(z.object({ insight: z.string().max(300), contentIdea: z.string().max(240) })).max(6),
});

export const audienceAgent: AgentDef = {
  id: "audience", name: "Audience Intelligence agent",
  responsibility: "Learns what our audience struggles with from aggregated product usage (counts and averages only) and from recent comments, and writes down recurring problems and unmet needs.",
  inputs: ["anonymous practice counts and average scores per skill area", "sign-up counts", "recent comment notes"],
  outputs: ["AUDIENCE notes: insight + content idea"],
  tools: ["read-only aggregate database queries", "Gemini (free tier, capped)"],
  usesAi: true,
  failureConditions: ["database unreachable", "AI reply not in the expected shape"],
  handlers: {
    "audience.analyze": async (task, ctx) => {
      const sig = await ctx.signals();
      const comments = (await ctx.store.listNotes("COMMENT", 10)).map((n) => n.title).filter(Boolean);
      let stored = 0;
      if (sig.areas.length || comments.length) {
        const prompt = `You analyse an audience for: ${ctx.config.niche}.
Anonymous usage over 30 days (area, attempts, average score 0-100): ${JSON.stringify(sig.areas)}.
Sign-ups: ${sig.signupsLast7d} in the last 7 days vs ${sig.signupsPrev7d} the 7 days before.
Recent public comment topics: ${JSON.stringify(comments)}.
Only draw conclusions the numbers support; say "not enough data" rather than guess. Return JSON {"insights":[{"insight":string,"contentIdea":string}]} (max 4).`;
        const out = await ctx.ai.json(audienceSchema, prompt, "audience insights");
        for (const i of out.insights) {
          const n = await ctx.store.addNote({ kind: "AUDIENCE", title: redact(i.insight), body: redact(i.contentIdea), verified: true, dedupeKey: `aud:${todayKey(ctx.now())}:${i.insight.slice(0, 80)}` });
          if (n) stored++;
        }
      }
      return {
        result: { areasSeen: sig.areas.length, insightsStored: stored, signupsLast7d: sig.signupsLast7d },
        next: [child(task, { kind: "strategy.plan", agent: "strategist", dedupeKey: `plan:${todayKey(ctx.now())}` })],
      };
    },
  },
};

export { alreadyCovered, freshResearch };
export type { Ctx };
