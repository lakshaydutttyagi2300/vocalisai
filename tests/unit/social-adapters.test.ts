import { describe, expect, it } from "vitest";
import { parseRss } from "@/lib/social/agents/research";
import { validateCard } from "@/lib/social/agents/content";
import { renderCard, THEMES } from "@/lib/social/card";
import { PermanentError, TransientError } from "@/lib/social/errors";
import { blueskyPublisher, linkedinPublisher, notifyOwner, telegramPublisher } from "@/lib/social/platforms";

const json = (o: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(o), { status: 200, ...init });

describe("platform adapters (fake network)", () => {
  it("Bluesky: logs in, uploads the image with alt text, and marks the link with correct byte offsets", async () => {
    const calls: { url: string; body?: string }[] = [];
    const f = (async (url: string, init?: RequestInit) => {
      calls.push({ url, body: typeof init?.body === "string" ? init.body : undefined });
      if (url.endsWith("createSession")) return json({ accessJwt: "j", did: "did:plc:abc", handle: "me.bsky.social" });
      if (url.endsWith("uploadBlob")) return json({ blob: { ref: "blob" } });
      return json({ uri: "at://did:plc:abc/app.bsky.feed.post/3k" });
    }) as unknown as typeof fetch;
    const pub = blueskyPublisher(f, { BLUESKY_HANDLE: "me", BLUESKY_APP_PASSWORD: "pw" } as never);
    const text = "नमस्ते ✓ see https://s.test/go/1 now";
    const r = await pub.publish({ text, imagePng: Buffer.from("png"), alt: "A card" });
    expect(r.url).toBe("https://bsky.app/profile/me.bsky.social/post/3k");
    const rec = JSON.parse(calls.at(-1)!.body!).record;
    expect(rec.embed.images[0].alt).toBe("A card");
    const { byteStart, byteEnd } = rec.facets[0].index;
    expect(Buffer.from(text).subarray(byteStart, byteEnd).toString()).toBe("https://s.test/go/1");
  });

  it("sorts failures: 429/5xx/network are temporary, 401/400 are permanent", async () => {
    const mk = (status: number | "net") => blueskyPublisher((async () => { if (status === "net") throw new Error("x"); return new Response("no", { status }); }) as never, { BLUESKY_HANDLE: "a", BLUESKY_APP_PASSWORD: "b" } as never);
    await expect(mk(503).publish({ text: "x" })).rejects.toBeInstanceOf(TransientError);
    await expect(mk(429).publish({ text: "x" })).rejects.toBeInstanceOf(TransientError);
    await expect(mk("net").publish({ text: "x" })).rejects.toBeInstanceOf(TransientError);
    await expect(mk(401).publish({ text: "x" })).rejects.toBeInstanceOf(PermanentError);
  });

  it("Bluesky metrics keep 'not reported' as null", async () => {
    const f = (async () => json({ posts: [{ uri: "u1", likeCount: 4, replyCount: 1, repostCount: 2, quoteCount: 1 }] })) as never;
    const m = await blueskyPublisher(f, {} as never).fetchMetrics!(["u1"]);
    expect(m.get("u1")).toEqual({ likes: 4, replies: 1, shares: 3, saves: null, views: null });
  });

  it("Telegram posts a photo with caption, links to the channel post, and reports no numbers it cannot see", async () => {
    const f = (async () => json({ ok: true, result: { message_id: 42 } })) as never;
    const pub = telegramPublisher(f, { TELEGRAM_BOT_TOKEN: "1:x", TELEGRAM_CHANNEL_ID: "@vocalisai" } as never);
    expect(await pub.publish({ text: "hi", imagePng: Buffer.from("p") })).toEqual({ id: "42", url: "https://t.me/vocalisai/42" });
    expect(pub.fetchMetrics).toBeUndefined();
  });

  it("LinkedIn and owner alerts are not configured without credentials, and alerts never throw", async () => {
    expect(linkedinPublisher(undefined, {} as never).configured()).toBe(false);
    expect(await notifyOwner("x", (async () => { throw new Error("down"); }) as never, { TELEGRAM_BOT_TOKEN: "t", TELEGRAM_OWNER_CHAT_ID: "1" } as never)).toBe(false);
    expect(await notifyOwner("x", fetch, {} as never)).toBe(false);
  });
});

describe("RSS parsing", () => {
  it("keeps only items that have a title, a real link and a valid date", () => {
    const xml = `<rss><channel>
      <item><title><![CDATA[Good &amp; useful]]></title><link>https://n.test/1</link><pubDate>Mon, 19 Oct 2026 10:00:00 GMT</pubDate><source url="x">News</source></item>
      <item><title>No date</title><link>https://n.test/2</link></item>
      <item><title>Bad link</title><link>javascript:x</link><pubDate>Mon, 19 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
    const items = parseRss(xml);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: "Good & useful", link: "https://n.test/1", source: "News", date: "2026-10-19T10:00:00.000Z" });
  });
});

describe("image cards (real renderer)", () => {
  it("renders a valid 1080x1080 PNG under the Bluesky size limit in every visual style", async () => {
    for (const style of Object.keys(THEMES)) {
      const png = await renderCard({ text: style === "split-screen-wrong-vs-right" ? "I am having 2 years experience || I have 2 years of experience" : "Say 'I have two years of experience'", style });
      expect(await validateCard(png)).toBeNull();
    }
  }, 60_000);
});
