import crypto from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

// QA repros for problems that are NOT fixed yet (29 Sep 2026 QA pass).
// Each describe is skipped so the suite stays green; remove ".skip" to
// reproduce, and keep the test once the fix lands. All AI providers and
// storage are mocked - nothing here calls Groq, Gemini, R2 or Paddle.
const session = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock("next-auth", () => session);
const ai = vi.hoisted(() => ({ analyzeAttempt: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/analyze-attempt", () => ai);
const groq = vi.hoisted(() => ({
  transcribe: vi.fn(async () => ({ transcript: "hello there", segments: [], durationSeconds: 3, providerName: "g", model: "m" })),
}));
vi.mock("@/lib/providers/groq-whisper-provider", () => ({ createGroqWhisperProvider: () => groq }));
const gemini = vi.hoisted(() => ({
  generateNextTurn: vi.fn(async () => ({ text: "next question" })),
  summarizeConversation: vi.fn(async () => ({ result: { summary: "s" } })),
  analyzeCustomerServiceSimulation: vi.fn(async () => ({ result: {} })),
}));
vi.mock("@/lib/providers/gemini-conversation-provider", () => ({ createGeminiConversationProvider: () => gemini }));
vi.mock("@/lib/storage", () => ({ readRecording: vi.fn(async () => Buffer.from("x")) }));

const run = Date.now();
const userIds: string[] = [];
const envBefore = { ...process.env };

async function makeUser(key: string, plan?: "STARTER") {
  const { setPlan } = await import("@/lib/entitlements");
  const u = await db.user.create({ data: { email: `qa-open-${key}-${run}@example.test`, passwordHash: "x", name: `qa ${key}` } });
  userIds.push(u.id);
  if (plan) await setPlan(u.id, plan);
  session.getServerSession.mockResolvedValue({ user: { id: u.id, email: "x@example.test", role: "CANDIDATE" } });
  return u.id;
}

function json(body: unknown) {
  return new Request("http://localhost/x", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

beforeAll(() => {
  process.env.GROQ_API_KEY = "test-not-used";
  process.env.GEMINI_API_KEY = "test-not-used";
});
beforeEach(() => vi.clearAllMocks());
afterAll(async () => {
  for (const k of ["GROQ_API_KEY", "GEMINI_API_KEY", "PADDLE_WEBHOOK_SECRET", "NEXT_PUBLIC_PADDLE_PRICE_STARTER"]) {
    if (envBefore[k] === undefined) delete process.env[k];
    else process.env[k] = envBefore[k];
  }
  await db.practiceAttempt.deleteMany({ where: { userId: { in: userIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.emailVerification.deleteMany({ where: { email: { contains: `-${run}@` } } });
});

// QA-4: POST /api/practice/attempts skips every usage check when a
// mockTestSessionId is given, for ANY session the user owns (ended or not,
// any number of answers), and GET .../score then runs a paid Groq+Gemini
// analysis on each of them without a SPEECH_ANALYSIS check.
describe.skip("QA-4 mock session as an unlimited voice + AI analysis channel", () => {
  it("a finished mock session doesn't accept extra answers or pay for their analysis", async () => {
    const userId = await makeUser("mock", "STARTER");
    const ms = await db.mockTestSession.create({ data: { userId, endedAt: new Date() } }); // no template, already ended
    const q = await db.practiceQuestion.findFirstOrThrow({ where: { isActive: true, correctAnswer: null }, select: { id: true } });
    const { POST } = await import("@/app/api/practice/attempts/route");
    let accepted = 0;
    for (let i = 0; i < 6; i++) {
      const rec = await db.practiceRecording.create({ data: { userId, filePath: `recordings/${userId}/q${i}.webm`, mimeType: "audio/webm" } });
      const res = await POST(json({ questionId: q.id, recordingId: rec.id, timeTakenSeconds: 5, mockTestSessionId: ms.id }));
      if (res.status === 200) accepted++;
    }
    const { GET } = await import("@/app/api/mock-tests/sessions/[id]/score/route");
    await GET(new Request("http://localhost/x"), { params: Promise.resolve({ id: ms.id }) });
    // Today: accepted 6, 0 VOICE_RECORDING used, 6 analyses run, 0 SPEECH_ANALYSIS used.
    expect(accepted).toBe(0);
    expect(ai.analyzeAttempt).not.toHaveBeenCalled();
  }, 120_000);
});

// QA-5: the turn-count checks read the turn list before the (slow)
// transcription, so parallel turns all pass.
describe.skip("QA-5 parallel Interview Simulation turns", () => {
  it("a FREE sample stays at 3 candidate turns even when turns are sent in parallel", async () => {
    const userId = await makeUser("turns");
    const convo = await db.conversationSession.create({
      data: { userId, role: "INTERVIEWER", turns: { create: [{ turnIndex: 0, speaker: "ai", text: "Hi" }] } },
    });
    const rec = await db.practiceRecording.create({ data: { userId, filePath: `recordings/${userId}/t.webm`, mimeType: "audio/webm" } });
    const { POST } = await import("@/app/api/conversations/[id]/turns/route");
    await Promise.all(Array.from({ length: 8 }, () => POST(json({ recordingId: rec.id }), { params: Promise.resolve({ id: convo.id }) })));
    // Today: 8 candidate turns, 8 transcriptions, 8 Gemini replies (all with turnIndex 1/2).
    expect(await db.conversationTurn.count({ where: { sessionId: convo.id, speaker: "candidate" } })).toBeLessThanOrEqual(3);
  }, 120_000);
});

// QA-6: paid AI results are cached, but nothing claims the work first, so
// parallel calls each pay (same pattern in mock-tests/.../report and /score).
describe.skip("QA-6 parallel 'end conversation' calls", () => {
  it("pays for the final analysis once", async () => {
    const userId = await makeUser("complete", "STARTER");
    const convo = await db.conversationSession.create({
      data: { userId, role: "INTERVIEWER", turns: { create: [{ turnIndex: 0, speaker: "ai", text: "Hi" }, { turnIndex: 1, speaker: "candidate", text: "answer" }] } },
    });
    const { POST } = await import("@/app/api/conversations/[id]/complete/route");
    await Promise.all(Array.from({ length: 5 }, () => POST(new Request("http://localhost/x", { method: "POST" }), { params: Promise.resolve({ id: convo.id }) })));
    expect(gemini.summarizeConversation).toHaveBeenCalledTimes(1); // today: 5
  }, 120_000);
});

// QA-7: Paddle webhook ordering and period handling (billing isn't live yet).
describe.skip("QA-7 Paddle webhook", () => {
  const SECRET = `test-${crypto.randomBytes(8).toString("hex")}`;
  const PRICE = `pri_test_${run}`;
  function signed(event: string, userId: string, occurredAt: string, status = "active") {
    const raw = JSON.stringify({
      event_type: event,
      occurred_at: occurredAt,
      data: { id: `sub_${run}_${userId}`, status, custom_data: { userId }, items: [{ price: { id: PRICE } }], current_billing_period: { starts_at: "2026-09-01T00:00:00Z", ends_at: "2026-10-01T00:00:00Z" } },
    });
    const ts = Math.floor(Date.now() / 1000);
    const h1 = crypto.createHmac("sha256", SECRET).update(`${ts}:${raw}`).digest("hex");
    return new Request("http://localhost/api/webhooks/paddle", { method: "POST", body: raw, headers: { "paddle-signature": `ts=${ts};h1=${h1}` } });
  }
  beforeAll(() => {
    process.env.PADDLE_WEBHOOK_SECRET = SECRET;
    process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER = PRICE;
  });

  it("a late 'subscription.updated' from before a cancellation doesn't re-grant the plan", async () => {
    const { POST } = await import("@/app/api/webhooks/paddle/route");
    const { getEffectivePlan } = await import("@/lib/entitlements");
    const id = await makeUser("paddle-order");
    await POST(signed("subscription.created", id, "2026-09-01T00:00:00Z"));
    await POST(signed("subscription.canceled", id, "2026-09-20T00:00:00Z", "canceled"));
    await POST(signed("subscription.updated", id, "2026-09-10T00:00:00Z")); // delivered late
    expect(await getEffectivePlan(id)).toBe("FREE"); // today: STARTER
  }, 60_000);

  it("a mid-period 'subscription.updated' doesn't reset the month's usage", async () => {
    const { POST } = await import("@/app/api/webhooks/paddle/route");
    const { checkAndRecordUsage } = await import("@/lib/entitlements");
    const id = await makeUser("paddle-reset");
    await POST(signed("subscription.created", id, "2026-09-01T00:00:00Z"));
    await checkAndRecordUsage(id, "MOCK_ASSESSMENT");
    await checkAndRecordUsage(id, "MOCK_ASSESSMENT"); // STARTER: 2 a month
    await POST(signed("subscription.updated", id, "2026-09-15T00:00:00Z"));
    expect((await checkAndRecordUsage(id, "MOCK_ASSESSMENT")).allowed).toBe(false); // today: true
  }, 60_000);
});

// QA-8: wrong-code attempts are counted after comparing, so parallel
// guesses each get compared before the count reaches MAX_CODE_ATTEMPTS.
describe.skip("QA-8 parallel sign-up code guesses", () => {
  it("compares at most MAX_CODE_ATTEMPTS codes per emailed code", async () => {
    const { MAX_CODE_ATTEMPTS, startSignup, verifySignupCode } = await import("@/lib/email-verification");
    const email = `qa-open-otp-${run}@example.org`;
    const deps = { domainAccepts: async () => true, sendCode: async () => {}, generateCode: () => "424242" };
    expect((await startSignup({ name: "Otp Tester", email, password: "correct-horse-battery" }, `qa-ip-${run}`, deps)).ok).toBe(true);
    await Promise.all(Array.from({ length: 12 }, (_, i) => verifySignupCode(email, String(100000 + i), `qa-ip-${run}-${i}`, deps)));
    const row = await db.emailVerification.findUniqueOrThrow({ where: { email } });
    // attempts is only incremented after a failed comparison, so it counts comparisons made. Today: ~8.
    expect(row.attempts).toBeLessThanOrEqual(MAX_CODE_ATTEMPTS);
  }, 60_000);
});
