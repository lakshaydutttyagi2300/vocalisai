// Real end-to-end test of the Phase 13 scoring engine: run a mock test with
// real MCQ answers and real recorded voice answers, analyze several voice
// recordings for real (real transcription + real AI ratings), then fetch
// the real computed score report.

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

  console.log("\n--- Score report BEFORE any analysis (should show pending notes) ---");
  const scoreBefore = await fw(`${BASE}/api/mock-tests/sessions/${sessionId}/score`);
  console.log(JSON.stringify(await scoreBefore.json(), null, 2));

  console.log("\n--- Analyzing 3 voice attempts (real transcription + real AI ratings) ---");
  for (const attemptId of voiceAttemptIds.slice(-3)) {
    const analyzeRes = await fw(`${BASE}/api/practice/attempts/${attemptId}/analyze`, { method: "POST" });
    const analyzeData = await analyzeRes.json();
    if (!analyzeRes.ok) {
      console.log(`  ${attemptId}: FAILED -`, analyzeData.error);
    } else {
      console.log(`  ${attemptId}: analyzed - ratings:`, {
        pronunciation: analyzeData.result.ai.pronunciation.rating,
        fluency: analyzeData.result.ai.fluency.rating,
        grammar: analyzeData.result.ai.grammar.rating,
        vocabulary: analyzeData.result.ai.vocabulary.rating,
        voiceClarity: analyzeData.result.ai.voiceClarity.rating,
        delivery: analyzeData.result.ai.delivery.rating,
        customerHandling: analyzeData.result.ai.customerHandling,
      });
    }
  }

  console.log("\n--- Ending session ---");
  await fw(`${BASE}/api/mock-tests/sessions/${sessionId}`, { method: "PATCH" });

  console.log("\n--- Score report AFTER analysis ---");
  const scoreAfter = await fw(`${BASE}/api/mock-tests/sessions/${sessionId}/score`);
  console.log(JSON.stringify(await scoreAfter.json(), null, 2));
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
