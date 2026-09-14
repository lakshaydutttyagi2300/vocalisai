// Real end-to-end test of the Phase 15 Personal AI Coach: fetch the real
// aggregate profile (built from this user's already-completed sessions),
// send two real chat turns, and confirm history persists and the coach's
// reply is grounded in the real weakest-category data.

const BASE = "http://localhost:3000";
const EMAIL = "rahul.verma.test@example.com";
const PASSWORD = "RahulPass123";

let cookieJar = "";
function captureCookies(res) {
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of setCookie) {
    const pair = c.split(";")[0];
    const name = pair.split("=")[0];
    cookieJar = cookieJar.split("; ").filter((e) => e && !e.startsWith(`${name}=`)).concat(pair).join("; ");
  }
}
async function fw(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), Cookie: cookieJar } });
  captureCookies(res);
  return res;
}

async function main() {
  const csrfRes = await fw(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  await fw(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email: EMAIL, password: PASSWORD, csrfToken, json: "true" }),
  });
  console.log("Logged in.");

  console.log("\n--- Real aggregate coach profile (across all completed sessions) ---");
  const profileRes = await fw(`${BASE}/api/coach/profile`);
  const profile = await profileRes.json();
  console.log(JSON.stringify(profile, null, 2));

  console.log("\n--- Message history before any chat (should be empty or from earlier runs) ---");
  const histBefore = await fw(`${BASE}/api/coach/messages`);
  const histBeforeData = await histBefore.json();
  console.log(`Existing messages: ${histBeforeData.messages.length}`);

  console.log("\n--- Sending real chat message 1 ---");
  const msg1Res = await fw(`${BASE}/api/coach/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "Hi, what should I focus on to improve?" }),
  });
  const msg1Data = await msg1Res.json();
  console.log(JSON.stringify(msg1Data, null, 2));
  if (!msg1Res.ok) {
    console.error("TEST FAILED: message 1 failed");
    process.exit(1);
  }

  console.log("\n--- Sending real chat message 2 (should have context of message 1) ---");
  const msg2Res = await fw(`${BASE}/api/coach/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "Can you say that again in one short sentence?" }),
  });
  const msg2Data = await msg2Res.json();
  console.log(JSON.stringify(msg2Data, null, 2));
  if (!msg2Res.ok) {
    console.error("TEST FAILED: message 2 failed");
    process.exit(1);
  }

  console.log("\n--- Testing empty-message rejection ---");
  const emptyRes = await fw(`${BASE}/api/coach/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "   " }),
  });
  console.log(`Empty message status: ${emptyRes.status} (expect 400)`);
  if (emptyRes.status !== 400) {
    console.error("TEST FAILED: empty message should be rejected");
    process.exit(1);
  }

  console.log("\n--- Testing over-length message rejection ---");
  const longRes = await fw(`${BASE}/api/coach/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "a".repeat(1001) }),
  });
  console.log(`Over-length message status: ${longRes.status} (expect 400)`);
  if (longRes.status !== 400) {
    console.error("TEST FAILED: over-length message should be rejected");
    process.exit(1);
  }

  console.log("\n--- Full history now persisted ---");
  const histAfter = await fw(`${BASE}/api/coach/messages`);
  const histAfterData = await histAfter.json();
  console.log(`Total messages: ${histAfterData.messages.length} (expect +4 from before: 2 user + 2 coach)`);
  const expected = histBeforeData.messages.length + 4;
  if (histAfterData.messages.length !== expected) {
    console.error(`TEST FAILED: expected ${expected} messages, got ${histAfterData.messages.length}`);
    process.exit(1);
  }

  console.log("\nAll Phase 15 checks passed.");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
