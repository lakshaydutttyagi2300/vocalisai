// Real end-to-end test of the Paddle webhook: since we don't have a live
// Paddle account yet, this crafts requests using the EXACT signing scheme
// Paddle Billing uses (Paddle-Signature: ts=<unix>;h1=<hmac-sha256 hex of
// `${ts}:${rawBody}`>), signed with the same PADDLE_WEBHOOK_SECRET the
// server has loaded from .env. This proves signature verification,
// price-id -> plan mapping, and setPlan wiring all work correctly - the
// only thing this can't prove is that Paddle's real dashboard sends
// exactly this shape, which gets confirmed once real sandbox credentials
// are available.

import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const BASE = "http://localhost:3000";
const WEBHOOK_SECRET = "test_webhook_secret_for_local_verification_only";
const STARTER_PRICE_ID = "pri_test_starter";
const PROFESSIONAL_PRICE_ID = "pri_test_professional";

const db = new PrismaClient();

function signedHeaders(rawBody) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const h1 = crypto.createHmac("sha256", WEBHOOK_SECRET).update(`${ts}:${rawBody}`).digest("hex");
  return { "Paddle-Signature": `ts=${ts};h1=${h1}`, "Content-Type": "application/json" };
}

async function main() {
  const email = `paddle-webhook-test-${Date.now()}@example.com`;
  const signupRes = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Paddle Webhook Test", email, password: "TestPass123" }),
  });
  const { id: userId } = await signupRes.json();
  console.log(`Created test user ${userId}`);

  console.log("\n--- A request with a bad signature is rejected ---");
  const badBody = JSON.stringify({ event_type: "subscription.created", data: {} });
  const badRes = await fetch(`${BASE}/api/webhooks/paddle`, {
    method: "POST",
    headers: { "Paddle-Signature": "ts=123;h1=deadbeef", "Content-Type": "application/json" },
    body: badBody,
  });
  console.log(`Status: ${badRes.status} (expect 401)`);
  if (badRes.status !== 401) {
    console.error("TEST FAILED: bad signature should be rejected");
    process.exit(1);
  }

  console.log("\n--- A tampered body (valid signature for different bytes) is rejected ---");
  const originalBody = JSON.stringify({ event_type: "subscription.created", data: { custom_data: { userId } } });
  const headersForOriginal = signedHeaders(originalBody);
  const tamperedBody = JSON.stringify({ event_type: "subscription.created", data: { custom_data: { userId: "someone-else" } } });
  const tamperedRes = await fetch(`${BASE}/api/webhooks/paddle`, {
    method: "POST",
    headers: headersForOriginal,
    body: tamperedBody,
  });
  console.log(`Status: ${tamperedRes.status} (expect 401)`);
  if (tamperedRes.status !== 401) {
    console.error("TEST FAILED: a tampered body should fail signature verification");
    process.exit(1);
  }

  console.log("\n--- A correctly-signed subscription.created activates STARTER ---");
  const createdBody = JSON.stringify({
    event_type: "subscription.created",
    data: {
      id: "sub_test_001",
      customer_id: "ctm_test_001",
      status: "active",
      custom_data: { userId },
      items: [{ price: { id: STARTER_PRICE_ID } }],
      current_billing_period: { ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
    },
  });
  const createdRes = await fetch(`${BASE}/api/webhooks/paddle`, {
    method: "POST",
    headers: signedHeaders(createdBody),
    body: createdBody,
  });
  console.log(`Status: ${createdRes.status} (expect 200)`);
  if (!createdRes.ok) {
    console.error("TEST FAILED: valid signed webhook should be accepted");
    process.exit(1);
  }

  const subAfterCreate = await db.subscription.findUnique({ where: { userId } });
  console.log(`Plan after subscription.created: ${subAfterCreate?.plan} (expect STARTER)`);
  console.log(`paddleSubscriptionId: ${subAfterCreate?.paddleSubscriptionId} (expect sub_test_001)`);
  console.log(`paddleCustomerId: ${subAfterCreate?.paddleCustomerId} (expect ctm_test_001)`);
  if (subAfterCreate?.plan !== "STARTER" || subAfterCreate?.paddleSubscriptionId !== "sub_test_001") {
    console.error("TEST FAILED: subscription.created should set plan STARTER and store Paddle ids");
    process.exit(1);
  }

  console.log("\n--- An upgrade webhook (subscription.updated) moves them to PROFESSIONAL ---");
  const updatedBody = JSON.stringify({
    event_type: "subscription.updated",
    data: {
      id: "sub_test_001",
      customer_id: "ctm_test_001",
      status: "active",
      custom_data: { userId },
      items: [{ price: { id: PROFESSIONAL_PRICE_ID } }],
      current_billing_period: { ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
    },
  });
  const updatedRes = await fetch(`${BASE}/api/webhooks/paddle`, {
    method: "POST",
    headers: signedHeaders(updatedBody),
    body: updatedBody,
  });
  console.log(`Status: ${updatedRes.status} (expect 200)`);

  const subAfterUpdate = await db.subscription.findUnique({ where: { userId } });
  console.log(`Plan after subscription.updated: ${subAfterUpdate?.plan} (expect PROFESSIONAL)`);
  if (subAfterUpdate?.plan !== "PROFESSIONAL") {
    console.error("TEST FAILED: subscription.updated should move the plan to PROFESSIONAL");
    process.exit(1);
  }

  console.log("\n--- A past_due status does NOT revoke access ---");
  const pastDueBody = JSON.stringify({
    event_type: "subscription.updated",
    data: {
      id: "sub_test_001",
      status: "past_due",
      custom_data: { userId },
      items: [{ price: { id: PROFESSIONAL_PRICE_ID } }],
    },
  });
  await fetch(`${BASE}/api/webhooks/paddle`, { method: "POST", headers: signedHeaders(pastDueBody), body: pastDueBody });
  const subAfterPastDue = await db.subscription.findUnique({ where: { userId } });
  console.log(`Plan after past_due: ${subAfterPastDue?.plan} (expect still PROFESSIONAL - no premature downgrade)`);
  if (subAfterPastDue?.plan !== "PROFESSIONAL") {
    console.error("TEST FAILED: past_due should not immediately revoke access");
    process.exit(1);
  }

  console.log("\n--- subscription.canceled reverts them to FREE ---");
  const canceledBody = JSON.stringify({
    event_type: "subscription.canceled",
    data: { id: "sub_test_001", custom_data: { userId } },
  });
  const canceledRes = await fetch(`${BASE}/api/webhooks/paddle`, {
    method: "POST",
    headers: signedHeaders(canceledBody),
    body: canceledBody,
  });
  console.log(`Status: ${canceledRes.status} (expect 200)`);
  const subAfterCancel = await db.subscription.findUnique({ where: { userId } });
  console.log(`Plan after subscription.canceled: ${subAfterCancel?.plan} (expect FREE)`);
  if (subAfterCancel?.plan !== "FREE") {
    console.error("TEST FAILED: subscription.canceled should revert the plan to FREE");
    process.exit(1);
  }

  console.log("\nAll Paddle webhook checks passed.");
}

main()
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
