// Verifies the new direct-to-R2 upload flow (presign -> PUT -> complete).
// Local dev has no real R2 bucket, so this exercises two things:
//  1. With no R2 env vars set, /presign correctly reports mode "server"
//     (the client should fall back to the original multipart upload).
//  2. With FAKE R2 credentials set (server restarted with them), /presign
//     returns a well-formed signed URL, and /complete correctly rejects a
//     forged/mismatched key AND rejects a key that was never actually
//     uploaded (since there's no real bucket, recordingExists() will
//     legitimately return false for anything) - proving the "never trust
//     the client's claim alone" check actually blocks a fabricated row.

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
  const email = `presign-test-${Date.now()}@example.com`;
  const password = "TestPass123";
  await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Presign Test", email, password }),
  });
  const client = newCookieJar();
  await login(client, email, password);

  const mode = process.env.TEST_MODE || "server";

  if (mode === "server") {
    console.log("--- No R2 configured: /presign should report mode 'server' ---");
    const res = await client.fetch(`${BASE}/api/practice/recordings/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mimeType: "audio/webm" }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}, mode: ${data.mode} (expect "server")`);
    if (data.mode !== "server") {
      console.error("TEST FAILED: expected server fallback mode when R2 isn't configured");
      process.exit(1);
    }
    console.log("\nServer-fallback mode check passed.");
    return;
  }

  console.log("--- Fake R2 configured: /presign should report mode 'direct' with a signed URL ---");
  const presignRes = await client.fetch(`${BASE}/api/practice/recordings/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mimeType: "audio/webm" }),
  });
  const presignData = await presignRes.json();
  console.log(`Status: ${presignRes.status}, mode: ${presignData.mode}, key: ${presignData.key}`);
  console.log(`uploadUrl starts with expected R2 endpoint: ${presignData.uploadUrl?.includes(".r2.cloudflarestorage.com")}`);
  if (presignData.mode !== "direct" || !presignData.uploadUrl || !presignData.key || !presignData.recordingId) {
    console.error("TEST FAILED: expected a direct-mode presigned response");
    process.exit(1);
  }

  console.log("\n--- /complete rejects a forged key belonging to a different user ---");
  const forgedRes = await client.fetch(`${BASE}/api/practice/recordings/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recordingId: presignData.recordingId,
      key: `recordings/someone-else/${presignData.recordingId}.webm`,
      mimeType: "audio/webm",
      durationSeconds: 5,
    }),
  });
  console.log(`Status: ${forgedRes.status} (expect 400)`);
  if (forgedRes.status !== 400) {
    console.error("TEST FAILED: a forged key should be rejected");
    process.exit(1);
  }

  console.log("\n--- /complete rejects a correctly-shaped key that was never actually uploaded ---");
  const neverUploadedRes = await client.fetch(`${BASE}/api/practice/recordings/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recordingId: presignData.recordingId,
      key: presignData.key,
      mimeType: "audio/webm",
      durationSeconds: 5,
    }),
  });
  const neverUploadedData = await neverUploadedRes.json();
  console.log(`Status: ${neverUploadedRes.status} (expect 404), error: ${neverUploadedData.error}`);
  if (neverUploadedRes.status !== 404) {
    console.error("TEST FAILED: completing a recording that was never actually uploaded should be rejected, not trusted");
    process.exit(1);
  }

  console.log("\nDirect-mode presign/complete safety checks passed.");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
