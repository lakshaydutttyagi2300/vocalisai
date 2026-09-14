// One-off integration test for Phase 8: logs in as a real test account,
// uploads a real speech recording, creates a real PracticeAttempt, then
// calls the real analyze endpoint - end to end, over real HTTP, no mocking.

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
    cookieJar = cookieJar
      .split("; ")
      .filter((existing) => existing && !existing.startsWith(`${name}=`))
      .concat(pair)
      .join("; ");
  }
}

async function fetchWithCookies(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Cookie: cookieJar },
  });
  captureCookies(res);
  return res;
}

async function main() {
  const csrfRes = await fetchWithCookies(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();

  await fetchWithCookies(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email: EMAIL, password: PASSWORD, csrfToken, json: "true" }),
  });

  const sessionRes = await fetchWithCookies(`${BASE}/api/auth/session`);
  const session = await sessionRes.json();
  console.log("Logged in as:", session.user?.email);
  if (!session.user) throw new Error("Login failed");

  const qRes = await fetchWithCookies(`${BASE}/api/practice/questions?category=CUSTOMER_SERVICE&difficulty=INTERMEDIATE&count=1`);
  const qData = await qRes.json();
  const question = qData.questions[0];
  console.log("Question:", question.prompt, "| Scenario:", question.passage);

  const wavPath = path.join(process.cwd(), "benchmark", "audio", "phase8_test.wav");
  const wavBuffer = fs.readFileSync(wavPath);
  const blob = new Blob([wavBuffer], { type: "audio/wav" });

  const form = new FormData();
  form.append("file", blob, "recording.wav");
  form.append("questionId", question.id);
  form.append("durationSeconds", "12");

  const uploadRes = await fetchWithCookies(`${BASE}/api/practice/recordings`, { method: "POST", body: form });
  const uploadData = await uploadRes.json();
  console.log("Upload:", uploadRes.status, uploadData);

  const attemptRes = await fetchWithCookies(`${BASE}/api/practice/attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId: question.id, recordingId: uploadData.recordingId, timeTakenSeconds: 15 }),
  });
  const attemptData = await attemptRes.json();
  console.log("Attempt:", attemptRes.status, attemptData);

  console.log("\n--- Calling /analyze (real Groq transcription + real Gemini audio analysis) ---");
  const analyzeStart = Date.now();
  const analyzeRes = await fetchWithCookies(`${BASE}/api/practice/attempts/${attemptData.attemptId}/analyze`, {
    method: "POST",
  });
  const analyzeData = await analyzeRes.json();
  console.log(`Analyze: ${analyzeRes.status} (${Date.now() - analyzeStart}ms)`);
  console.log(JSON.stringify(analyzeData, null, 2));
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
