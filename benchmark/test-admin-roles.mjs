// Verifies the new admin role-management feature end-to-end: an existing
// admin can promote a candidate to ADMIN, a promoted account actually
// gets admin access (not just a DB flag with no effect), an admin cannot
// change their own role, and the new FREE-tier voice recording/speech
// analysis limits are live.

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
  const session = await client.fetch(`${BASE}/api/auth/session`);
  return session.json();
}

async function main() {
  console.log("--- Logging in as the seeded admin ---");
  const admin = newCookieJar();
  const adminSession = await login(admin, "admin@proacting.test", "AdminPass123");
  console.log(`Admin session user: ${adminSession.user?.email}, role: ${adminSession.user?.role}`);
  if (adminSession.user?.role !== "ADMIN") {
    console.error("TEST FAILED: seeded admin should have role ADMIN");
    process.exit(1);
  }

  console.log("\n--- Signing up a new candidate ('friend') to promote ---");
  const friendEmail = `friend-test-${Date.now()}@example.com`;
  const signupRes = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Friend Test", email: friendEmail, password: "FriendPass123" }),
  });
  const { id: friendId } = await signupRes.json();
  console.log(`Created candidate ${friendId} (${friendEmail})`);

  console.log("\n--- Admin promotes the friend to ADMIN ---");
  const promoteRes = await admin.fetch(`${BASE}/api/admin/candidates/${friendId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "ADMIN" }),
  });
  const promoteData = await promoteRes.json();
  console.log(`Status: ${promoteRes.status}, role now: ${promoteData.role}`);
  if (!promoteRes.ok || promoteData.role !== "ADMIN") {
    console.error("TEST FAILED: promotion should succeed");
    process.exit(1);
  }

  console.log("\n--- The promoted friend logs in and actually gets admin access ---");
  const friend = newCookieJar();
  const friendSession = await login(friend, friendEmail, "FriendPass123");
  console.log(`Friend session role: ${friendSession.user?.role}`);
  if (friendSession.user?.role !== "ADMIN") {
    console.error("TEST FAILED: promoted account's session should reflect ADMIN role");
    process.exit(1);
  }
  const friendAdminRes = await friend.fetch(`${BASE}/api/admin/overview`);
  console.log(`Promoted friend hitting /api/admin/overview: ${friendAdminRes.status} (expect 200)`);
  if (friendAdminRes.status !== 200) {
    console.error("TEST FAILED: promoted admin should be able to access admin routes");
    process.exit(1);
  }

  console.log("\n--- The original admin cannot change their own role ---");
  const selfChangeRes = await admin.fetch(`${BASE}/api/admin/candidates/${adminSession.user.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "CANDIDATE" }),
  });
  const selfChangeData = await selfChangeRes.json();
  console.log(`Status: ${selfChangeRes.status} (expect 400), error: ${selfChangeData.error}`);
  if (selfChangeRes.status !== 400) {
    console.error("TEST FAILED: self role change should be rejected");
    process.exit(1);
  }

  console.log("\n--- A plain candidate cannot access admin routes ---");
  const candidateEmail = `plain-candidate-${Date.now()}@example.com`;
  await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Plain Candidate", email: candidateEmail, password: "PlainPass123" }),
  });
  const candidate = newCookieJar();
  await login(candidate, candidateEmail, "PlainPass123");
  const candidateAdminRes = await candidate.fetch(`${BASE}/api/admin/overview`);
  console.log(`Status: ${candidateAdminRes.status} (expect 403)`);
  if (candidateAdminRes.status !== 403) {
    console.error("TEST FAILED: a plain candidate should be forbidden from admin routes");
    process.exit(1);
  }

  console.log("\n--- New FREE-tier limits: 2 voice recordings, 2 speech analyses ---");
  const usageRes = await candidate.fetch(`${BASE}/api/billing/usage`);
  const usageData = await usageRes.json();
  const voiceLimit = usageData.features.find((f) => f.feature === "VOICE_RECORDING")?.limit;
  const analysisLimit = usageData.features.find((f) => f.feature === "SPEECH_ANALYSIS")?.limit;
  console.log(`VOICE_RECORDING limit: ${voiceLimit} (expect 2), SPEECH_ANALYSIS limit: ${analysisLimit} (expect 2)`);
  if (voiceLimit !== 2 || analysisLimit !== 2) {
    console.error("TEST FAILED: FREE tier should now allow 2 voice recordings and 2 speech analyses");
    process.exit(1);
  }

  console.log("\nAll admin role-management and free-tier-fix checks passed.");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
