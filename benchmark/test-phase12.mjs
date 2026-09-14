// Real end-to-end test of the Full Mock Assessment: real login, real
// session creation against the seeded 9-section template, real answers
// (MCQ picks + real recorded audio for voice sections) for every question,
// real session end, then the real results summary.

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
  console.log(`\nSession created: ${startData.sessionId}`);
  console.log(`Template: ${startData.template?.name}, ${startData.template?.sections.length} sections`);
  const sessionId = startData.sessionId;
  const sections = startData.template.sections;

  const wavPath = path.join(process.cwd(), "benchmark", "audio", "phase8_test.wav");
  const wavBuffer = fs.readFileSync(wavPath);

  let totalAnswered = 0;

  for (const section of sections) {
    const qRes = await fw(
      `${BASE}/api/practice/questions?category=${section.category}&difficulty=${section.difficulty}&count=${section.questionCount}`
    );
    const qData = await qRes.json();
    if (!qRes.ok) {
      console.log(`Section ${section.category}: FAILED to fetch questions -`, qData.error);
      continue;
    }
    console.log(`\nSection ${section.order} (${section.category}): ${qData.questions.length} questions`);

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
      if (!attemptRes.ok) {
        console.log(`  Q "${q.prompt.slice(0, 40)}": FAILED -`, attemptData.error);
      } else {
        totalAnswered++;
        console.log(`  Q "${q.prompt.slice(0, 40)}": saved (attempt ${attemptData.attemptId.slice(-6)}, isCorrect=${attemptData.isCorrect})`);
      }
    }
  }

  console.log(`\nTotal answered: ${totalAnswered}`);

  console.log("\n--- Ending session ---");
  const endRes = await fw(`${BASE}/api/mock-tests/sessions/${sessionId}`, { method: "PATCH" });
  console.log("End:", endRes.status, await endRes.json());

  console.log("\n--- Fetching summary ---");
  const summaryRes = await fw(`${BASE}/api/mock-tests/sessions/${sessionId}/summary`);
  const summary = await summaryRes.json();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
