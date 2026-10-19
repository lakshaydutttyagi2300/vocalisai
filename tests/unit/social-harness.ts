// Test kit for the Social Autopilot: in-memory store, scripted "AI", fake
// platform, fake clock. No database or network is used, so these tests are
// fast and cannot touch real accounts.
import sharp from "sharp";
import type { Ctx } from "@/lib/social/agents/core";
import type { AiClient } from "@/lib/social/ai";
import { configSchema, saveConfig, type SocialConfig } from "@/lib/social/config";
import type { MetricValues, Publisher } from "@/lib/social/platforms";
import { MemoryStore } from "@/lib/social/store";
import type { Platform } from "@/lib/social/types";

export const START = new Date("2026-10-20T00:00:00Z"); // 05:30 in India

const TOPICS = [
  "Why 'I am having 2 years experience' costs you offers", "The one-sentence answer to 'Tell me about yourself'", "Stop apologising at the start of every email",
  "How to disagree with your manager politely", "Pronouncing 'schedule' and 'comfortable' without fear", "Salary talk: phrases that keep you in control",
  "Filler words you can swap for a silent pause", "Explaining a gap in your CV honestly", "Phone interviews: sounding warm without video",
  "Present perfect vs past simple in interviews", "Handling 'Do you have any questions for us?'", "Meeting English: interrupting without being rude",
];
const SENTENCES = [
  "Hiring managers notice small slips faster than you think.", "Say it aloud three times tonight and record yourself.", "Most learners memorise rules but never practise the sound.",
  "Pause for a breath before you answer; silence reads as confidence.", "Swap the long phrase for a short, active verb.", "Try the rewrite on your next call and see how it lands.",
  "Your accent is not the problem; unclear structure is.", "Start with the result, then give the context.", "A calm opening line sets the tone for the whole answer.",
  "Keep one example ready for each strength you claim.", "Short sentences travel further than clever ones.", "Ask one honest question and listen to the answer.",
];

export interface FakeAiOptions { verdict?: () => "pass" | "revise" | "reject"; failLabel?: string }
export function fakeAi(opts: FakeAiOptions = {}) {
  const calls: Record<string, number> = {};
  let k = 0;
  const ai: AiClient = {
    async json(_schema, prompt, label) {
      calls[label] = (calls[label] ?? 0) + 1;
      if (opts.failLabel === label) throw new Error("scripted failure");
      switch (label) {
        case "trend opportunities":
          return { opportunities: [{ title: "Hiring slows for freshers in Q4", angle: "What to practise while offers are slow", whyNow: "News this week", sourceIndex: 0 }, { title: "Evergreen: structuring answers", angle: "Result first", whyNow: "Always useful", sourceIndex: null }] } as never;
        case "audience insights": return { insights: [{ insight: "Pronunciation scores are the lowest area", contentIdea: "Sound-focused micro lessons" }] } as never;
        case "content concepts": {
          const n = Number(/exactly (\d+) items/.exec(prompt)![1]);
          return { concepts: Array.from({ length: n }, () => ({ topic: TOPICS[k++ % TOPICS.length], angle: "A specific angle for this slot", noteId: null })) } as never;
        }
        case "post copy": {
          const i = k++;
          const hook = `${["Nobody tells you", "Quick fix", "Try this tonight", "Watch the difference", "Be honest", "Small habit"][i % 6]} number ${i}: ${TOPICS[i % TOPICS.length].slice(0, 28)}`;
          const cast = /cast: (.*?);/.exec(prompt)?.[1].split(" + ").map((c) => c.split(" ")[0]) ?? ["Vocalis"];
          const video = /- video:/.test(prompt);
          return {
            hook, body: `${hook}\n\n${SENTENCES[i % SENTENCES.length]} ${SENTENCES[(i * 5 + 3) % SENTENCES.length]}`.slice(0, 230),
            hashtags: ["EnglishSpeaking", "InterviewTips"], cardText: video ? "Say this instead" : "Say this || not that", claims: [],
            ...(video ? { video: { scenes: cast.flatMap((who, j) => [
              { speaker: who, line: `Okay, so here is the thing about ${TOPICS[i % TOPICS.length].slice(0, 20)} and how people usually get it wrong in interviews.`, visual: "close-up", sfx: j ? "whoosh" : undefined },
              { speaker: who, line: "Let me show you a calmer way to say it, and then you try it out loud with me right now.", visual: "text overlay" },
              { speaker: who, line: "That is all it takes: one clear sentence and a steady breath before you speak.", visual: "wide shot" }]), music: "soft lo-fi, royalty-free", durationSec: 30 } } : {}),
          } as never;
        }
        case "fact check": { const v = opts.verdict?.() ?? "pass"; return { verdict: v, issues: v === "pass" ? [] : ["The advice is not accurate"] } as never; }
        case "creative brief": return { cardText: "Say this || not that", alt: "A card comparing a wrong and a right phrase", visualNotes: "High contrast, big type." } as never;
        case "comment triage": return { category: /refund|angry/i.test(prompt) ? "complaint" : "question", confidence: 0.95, draftReply: "Thanks for asking - happy to help!" } as never;
        default: throw new Error(`unscripted AI label ${label}`);
      }
    },
  };
  return { ai, calls };
}

export function fakePlatform(platform: Platform, over: Partial<Publisher> & { failWith?: () => Error | null } = {}) {
  const published: { text: string; hasImage: boolean }[] = [];
  const metrics = new Map<string, MetricValues>();
  const pub: Publisher = {
    platform, configured: () => true,
    async publish(i) {
      const err = over.failWith?.();
      if (err) throw err;
      published.push({ text: i.text, hasImage: !!i.imagePng });
      return { id: `at://${platform}/${published.length}`, url: `https://example.test/${platform}/${published.length}` };
    },
    async fetchMetrics(ids) { return new Map(ids.map((id) => [id, metrics.get(id) ?? { likes: 5, replies: 1, shares: 1, saves: null, views: null }])); },
    async fetchReplies() { return [{ id: "at://reply/1", author: "x", text: "How do I practise this?", at: START.toISOString() }, { id: "at://reply/2", author: "y", text: "I am angry about a refund", at: START.toISOString() }]; },
    ...over,
  };
  return { pub, published, metrics };
}

export async function makeCtx(cfg: Partial<SocialConfig> = {}, opts: FakeAiOptions & { platforms?: Partial<Record<Platform, Publisher>> } = {}) {
  const store = new MemoryStore();
  const clock = { t: new Date(START) };
  const config = await saveConfig(store, { platforms: ["bluesky"], postsPerDay: 2, planDaysAhead: 1, ...cfg });
  const { ai, calls } = fakeAi(opts);
  const bsky = fakePlatform("bluesky");
  const notifications: string[] = [];
  let seed = 7;
  const png = await sharp({ create: { width: 1080, height: 1080, channels: 3, background: "#123456" } }).png().toBuffer();
  const ctx: Ctx = {
    store, config, ai, now: () => new Date(clock.t), fetch: (async () => new Response(`<rss><channel><item><title>Hiring slows for freshers</title><link>https://news.example/a</link><pubDate>Mon, 19 Oct 2026 10:00:00 GMT</pubDate><source>Example News</source></item></channel></rss>`)) as typeof fetch,
    publishers: opts.platforms ?? { bluesky: bsky.pub }, renderCard: async () => png,
    signals: async () => ({ areas: [{ area: "PRONUNCIATION", attempts: 40, avgScore: 52 }], signupsLast7d: 3, signupsPrev7d: 2 }),
    rng: () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }, notify: async (t) => { notifications.push(t); return true; },
  };
  return { ctx, store, clock, calls, bsky, notifications, advance: (ms: number) => { clock.t = new Date(clock.t.getTime() + ms); } };
}
export { configSchema };
