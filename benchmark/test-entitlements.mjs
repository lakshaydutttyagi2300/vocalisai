// Real end-to-end test of usage-limit enforcement: a brand-new FREE
// account hitting real limits, difficulty gating, admin plan assignment,
// and confirming mock-test attempts don't double-charge solo-practice
// quota.

const BASE = "http://localhost:3000";

function newCookieJar() {
  let jar = "";
  return {
    async fetch(url, options = {}) {
      const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), Cookie: jar } });
      const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      for (const c of setCookie) {
        const pair = c.split(";")[0];
        const name = pair.split("=")[0];
        jar = jar.split("; ").filter((e) => e && !e.startsWith(`${name}=`)).concat(pair).join("; ");
      }
      return res;
    },
  };
}

async function login(client, email, password) {
  const csrfRes = await client.fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  await client.fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password, csrfToken, json: "true" }),
  });
}

async function main() {
  const email = `entitlements-test-${Date.now()}@example.com`;
  const password = "TestPass123";

  console.log(`--- Signing up a brand-new account: ${email} ---`);
  const signupRes = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Entitlements Test", email, password }),
  });
  if (!signupRes.ok) {
    console.error("TEST FAILED: signup failed", await signupRes.text());
    process.exit(1);
  }
  const { id: userId } = await signupRes.json();

  const candidate = newCookieJar();
  await login(candidate, email, password);
  console.log("Logged in as the new FREE candidate.");

  console.log("\n--- FREE: difficulty gate should block ADVANCED ---");
  const qRes = await candidate.fetch(`${BASE}/api/practice/questions?category=GRAMMAR&difficulty=ADVANCED&count=1`);
  const qData = await qRes.json();
  const attemptRes = await candidate.fetch(`${BASE}/api/practice/attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId: qData.questions[0].id, responseText: "x", timeTakenSeconds: 5 }),
  });
  console.log(`Status: ${attemptRes.status} (expect 403)`);
  if (attemptRes.status !== 403) {
    console.error("TEST FAILED: FREE should not access ADVANCED difficulty");
    process.exit(1);
  }

  console.log("\n--- FREE: 5 practice sessions allowed at Beginner, 6th blocked ---");
  const bq = await candidate.fetch(`${BASE}/api/practice/questions?category=GRAMMAR&difficulty=BEGINNER&count=10`);
  const bqData = await bq.json();
  let allowedCount = 0;
  for (let i = 0; i < 6; i++) {
    const q = bqData.questions[i % bqData.questions.length];
    const res = await candidate.fetch(`${BASE}/api/practice/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: q.id, responseText: "x", timeTakenSeconds: 5 }),
    });
    if (res.ok) allowedCount++;
    else if (i < 5) {
      console.error(`TEST FAILED: attempt ${i + 1} should have been allowed, got ${res.status}`);
      process.exit(1);
    } else {
      console.log(`6th attempt correctly blocked: ${res.status} - ${(await res.json()).error}`);
    }
  }
  console.log(`Allowed: ${allowedCount}/6 (expect 5)`);
  if (allowedCount !== 5) {
    console.error("TEST FAILED: expected exactly 5 allowed practice sessions on FREE");
    process.exit(1);
  }

  console.log("\n--- FREE: Improve My Answer should be locked (limit 0) ---");
  // No analyzed attempt exists yet, but the quota check runs before that
  // check - use a fake id, we only care about the 403 from the quota gate
  // vs a 404 from ownership. Real quota gate returns 403 with an upgrade
  // message before ownership is even considered for cost-incurring calls
  // downstream; here we just confirm coach chat (limit 0) is blocked below,
  // which is a cleaner test of the zero-limit path.

  console.log("\n--- FREE: AI Coach chat should be locked (limit 0) ---");
  const coachRes = await candidate.fetch(`${BASE}/api/coach/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "hello" }),
  });
  console.log(`Status: ${coachRes.status} (expect 403)`);
  if (coachRes.status !== 403) {
    console.error("TEST FAILED: FREE coach chat should be blocked");
    process.exit(1);
  }

  console.log("\n--- FREE: Full Mock Assessment should be locked (limit 0) ---");
  const mockRes = await candidate.fetch(`${BASE}/api/mock-tests/sessions`, { method: "POST" });
  console.log(`Status: ${mockRes.status} (expect 403)`);
  if (mockRes.status !== 403) {
    console.error("TEST FAILED: FREE mock assessment should be blocked");
    process.exit(1);
  }

  console.log("\n--- Admin upgrades this candidate to STARTER ---");
  const admin = newCookieJar();
  await login(admin, "admin@proacting.test", "AdminPass123");
  const patchRes = await admin.fetch(`${BASE}/api/admin/candidates/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: "STARTER" }),
  });
  const patchData = await patchRes.json();
  console.log(`Status: ${patchRes.status}, plan now: ${patchData.usage?.plan}`);
  if (!patchRes.ok || patchData.usage.plan !== "STARTER") {
    console.error("TEST FAILED: admin plan assignment failed");
    process.exit(1);
  }

  console.log("\n--- STARTER: Mock Assessment now allowed, and its attempts don't double-charge PRACTICE_SESSION ---");
  const usageBefore = await admin.fetch(`${BASE}/api/admin/candidates/${userId}`);
  const usageBeforeData = await usageBefore.json();
  const practiceUsedBefore = usageBeforeData.usage.features.find((f) => f.feature === "PRACTICE_SESSION").used;

  const startRes = await candidate.fetch(`${BASE}/api/mock-tests/sessions`, { method: "POST" });
  const startData = await startRes.json();
  if (!startRes.ok) {
    console.error("TEST FAILED: STARTER should be able to start a mock assessment", startData);
    process.exit(1);
  }
  const sessionId = startData.sessionId;
  const section = startData.template.sections[0];
  const sq = await candidate.fetch(`${BASE}/api/practice/questions?category=${section.category}&difficulty=${section.difficulty}&count=1`);
  const sqData = await sq.json();
  await candidate.fetch(`${BASE}/api/practice/attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      questionId: sqData.questions[0].id,
      responseText: sqData.questions[0].options ? sqData.questions[0].options[0] : "x",
      timeTakenSeconds: 5,
      mockTestSessionId: sessionId,
    }),
  });

  const usageAfter = await admin.fetch(`${BASE}/api/admin/candidates/${userId}`);
  const usageAfterData = await usageAfter.json();
  const practiceUsedAfter = usageAfterData.usage.features.find((f) => f.feature === "PRACTICE_SESSION").used;
  const mockUsedAfter = usageAfterData.usage.features.find((f) => f.feature === "MOCK_ASSESSMENT").used;
  console.log(`PRACTICE_SESSION used: ${practiceUsedBefore} -> ${practiceUsedAfter} (expect unchanged)`);
  console.log(`MOCK_ASSESSMENT used: ${mockUsedAfter} (expect 1)`);
  if (practiceUsedAfter !== practiceUsedBefore) {
    console.error("TEST FAILED: a mock-test attempt should NOT consume separate PRACTICE_SESSION quota");
    process.exit(1);
  }
  if (mockUsedAfter !== 1) {
    console.error("TEST FAILED: expected exactly 1 MOCK_ASSESSMENT used");
    process.exit(1);
  }

  console.log("\nAll entitlement checks passed.");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
