// Verifies the new storage abstraction (src/lib/storage.ts) still works
// correctly through its local-disk fallback (no R2 env vars set locally) -
// upload a fake recording, then read it back and confirm the exact bytes
// round-trip. Once R2 credentials exist, the exact same code path routes
// through R2 instead - this test can be re-run against a server with R2
// configured to confirm that path too, with no changes needed here.

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
  const email = `storage-test-${Date.now()}@example.com`;
  const password = "TestPass123";

  await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Storage Test", email, password }),
  });

  const client = newCookieJar();
  await login(client, email, password);

  const fakeAudioBytes = new Uint8Array([1, 2, 3, 4, 5, 250, 251, 252, 253, 254]);
  const form = new FormData();
  form.append("file", new Blob([fakeAudioBytes], { type: "audio/webm" }), "test.webm");
  form.append("durationSeconds", "3");

  console.log("--- Uploading a fake recording ---");
  const uploadRes = await client.fetch(`${BASE}/api/practice/recordings`, { method: "POST", body: form });
  const uploadData = await uploadRes.json();
  console.log(`Status: ${uploadRes.status}, recordingId: ${uploadData.recordingId}`);
  if (!uploadRes.ok) {
    console.error("TEST FAILED: upload should succeed");
    process.exit(1);
  }

  console.log("\n--- Reading it back and comparing bytes ---");
  const readRes = await client.fetch(`${BASE}/api/practice/recordings/${uploadData.recordingId}`);
  const readBuffer = new Uint8Array(await readRes.arrayBuffer());
  console.log(`Status: ${readRes.status}, bytes: [${readBuffer.join(",")}] (expect [${fakeAudioBytes.join(",")}])`);
  if (readRes.status !== 200 || readBuffer.length !== fakeAudioBytes.length || !readBuffer.every((b, i) => b === fakeAudioBytes[i])) {
    console.error("TEST FAILED: read-back bytes should exactly match what was uploaded");
    process.exit(1);
  }

  console.log("\n--- Another user's session cannot read this recording ---");
  const otherEmail = `storage-test-other-${Date.now()}@example.com`;
  await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Other User", email: otherEmail, password }),
  });
  const other = newCookieJar();
  await login(other, otherEmail, password);
  const otherRes = await other.fetch(`${BASE}/api/practice/recordings/${uploadData.recordingId}`);
  console.log(`Status: ${otherRes.status} (expect 404)`);
  if (otherRes.status !== 404) {
    console.error("TEST FAILED: another user should not be able to read this recording");
    process.exit(1);
  }

  console.log("\nAll storage abstraction checks passed.");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
