// Verifies the FREE-tier interview-simulation turn cap (3) fires BEFORE
// any transcription cost is spent - the turns route checks it before even
// parsing the request body, so calling it with no recordingId still
// proves the gate (a request that got past the gate would 400 on the
// missing recordingId, not 403).

import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";
const db = new PrismaClient();

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
  const email = `interview-cap-test-${Date.now()}@example.com`;
  const password = "TestPass123";

  const signupRes = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Interview Cap Test", email, password }),
  });
  const { id: userId } = await signupRes.json();

  const candidate = newCookieJar();
  await login(candidate, email, password);

  const question = await db.practiceQuestion.findFirst({ where: { difficulty: "BEGINNER" } });
  if (!question) {
    console.error("TEST FAILED: no BEGINNER question seeded to attach a conversation to");
    process.exit(1);
  }

  const convo = await db.conversationSession.create({
    data: {
      userId,
      role: "CUSTOMER",
      questionId: question.id,
      turns: {
        create: [
          { turnIndex: 0, speaker: "ai", text: "Opening line" },
          { turnIndex: 1, speaker: "candidate", text: "turn 1" },
          { turnIndex: 2, speaker: "ai", text: "reply 1" },
          { turnIndex: 3, speaker: "candidate", text: "turn 2" },
          { turnIndex: 4, speaker: "ai", text: "reply 2" },
          { turnIndex: 5, speaker: "candidate", text: "turn 3" },
        ],
      },
    },
  });

  console.log("--- FREE candidate at 3/3 candidate turns tries a 4th turn ---");
  const res = await candidate.fetch(`${BASE}/api/conversations/${convo.id}/turns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordingId: "nonexistent" }),
  });
  const data = await res.json();
  console.log(`Status: ${res.status} (expect 403), error: ${data.error}`);
  if (res.status !== 403) {
    console.error("TEST FAILED: FREE candidate should be blocked at the 3-turn cap before any body parsing");
    process.exit(1);
  }

  console.log("\nInterview-simulation turn cap check passed.");
}

main()
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
