import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { MAX_AGENT_MESSAGES } from "@/lib/chat-simulation/scenarios";

// The chat endpoints: one chat simulation per chat (an unanswered open chat
// is reused), the AI customer answers each message, a failed AI reply saves
// nothing, the closing after the customer is satisfied needs no AI, and the
// chat is marked once. The AI is a stand-in here; the real model was checked separately.
let signedIn: { user: { id: string } } | null = null;
vi.mock("next-auth", () => ({ getServerSession: async () => signedIn }));
const customerReply = vi.fn();
const markChat = vi.fn();
vi.mock("@/lib/providers/gemini-chat-provider", () => ({ createGeminiChatProvider: () => ({ customerReply, markChat }) }));
const start = (await import("@/app/api/chat-simulations/route")).POST;
const list = (await import("@/app/api/chat-simulations/route")).GET;
const message = (await import("@/app/api/chat-simulations/[id]/messages/route")).POST;
const end = (await import("@/app/api/chat-simulations/[id]/end/route")).POST;

const stamp = Date.now();
const users: string[] = [];
process.env.GEMINI_API_KEY ||= "test-key";
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});
async function signIn() {
  const u = await db.user.create({ data: { email: `chat-sim-${stamp}-${users.length}@example.test`, passwordHash: "x", name: "Chat Test" } });
  users.push(u.id);
  signedIn = { user: { id: u.id } };
  return u.id;
}
const req = (body: unknown) => new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const begin = async () => (await (await start(req({ scenarioKey: "card-blocked" }))).json()).chat;
const usage = (userId: string) => db.usageEvent.count({ where: { userId, feature: "CHAT_SIMULATION" } });
const marking = { result: { ratings: { tone: 5, grammar: 4, accuracy: 5, problemSolving: 5, closing: 4 }, strengths: ["Calm."], fixes: ["Close earlier."], betterLine: "Is there anything else I can help with?" }, tokens: { input: 900, output: 200 }, model: "gemini-3.1-flash-lite" };

describe("chat simulation endpoints", () => {
  beforeEach(() => {
    signedIn = null;
    customerReply.mockReset();
    markChat.mockReset();
  });

  it("needs a signed-in user", async () => {
    expect((await start(req({ scenarioKey: "card-blocked" }))).status).toBe(401);
  });

  it("starts with the customer's opening, uses one chat, and reuses an unanswered chat", async () => {
    const me = await signIn();
    const chat = await begin();
    expect(chat.turns).toHaveLength(1);
    expect(chat.turns[0].from).toBe("customer");
    expect(JSON.stringify(chat)).not.toMatch(/offer to give it/); // the private brief never reaches the browser
    const again = await (await start(req({ scenarioKey: "wrong-bill" }))).json();
    expect(again).toMatchObject({ reused: true, chat: { id: chat.id } });
    expect(await usage(me)).toBe(1);
  });

  it("stops at the plan's limit", async () => {
    const me = await signIn();
    for (let i = 0; i < PLAN_LIMITS.FREE.CHAT_SIMULATION; i++) await db.usageEvent.create({ data: { userId: me, feature: "CHAT_SIMULATION" } });
    const res = await start(req({ scenarioKey: "card-blocked" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/used all 1 chat simulation included in your free sample/);
  });

  it("plays a whole chat: reply, satisfied customer, closing without AI, one marking", async () => {
    await signIn();
    const chat = await begin();
    customerReply.mockResolvedValueOnce({ message: "It worked, thank you!", satisfied: true, tokens: { input: 300, output: 20 }, model: "gemini-3.1-flash-lite" });
    let res = await message(req({ text: "Please switch on international use in the app: Cards > Manage." }), ctx(chat.id));
    let body = await res.json();
    expect(body.chat).toMatchObject({ customerSatisfied: true, finished: false });
    expect(body.chat.turns).toHaveLength(3);

    res = await message(req({ text: "Glad to help! Anything else? Have a safe trip." }), ctx(chat.id));
    body = await res.json();
    expect(customerReply).toHaveBeenCalledTimes(1); // the closing needed no AI
    expect(body.chat).toMatchObject({ finished: true });
    expect((await message(req({ text: "One more" }), ctx(chat.id))).status).toBe(409);

    markChat.mockResolvedValue(marking);
    res = await end(req({}), ctx(chat.id));
    body = await res.json();
    expect(body.chat).toMatchObject({ status: "DONE", score: 90, feedback: { fixes: ["Close earlier."] } }); // 5+4+5+5+4 = 23: (23 - 5) / 20 = 90%
    expect(markChat).toHaveBeenCalledTimes(1);
    await end(req({}), ctx(chat.id));
    expect(markChat).toHaveBeenCalledTimes(1); // asking again never marks (or pays) twice
    const listed = await (await list()).json();
    expect(listed.done.map((c: { id: string }) => c.id)).toContain(chat.id);
  });

  it("saves nothing when the AI customer fails, so sending again works", async () => {
    await signIn();
    const chat = await begin();
    customerReply.mockRejectedValueOnce(new Error("Gemini generateContent failed (503): {raw}"));
    const res = await message(req({ text: "Hello Priya, how can I help?" }), ctx(chat.id));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("The customer didn't get your message. Please send it again.");
    const stored = await db.chatSimulation.findUniqueOrThrow({ where: { id: chat.id } });
    expect(JSON.parse(stored.turnsJson)).toHaveLength(1);
  });

  it("stops the customer replying after the last allowed message", async () => {
    await signIn();
    const chat = await begin();
    customerReply.mockResolvedValue({ message: "Hmm, go on.", satisfied: false, tokens: { input: 1, output: 1 }, model: "gemini-3.1-flash-lite" });
    let body;
    for (let i = 0; i < MAX_AGENT_MESSAGES; i++) body = await (await message(req({ text: `Reply ${i + 1}` }), ctx(chat.id))).json();
    expect(customerReply).toHaveBeenCalledTimes(MAX_AGENT_MESSAGES - 1);
    expect(body.chat).toMatchObject({ finished: true, agentMessagesLeft: 0 });
  });

  it("never lets someone else read, write or end a chat, and needs a reply before marking", async () => {
    await signIn();
    const chat = await begin();
    expect((await end(req({}), ctx(chat.id))).status).toBe(400);
    await signIn();
    expect((await message(req({ text: "Hi" }), ctx(chat.id))).status).toBe(404);
    expect((await end(req({}), ctx(chat.id))).status).toBe(404);
    expect(markChat).not.toHaveBeenCalled();
  });
});
