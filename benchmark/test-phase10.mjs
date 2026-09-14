// Real end-to-end test of the AI Voice Conversation flow: start a
// conversation as CUSTOMER role, respond twice with a real recorded voice
// clip, then end and get the real analysis.

import fs from "node:fs";
import path from "node:path";

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
  const session = await (await fw(`${BASE}/api/auth/session`)).json();
  console.log("Logged in as:", session.user?.email);

  console.log("\n--- Starting conversation (role=CUSTOMER) ---");
  const startRes = await fw(`${BASE}/api/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "CUSTOMER", difficulty: "INTERMEDIATE" }),
  });
  const startData = await startRes.json();
  console.log(startRes.status, startData);
  const sessionId = startData.sessionId;

  const wavPath = path.join(process.cwd(), "benchmark", "audio", "phase8_test.wav");
  const wavBuffer = fs.readFileSync(wavPath);

  for (let turn = 1; turn <= 2; turn++) {
    console.log(`\n--- Candidate turn ${turn} ---`);
    const form = new FormData();
    form.append("file", new Blob([wavBuffer], { type: "audio/wav" }), "recording.wav");
    form.append("durationSeconds", "12");
    const uploadRes = await fw(`${BASE}/api/practice/recordings`, { method: "POST", body: form });
    const uploadData = await uploadRes.json();
    console.log("Upload:", uploadRes.status, uploadData);

    const turnRes = await fw(`${BASE}/api/conversations/${sessionId}/turns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordingId: uploadData.recordingId }),
    });
    const turnData = await turnRes.json();
    console.log("Turn result:", turnRes.status, JSON.stringify(turnData, null, 2));
  }

  console.log("\n--- Ending conversation ---");
  const completeRes = await fw(`${BASE}/api/conversations/${sessionId}/complete`, { method: "POST" });
  const completeData = await completeRes.json();
  console.log(completeRes.status, JSON.stringify(completeData, null, 2));
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
