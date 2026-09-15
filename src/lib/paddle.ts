import crypto from "node:crypto";
import type { Plan } from "@/lib/entitlements";

// Paddle price IDs are not secret (they're sent to the browser to open
// checkout anyway), so these are plain NEXT_PUBLIC_ vars read on both
// sides: the client uses them to open the right checkout, the webhook
// uses this same mapping to know which plan a completed purchase is for.
export function paddlePlanPriceIds(): Record<Plan, string | undefined> {
  return {
    FREE: undefined,
    STARTER: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER,
    PROFESSIONAL: process.env.NEXT_PUBLIC_PADDLE_PRICE_PROFESSIONAL,
    PREMIUM: process.env.NEXT_PUBLIC_PADDLE_PRICE_PREMIUM,
  };
}

export function planForPriceId(priceId: string): Plan | null {
  const ids = paddlePlanPriceIds();
  for (const plan of ["STARTER", "PROFESSIONAL", "PREMIUM"] as const) {
    if (ids[plan] && ids[plan] === priceId) return plan;
  }
  return null;
}

// Paddle Billing signs webhooks as `Paddle-Signature: ts=<unix seconds>;h1=<hex hmac>`,
// where h1 = HMAC-SHA256(`${ts}:${rawBody}`, webhookSecret). Must be checked
// against the raw request body text, before JSON.parse - Paddle's signature
// covers the exact bytes sent, not any re-serialized version of them.
export function verifyPaddleSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;

  const parts = new Map(
    signatureHeader.split(";").map((part) => {
      const [key, value] = part.split("=");
      return [key, value] as [string, string];
    })
  );
  const timestamp = parts.get("ts");
  const receivedHash = parts.get("h1");
  if (!timestamp || !receivedHash) return false;

  const expectedHash = crypto.createHmac("sha256", secret).update(`${timestamp}:${rawBody}`).digest("hex");

  const expectedBuf = Buffer.from(expectedHash, "hex");
  const receivedBuf = Buffer.from(receivedHash, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
