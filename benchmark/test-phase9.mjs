// Real end-to-end test of Phase 9 (dedicated Transcription): analyze a
// fresh voice attempt and confirm real per-segment timestamps are now
// persisted and returned alongside the recordingId, enabling audio-synced
// transcript playback in the UI.

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

  const qRes = await fw(`${BASE}/api/practice/questions?category=READING&difficulty=INTERMEDIATE&count=1`);
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
  console.log(`Attempt: ${attemptData.attemptId}`);

  console.log("\n--- Analyzing (real transcription + AI) ---");
  const analyzeRes = await fw(`${BASE}/api/practice/attempts/${attemptData.attemptId}/analyze`, { method: "POST" });
  const analyzeData = await analyzeRes.json();
  if (!analyzeRes.ok) {
    console.error("TEST FAILED:", analyzeData.error);
    process.exit(1);
  }

  const { recordingId, deterministic } = analyzeData.result;
  console.log(`recordingId present: ${!!recordingId}`);
  console.log(`segments count: ${deterministic.segments.length}`);
  console.log("First 2 segments:", JSON.stringify(deterministic.segments.slice(0, 2), null, 2));

  if (!recordingId) {
    console.error("TEST FAILED: expected a recordingId for audio playback");
    process.exit(1);
  }
  if (!Array.isArray(deterministic.segments) || deterministic.segments.length === 0) {
    console.error("TEST FAILED: expected real segments to be persisted and returned");
    process.exit(1);
  }
  for (const s of deterministic.segments) {
    if (typeof s.start !== "number" || typeof s.end !== "number" || s.end < s.start) {
      console.error("TEST FAILED: malformed segment", s);
      process.exit(1);
    }
  }
  console.log("Segment timestamps are well-formed and monotonic.");

  console.log("\n--- Confirming the recording is fetchable for the <audio> element ---");
  const audioRes = await fw(`${BASE}/api/practice/recordings/${recordingId}`);
  console.log(`Audio fetch status: ${audioRes.status}, content-type: ${audioRes.headers.get("content-type")}`);
  if (!audioRes.ok) {
    console.error("TEST FAILED: recording should be fetchable by its owner");
    process.exit(1);
  }

  console.log("\n--- GET (cached) response also includes recordingId + segments ---");
  const getRes = await fw(`${BASE}/api/practice/attempts/${attemptData.attemptId}/analyze`);
  const getData = await getRes.json();
  if (getData.result.recordingId !== recordingId || getData.result.deterministic.segments.length !== deterministic.segments.length) {
    console.error("TEST FAILED: cached GET should return the same recordingId/segments as the POST");
    process.exit(1);
  }

  console.log(`\nattemptId for manual UI check: ${attemptData.attemptId}`);
  console.log("All Phase 9 checks passed.");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
