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

  console.log("\n--- Full happy path: presign a NEW upload, really PUT bytes, then complete and read back ---");
  const presign2Res = await client.fetch(`${BASE}/api/practice/recordings/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mimeType: "audio/webm" }),
  });
  const presign2Data = await presign2Res.json();

  const fakeAudioBytes = new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
  const putRes = await fetch(presign2Data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "audio/webm" },
    body: fakeAudioBytes,
  });
  console.log(`PUT to R2 status: ${putRes.status} (expect 200)`);
  if (!putRes.ok) {
    console.error("TEST FAILED: the real PUT to the presigned URL should succeed");
    process.exit(1);
  }

  const completeRes = await client.fetch(`${BASE}/api/practice/recordings/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recordingId: presign2Data.recordingId,
      key: presign2Data.key,
      mimeType: "audio/webm",
      durationSeconds: 4,
    }),
  });
  const completeData = await completeRes.json();
  console.log(`Complete status: ${completeRes.status} (expect 200), recordingId: ${completeData.recordingId}`);
  if (!completeRes.ok) {
    console.error("TEST FAILED: completing a real upload should succeed");
    process.exit(1);
  }

  const readRes = await client.fetch(`${BASE}/api/practice/recordings/${completeData.recordingId}`);
  const readBytes = new Uint8Array(await readRes.arrayBuffer());
  console.log(`Read-back status: ${readRes.status}, bytes: [${readBytes.join(",")}] (expect [${fakeAudioBytes.join(",")}])`);
  if (readRes.status !== 200 || readBytes.length !== fakeAudioBytes.length || !readBytes.every((b, i) => b === fakeAudioBytes[i])) {
    console.error("TEST FAILED: read-back bytes should exactly match what was PUT directly to R2");
    process.exit(1);
  }

  console.log("\nFull direct-to-R2 upload flow passed end-to-end.");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
