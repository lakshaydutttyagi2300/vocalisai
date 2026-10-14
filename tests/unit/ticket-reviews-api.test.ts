import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/entitlements";

// The ticket review endpoint: one AI marking per ticket, counted against the
// plan, given back when the AI fails, stored for its owner only. The AI is a
// stand-in here; the real model was checked separately.
let signedIn: { user: { id: string } } | null = null;
vi.mock("next-auth", () => ({ getServerSession: async () => signedIn }));
const reviewTicket = vi.fn();
vi.mock("@/lib/providers/gemini-ticket-provider", () => ({ createGeminiTicketProvider: () => ({ reviewTicket }) }));
const { POST, GET } = await import("@/app/api/ticket-reviews/route");

const stamp = Date.now();
const users: string[] = [];
process.env.GEMINI_API_KEY ||= "test-key";
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});
async function signIn() {
  const u = await db.user.create({ data: { email: `ticket-review-${stamp}-${users.length}@example.test`, passwordHash: "x", name: "Ticket Test" } });
  users.push(u.id);
  signedIn = { user: { id: u.id } };
  return u.id;
}
const answer = {
  ticketKey: "change-delivery-address",
  category: "Delivery",
  priority: "Low",
  reply: "Dear Aisha, thank you for letting us know about your move. Your order has not been packed yet, so we can change the address. Please reply with your full new address and we will update it straight away. Kind regards, Support",
  note: "Order KT-20931 not packed. Asked customer for full new address; update before packing.",
};
const post = (body: unknown) => POST(new Request("http://localhost/api/ticket-reviews", { method: "POST", body: JSON.stringify(body) }));
const ai = { ratings: { category: 5, priority: 4, reply: 5, note: 4, accuracy: 5 }, bestCategory: "Delivery", bestPriority: "Low", priorityReason: "Delivery is next week.", strengths: ["Clear next step."], fixes: ["Mention the packing deadline."], modelNote: "Order not packed; awaiting new address." };
const usage = (userId: string) => db.usageEvent.count({ where: { userId, feature: "TICKET_REVIEW" } });

describe("POST /api/ticket-reviews", () => {
  beforeEach(() => {
    signedIn = null;
    reviewTicket.mockReset();
  });

  it("needs a signed-in user", async () => {
    expect((await post(answer)).status).toBe(401);
  });

  it("marks, scores in code, saves and counts one use, for its owner only", async () => {
    const me = await signIn();
    reviewTicket.mockResolvedValue({ result: ai, tokens: { input: 650, output: 250 }, model: "gemini-3.1-flash-lite" });
    const res = await post({ ...answer, score: 100 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.review).toMatchObject({ ticketKey: "change-delivery-address", category: "Delivery", priority: "Low", score: 90, bestPriority: "Low" }); // 23 of 25 -> 90
    expect(body.remaining).toBe(PLAN_LIMITS.FREE.TICKET_REVIEW - 1);
    expect(await usage(me)).toBe(1);
    await signIn();
    expect((await (await GET()).json()).reviews).toEqual([]);
  });

  it("gives the use back and shows a plain sentence when the AI fails", async () => {
    const me = await signIn();
    reviewTicket.mockRejectedValue(new Error("Gemini generateContent failed (500): {raw}"));
    const res = await post(answer);
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("Gemini");
    expect(await usage(me)).toBe(0);
  });

  it("stops at the plan's limit without calling the AI", async () => {
    const me = await signIn();
    for (let i = 0; i < PLAN_LIMITS.FREE.TICKET_REVIEW; i++) await db.usageEvent.create({ data: { userId: me, feature: "TICKET_REVIEW" } });
    const res = await post(answer);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/AI ticket reviews/);
    expect(reviewTicket).not.toHaveBeenCalled();
  });

  it("refuses made-up categories, a missing note or a too-short reply, without using an allowance", async () => {
    const me = await signIn();
    expect((await post({ ...answer, category: "Shipping" })).status).toBe(400);
    expect((await post({ ...answer, priority: "Critical" })).status).toBe(400);
    expect((await post({ ...answer, note: "Done." })).status).toBe(400);
    expect((await post({ ...answer, reply: "We will fix it." })).status).toBe(400);
    expect(await usage(me)).toBe(0);
    expect(reviewTicket).not.toHaveBeenCalled();
  });
});
