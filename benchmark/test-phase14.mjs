// Real end-to-end test of the Phase 14 AI Results Report: run a mock test,
// analyze a few voice recordings for real, then generate the narrative
// report for real and print it, plus verify it is cached on a second call.

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

const VOICE_CATEGORIES = new Set(["READING", "PRONUNCIATION", "FLUENCY", "SPEAKING", "CUSTOMER_SERVICE"]);

async function main() {
  const csrfRes = await fw(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  await fw(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email: EMAIL, password: PASSWORD, csrfToken, json: "true" }),
  });
  console.log("Logged in.");

  const startRes = await fw(`${BASE}/api/mock-tests/sessions`, { method: "POST" });
  const startData = await startRes.json();
  const sessionId = startData.sessionId;
  const sections = startData.template.sections;
  console.log(`Session: ${sessionId}`);

  const wavPath = path.join(process.cwd(), "benchmark", "audio", "phase8_test.wav");
  const wavBuffer = fs.readFileSync(wavPath);

  const voiceAttemptIds = [];

  for (const section of sections) {
    const qRes = await fw(
      `${BASE}/api/practice/questions?category=${section.category}&difficulty=${section.difficulty}&count=${section.questionCount}`
    );
    const qData = await qRes.json();
    if (!qRes.ok) continue;

    for (const q of qData.questions) {
      const isVoice = VOICE_CATEGORIES.has(section.category);
      let body;

      if (isVoice) {
        const form = new FormData();
        form.append("file", new Blob([wavBuffer], { type: "audio/wav" }), "recording.wav");
        form.append("durationSeconds", "12");
        const uploadRes = await fw(`${BASE}/api/practice/recordings`, { method: "POST", body: form });
        const uploadData = await uploadRes.json();
        body = { questionId: q.id, recordingId: uploadData.recordingId, timeTakenSeconds: 10, mockTestSessionId: sessionId };
      } else {
        const answer = q.options ? q.options[0] : "a reasonable free-text answer";
        body = { questionId: q.id, responseText: answer, timeTakenSeconds: 5, mockTestSessionId: sessionId };
      }

      const attemptRes = await fw(`${BASE}/api/practice/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const attemptData = await attemptRes.json();
      if (attemptRes.ok && isVoice) voiceAttemptIds.push(attemptData.attemptId);
    }
  }

  console.log(`\nAnswered all sections. ${voiceAttemptIds.length} voice attempts recorded.`);

  console.log("\n--- Report BEFORE it exists (should be generated:false) ---");
  const before = await fw(`${BASE}/api/mock-tests/sessions/${sessionId}/report`);
  console.log(JSON.stringify(await before.json(), null, 2));

  console.log("\n--- Analyzing 4 voice attempts (real transcription + real AI ratings) ---");
  for (const attemptId of voiceAttemptIds.slice(-4)) {
    const analyzeRes = await fw(`${BASE}/api/practice/attempts/${attemptId}/analyze`, { method: "POST" });
    if (!analyzeRes.ok) {
      const d = await analyzeRes.json();
      console.log(`  ${attemptId}: FAILED -`, d.error);
    } else {
      console.log(`  ${attemptId}: analyzed`);
    }
  }

  await fw(`${BASE}/api/mock-tests/sessions/${sessionId}`, { method: "PATCH" });

  console.log("\n--- Generating the AI report for real (first call, should call Gemini) ---");
  const genStart = Date.now();
  const genRes = await fw(`${BASE}/api/mock-tests/sessions/${sessionId}/report`, { method: "POST" });
  const genMs = Date.now() - genStart;
  const genData = await genRes.json();
  console.log(`(took ${genMs}ms)`);
  console.log(JSON.stringify(genData, null, 2));

  if (!genRes.ok) {
    console.error("TEST FAILED: report generation failed");
    process.exit(1);
  }

  console.log("\n--- Fetching again (should return cached, near-instant, identical) ---");
  const cachedStart = Date.now();
  const cachedRes = await fw(`${BASE}/api/mock-tests/sessions/${sessionId}/report`, { method: "POST" });
  const cachedMs = Date.now() - cachedStart;
  const cachedData = await cachedRes.json();
  console.log(`(took ${cachedMs}ms)`);
  const identical = JSON.stringify(cachedData.result) === JSON.stringify(genData.result);
  console.log(`Identical to first call: ${identical}`);
  if (!identical) {
    console.error("TEST FAILED: cached report differs from generated report");
    process.exit(1);
  }
  if (cachedMs >= genMs) {
    console.log("NOTE: cached call was not faster than generation call (not necessarily a bug, but worth eyeballing).");
  }

  console.log(`\nsessionId for manual UI check: ${sessionId}`);
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
