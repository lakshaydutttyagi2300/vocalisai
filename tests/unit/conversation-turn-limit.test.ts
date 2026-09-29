import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

// An Interview Simulation is charged once, at start; every candidate turn
// is then a paid transcription. Paid plans used to accept turns without
// end (only the AI reply stopped at the maximum). Providers and storage
// are mocked - nothing here calls Groq or Gemini.
const session = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock("next-auth", () => session);
const groq = vi.hoisted(() => ({
  transcribe: vi.fn(async () => ({ transcript: "hello there", segments: [], durationSeconds: 3, providerName: "g", model: "m" })),
}));
vi.mock("@/lib/providers/groq-whisper-provider", () => ({ createGroqWhisperProvider: () => groq }));
const gemini = vi.hoisted(() => ({ generateNextTurn: vi.fn(async () => ({ text: "next question" })) }));
vi.mock("@/lib/providers/gemini-conversation-provider", () => ({ createGeminiConversationProvider: () => gemini }));
vi.mock("@/lib/storage", () => ({ readRecording: vi.fn(async () => Buffer.from("x")) }));

const { setPlan } = await import("@/lib/entitlements");
const { POST: postTurn } = await import("@/app/api/conversations/[id]/turns/route");

const run = Date.now();
const userIds: string[] = [];

async function setup(key: string, plan: "FREE" | "STARTER") {
  const u = await db.user.create({ data: { email: `convo-limit-${key}-${run}@example.test`, passwordHash: "x", name: key } });
  userIds.push(u.id);
  if (plan !== "FREE") await setPlan(u.id, plan);
  const convo = await db.conversationSession.create({
    data: { userId: u.id, role: "INTERVIEWER", turns: { create: [{ turnIndex: 0, speaker: "ai", text: "Tell me about yourself" }] } },
  });
  const rec = await db.practiceRecording.create({ data: { userId: u.id, filePath: `recordings/${u.id}/t.webm`, mimeType: "audio/webm" } });
  session.getServerSession.mockResolvedValue({ user: { id: u.id, role: "CANDIDATE" } });
  return { convoId: convo.id, recordingId: rec.id };
}

async function sendTurns(convoId: string, recordingId: string, count: number) {
  const out: { status: number; reachedMaxTurns?: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    const res = await postTurn(
      new Request("http://localhost/x", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recordingId }) }),
      { params: Promise.resolve({ id: convoId }) }
    );
    const body = await res.json();
    out.push({ status: res.status, reachedMaxTurns: body.reachedMaxTurns });
  }
  return out;
}

const savedKeys = { groq: process.env.GROQ_API_KEY, gemini: process.env.GEMINI_API_KEY };
beforeAll(() => {
  process.env.GROQ_API_KEY = "test-not-used";
  process.env.GEMINI_API_KEY = "test-not-used";
});
beforeEach(() => vi.clearAllMocks());
afterAll(async () => {
  for (const [name, value] of [["GROQ_API_KEY", savedKeys.groq], ["GEMINI_API_KEY", savedKeys.gemini]] as const) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  await db.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("Interview Simulation turn limit", () => {
  it("a paid conversation takes 4 candidate turns, then refuses more without transcribing", async () => {
    const s = await setup("paid", "STARTER");
    const results = await sendTurns(s.convoId, s.recordingId, 6);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 400, 400]);
    expect(results[3].reachedMaxTurns).toBe(true);
    expect(groq.transcribe).toHaveBeenCalledTimes(4);
    expect(gemini.generateNextTurn).toHaveBeenCalledTimes(3); // no AI reply after the last turn
  }, 120_000);

  it("the FREE sample still stops at 3 with the upgrade message", async () => {
    const s = await setup("free", "FREE");
    const results = await sendTurns(s.convoId, s.recordingId, 4);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 403]);
    expect(results[2].reachedMaxTurns).toBe(true);
    expect(groq.transcribe).toHaveBeenCalledTimes(3);
  }, 120_000);
});
