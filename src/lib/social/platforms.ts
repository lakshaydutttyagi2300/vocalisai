// One small adapter per free official API. Network access is injected (`f`)
// so tests never touch a real account. Failures are sorted into
// "try again later" (TransientError) and "retrying cannot help" (PermanentError).

import { PermanentError, TransientError } from "./errors";
import type { Platform, Post, PostContent } from "./types";

export const LIMITS: Record<Platform, number> = { bluesky: 300, telegram: 4096, linkedin: 3000, x: 280, instagram: 2200, youtube: 5000 };
export const MAX_HASHTAGS: Record<Platform, number> = { bluesky: 3, telegram: 5, linkedin: 5, x: 2, instagram: 8, youtube: 5 };
export const TELEGRAM_CAPTION_LIMIT = 1024;

type Fetch = typeof fetch;

export interface PublishInput { text: string; imagePng?: Buffer; alt?: string }
export interface PublishResult { id: string; url?: string }
export interface MetricValues { likes: number | null; replies: number | null; shares: number | null; saves: number | null; views: number | null }
export interface Reply { id: string; author: string; text: string; postUri?: string; at: string }

export interface Publisher {
  platform: Platform;
  configured(): boolean;
  publish(i: PublishInput): Promise<PublishResult>;
  fetchMetrics?(externalIds: string[]): Promise<Map<string, MetricValues>>;
  fetchReplies?(): Promise<Reply[]>;
}

/** Characters, not UTF-16 units: the platforms count what a person sees. */
const len = (t: string) => [...t].length;
export const platformLimit = (p: Platform) => (p === "telegram" ? TELEGRAM_CAPTION_LIMIT : LIMITS[p]);

/**
 * The text that is actually posted: hook/body, tracked link, then hashtags.
 * If it would be too long, hashtags are dropped (last first) before anything
 * else, so a tight post still fits; the body itself is never cut here (QA
 * rejects a body that is too long on its own).
 */
export function composeText(platform: Platform, content: Partial<PostContent>, trackedLink?: string): string {
  const body = (content.body ?? "").trim();
  let tags = (content.hashtags ?? []).slice(0, MAX_HASHTAGS[platform]).map((t) => (t.startsWith("#") ? t : `#${t}`));
  const build = () => {
    const tail = [trackedLink, tags.join(" ")].filter(Boolean).join("\n");
    return tail ? `${body}\n\n${tail}` : body;
  };
  while (tags.length && len(build()) > platformLimit(platform)) tags = tags.slice(0, -1);
  return build();
}

function classify(status: number, what: string): Error {
  const msg = `${what} failed (HTTP ${status})`;
  return status === 429 || status >= 500 ? new TransientError(msg) : new PermanentError(msg);
}
async function call(f: Fetch, what: string, url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try { res = await f(url, { ...init, signal: AbortSignal.timeout(20_000) }); }
  catch { throw new TransientError(`${what}: network error`); }
  if (!res.ok) throw classify(res.status, what);
  return res;
}

// ---------- Bluesky (AT Protocol; free, app password) ----------
export function blueskyPublisher(f: Fetch = fetch, env = process.env): Publisher {
  const host = "https://bsky.social";
  async function session() {
    const res = await call(f, "Bluesky login", `${host}/xrpc/com.atproto.server.createSession`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: env.BLUESKY_HANDLE, password: env.BLUESKY_APP_PASSWORD }),
    });
    return (await res.json()) as { accessJwt: string; did: string; handle: string };
  }
  const enc = new TextEncoder();
  function linkFacets(text: string) {
    const out: unknown[] = [];
    for (const m of text.matchAll(/https?:\/\/[^\s]+/g)) {
      const start = enc.encode(text.slice(0, m.index)).length;
      out.push({ index: { byteStart: start, byteEnd: start + enc.encode(m[0]).length }, features: [{ $type: "app.bsky.richtext.facet#link", uri: m[0] }] });
    }
    return out;
  }
  return {
    platform: "bluesky",
    configured: () => !!env.BLUESKY_HANDLE && !!env.BLUESKY_APP_PASSWORD,
    async publish({ text, imagePng, alt }) {
      const s = await session();
      const auth = { Authorization: `Bearer ${s.accessJwt}` };
      let embed: unknown;
      if (imagePng) {
        const up = await call(f, "Bluesky image upload", `${host}/xrpc/com.atproto.repo.uploadBlob`, {
          method: "POST", headers: { ...auth, "Content-Type": "image/png" }, body: new Uint8Array(imagePng),
        });
        const { blob } = (await up.json()) as { blob: unknown };
        embed = { $type: "app.bsky.embed.images", images: [{ image: blob, alt: alt ?? "" }] };
      }
      const res = await call(f, "Bluesky post", `${host}/xrpc/com.atproto.repo.createRecord`, {
        method: "POST", headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: s.did, collection: "app.bsky.feed.post",
          record: { $type: "app.bsky.feed.post", text, createdAt: new Date().toISOString(), langs: ["en"], facets: linkFacets(text), ...(embed ? { embed } : {}) },
        }),
      });
      const { uri } = (await res.json()) as { uri: string };
      return { id: uri, url: `https://bsky.app/profile/${s.handle}/post/${uri.split("/").pop()}` };
    },
    async fetchMetrics(ids) {
      const out = new Map<string, MetricValues>();
      for (let i = 0; i < ids.length; i += 25) {
        const chunk = ids.slice(i, i + 25);
        const q = chunk.map((u) => `uris=${encodeURIComponent(u)}`).join("&");
        const res = await call(f, "Bluesky metrics", `https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?${q}`, {});
        const { posts } = (await res.json()) as { posts: { uri: string; likeCount?: number; replyCount?: number; repostCount?: number; quoteCount?: number }[] };
        for (const p of posts) out.set(p.uri, { likes: p.likeCount ?? 0, replies: p.replyCount ?? 0, shares: (p.repostCount ?? 0) + (p.quoteCount ?? 0), saves: null, views: null });
      }
      return out;
    },
    async fetchReplies() {
      const s = await session();
      const res = await call(f, "Bluesky notifications", `${host}/xrpc/app.bsky.notification.listNotifications?limit=30`, { headers: { Authorization: `Bearer ${s.accessJwt}` } });
      const { notifications } = (await res.json()) as { notifications: { uri: string; reason: string; indexedAt: string; author: { handle: string }; record?: { text?: string; reply?: { parent?: { uri?: string } } } }[] };
      return notifications
        .filter((n) => (n.reason === "reply" || n.reason === "mention") && n.record?.text)
        .map((n) => ({ id: n.uri, author: n.author.handle, text: n.record!.text!, postUri: n.record?.reply?.parent?.uri, at: n.indexedAt }));
    },
  };
}

// ---------- Telegram channel (Bot API; free) ----------
export function telegramPublisher(f: Fetch = fetch, env = process.env): Publisher {
  const api = (m: string) => `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${m}`;
  return {
    platform: "telegram",
    configured: () => !!env.TELEGRAM_BOT_TOKEN && !!env.TELEGRAM_CHANNEL_ID,
    async publish({ text, imagePng }) {
      let res: Response;
      if (imagePng && text.length <= TELEGRAM_CAPTION_LIMIT) {
        const form = new FormData();
        form.set("chat_id", env.TELEGRAM_CHANNEL_ID!);
        form.set("caption", text);
        form.set("photo", new Blob([new Uint8Array(imagePng)], { type: "image/png" }), "card.png");
        res = await call(f, "Telegram photo", api("sendPhoto"), { method: "POST", body: form });
      } else {
        res = await call(f, "Telegram message", api("sendMessage"), {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: env.TELEGRAM_CHANNEL_ID, text, disable_web_page_preview: false }),
        });
      }
      const { result } = (await res.json()) as { result: { message_id: number } };
      const chan = env.TELEGRAM_CHANNEL_ID!.startsWith("@") ? env.TELEGRAM_CHANNEL_ID!.slice(1) : null;
      return { id: String(result.message_id), url: chan ? `https://t.me/${chan}/${result.message_id}` : undefined };
    },
    // The Bot API does not expose channel view or reaction counts, so no fetchMetrics:
    // Telegram posts are never scored on numbers we cannot see.
  };
}

/** Sends a plain alert to the owner (private chat). Never throws. */
export async function notifyOwner(text: string, f: Fetch = fetch, env = process.env): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_OWNER_CHAT_ID) return false;
  try {
    const res = await f(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TELEGRAM_OWNER_CHAT_ID, text: text.slice(0, 3500) }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch { return false; }
}

// ---------- LinkedIn (Posts API, text posts; free, token expires ~60 days) ----------
export function linkedinPublisher(f: Fetch = fetch, env = process.env): Publisher {
  return {
    platform: "linkedin",
    configured: () => !!env.LINKEDIN_ACCESS_TOKEN && !!env.LINKEDIN_AUTHOR_URN,
    async publish({ text }) {
      const res = await call(f, "LinkedIn post", "https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`, "Content-Type": "application/json",
          "LinkedIn-Version": env.LINKEDIN_API_VERSION ?? "202510", "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: env.LINKEDIN_AUTHOR_URN, commentary: text, visibility: "PUBLIC",
          distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
          lifecycleState: "PUBLISHED", isReshareDisabledByAuthor: false,
        }),
      });
      const id = res.headers.get("x-restli-id") ?? "unknown";
      return { id, url: id.startsWith("urn:") ? `https://www.linkedin.com/feed/update/${id}` : undefined };
    },
  };
}

export function publishersFor(f: Fetch = fetch, env = process.env): Partial<Record<Platform, Publisher>> {
  return { bluesky: blueskyPublisher(f, env), telegram: telegramPublisher(f, env), linkedin: linkedinPublisher(f, env) };
}

export const trackedLink = (siteUrl: string, post: Pick<Post, "id">) => `${siteUrl}/go/${post.id}`;
