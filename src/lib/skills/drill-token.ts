// A drill or diagnostic is charged as ONE practice session when it starts,
// not once per question. The start route hands back a signed token listing
// the questions it served; answers to those questions that carry a valid
// token skip the per-answer usage charge. Signed with NEXTAUTH_SECRET
// (server-only), so it can't be forged or reused by another user.

import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 3 * 60 * 60 * 1000; // plenty for a 10-question drill

interface Payload {
  u: string; // userId
  q: string[]; // question ids served
  e: number; // expiry (ms)
}

function secret(): string | null {
  return process.env.NEXTAUTH_SECRET || null;
}

function sign(body: string, key: string): string {
  return createHmac("sha256", key).update(body).digest("base64url");
}

/** Null when no signing secret is configured - callers then charge per answer, as before. */
export function issueDrillToken(userId: string, questionIds: string[], now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const body = Buffer.from(JSON.stringify({ u: userId, q: questionIds, e: now + TTL_MS } satisfies Payload)).toString("base64url");
  return `${body}.${sign(body, key)}`;
}

export function drillTokenCovers(token: unknown, userId: string, questionId: string, now = Date.now()): boolean {
  const key = secret();
  if (!key || typeof token !== "string" || token.length > 8000) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expected = Buffer.from(sign(body, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    return p.u === userId && p.e > now && Array.isArray(p.q) && p.q.includes(questionId);
  } catch {
    return false;
  }
}
