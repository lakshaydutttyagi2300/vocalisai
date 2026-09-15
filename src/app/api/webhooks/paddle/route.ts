import { NextResponse } from "next/server";
import { setPlan } from "@/lib/entitlements";
import { planForPriceId, verifyPaddleSignature } from "@/lib/paddle";

// Paddle is the merchant of record: it handles the actual charge and all
// international tax compliance, then tells us what happened here. This is
// the ONLY place a candidate's plan changes as a result of a real payment -
// everywhere else (admin manual assignment) writes through the exact same
// setPlan() function, so this webhook doesn't change that module's shape,
// only who calls it.
export async function POST(req: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  // Signature covers the exact raw bytes Paddle sent - must read as text
  // before any JSON parsing.
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature");
  if (!verifyPaddleSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event?.event_type as string | undefined;
  const data = event?.data;

  if (eventType === "subscription.created" || eventType === "subscription.updated") {
    const userId = data?.custom_data?.userId as string | undefined;
    const priceId = data?.items?.[0]?.price?.id as string | undefined;
    const status = data?.status as string | undefined;
    const periodEndsAt = data?.current_billing_period?.ends_at as string | undefined;

    // Only an active (or trialing, treated the same) subscription grants
    // access. past_due is left alone deliberately - Paddle retries the
    // charge on its own schedule; we don't preemptively revoke access on
    // the first failed attempt, only once Paddle actually cancels it.
    if (userId && priceId && (status === "active" || status === "trialing")) {
      const plan = planForPriceId(priceId);
      if (plan) {
        await setPlan(userId, plan, {
          periodEnd: periodEndsAt ? new Date(periodEndsAt) : undefined,
          paddleCustomerId: typeof data?.customer_id === "string" ? data.customer_id : undefined,
          paddleSubscriptionId: typeof data?.id === "string" ? data.id : undefined,
        });
      }
    }
  } else if (eventType === "subscription.canceled") {
    const userId = data?.custom_data?.userId as string | undefined;
    // Paddle only fires this once the cancellation is actually effective
    // (immediately, or at the end of the paid period, per how it was
    // canceled) - by the time we see it, access is really over.
    if (userId) {
      await setPlan(userId, "FREE");
    }
  }

  return NextResponse.json({ received: true });
}
