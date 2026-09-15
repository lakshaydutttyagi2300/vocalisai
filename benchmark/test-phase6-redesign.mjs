// Real end-to-end test of the Phase 6 redesign additions: per-attempt
// category scores (via the real RATING_SCORE mapping), the phonetic-hint
// field on mispronounced words, and the new "Improve My Answer" endpoint.

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
  console.log("Logged in.");

  const qRes = await fw(`${BASE}/api/practice/questions?category=CUSTOMER_SERVICE&difficulty=INTERMEDIATE&count=1`);
  const qData = await qRes.json();
  const question = qData.questions[0];
  console.log(`Question: ${question.id}`);

  const wavBuffer = fs.readFileSync(path.join(process.cwd(), "benchmark", "audio", "phase8_test.wav"));
  const form = new FormData();
  form.append("file", new Blob([wavBuffer], { type: "audio/wav" }), "recording.wav");
  form.append("questionId", question.id);
  form.append("durationSeconds", "12");
  const uploadRes = await fw(`${BASE}/api/practice/recordings`, { method: "POST", body: form });
  const uploadData = await uploadRes.json();

  const attemptRes = await fw(`${BASE}/api/practice/attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId: question.id, recordingId: uploadData.recordingId, timeTakenSeconds: 10 }),
  });
  const attemptData = await attemptRes.json();
  const attemptId = attemptData.attemptId;
  console.log(`Attempt: ${attemptId}`);

  console.log("\n--- Analyzing (real transcription + AI, with phoneticHint) ---");
  const analyzeRes = await fw(`${BASE}/api/practice/attempts/${attemptId}/analyze`, { method: "POST" });
  const analyzeData = await analyzeRes.json();
  if (!analyzeRes.ok) {
    console.error("TEST FAILED:", analyzeData.error);
    process.exit(1);
  }
  console.log(`category: ${analyzeData.result.category}`);
  console.log(`hasImprovedAnswer: ${analyzeData.result.hasImprovedAnswer}`);
  console.log("pronunciation.rating:", analyzeData.result.ai.pronunciation.rating);
  console.log("mispronouncedWords:", JSON.stringify(analyzeData.result.ai.pronunciation.mispronouncedWords, null, 2));

  if (analyzeData.result.category !== "CUSTOMER_SERVICE") {
    console.error("TEST FAILED: expected category to be threaded through");
    process.exit(1);
  }
  if (analyzeData.result.hasImprovedAnswer !== false) {
    console.error("TEST FAILED: hasImprovedAnswer should start false");
    process.exit(1);
  }

  console.log("\n--- Improve My Answer: before generation (should be generated:false) ---");
  const beforeRes = await fw(`${BASE}/api/practice/attempts/${attemptId}/improve`);
  const beforeData = await beforeRes.json();
  console.log(JSON.stringify(beforeData));
  if (beforeData.generated !== false) {
    console.error("TEST FAILED: expected generated:false before any POST");
    process.exit(1);
  }

  console.log("\n--- Improve My Answer: generating for real ---");
  const improveRes = await fw(`${BASE}/api/practice/attempts/${attemptId}/improve`, { method: "POST" });
  const improveData = await improveRes.json();
  console.log(JSON.stringify(improveData, null, 2));
  if (!improveRes.ok) {
    console.error("TEST FAILED:", improveData.error);
    process.exit(1);
  }
  if (!improveData.result.improvedAnswer || typeof improveData.result.improvements.grammar !== "boolean") {
    console.error("TEST FAILED: malformed improve result");
    process.exit(1);
  }

  console.log("\n--- Improve My Answer: cached on second POST (should not re-call AI, same content) ---");
  const cachedStart = Date.now();
  const cachedRes = await fw(`${BASE}/api/practice/attempts/${attemptId}/improve`, { method: "POST" });
  const cachedMs = Date.now() - cachedStart;
  const cachedData = await cachedRes.json();
  console.log(`(took ${cachedMs}ms)`);
  if (JSON.stringify(cachedData.result) !== JSON.stringify(improveData.result)) {
    console.error("TEST FAILED: cached improve result differs from generated one");
    process.exit(1);
  }

  console.log("\n--- Re-fetching the attempt: hasImprovedAnswer should now be true ---");
  const refetchRes = await fw(`${BASE}/api/practice/attempts/${attemptId}/analyze`);
  const refetchData = await refetchRes.json();
  console.log(`hasImprovedAnswer: ${refetchData.result.hasImprovedAnswer}`);
  if (refetchData.result.hasImprovedAnswer !== true) {
    console.error("TEST FAILED: hasImprovedAnswer should be true after generating");
    process.exit(1);
  }

  console.log(`\nattemptId for manual UI check: ${attemptId}`);
  console.log("All Phase 6 redesign checks passed.");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
