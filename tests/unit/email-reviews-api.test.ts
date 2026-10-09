import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/entitlements";

// The email review endpoint: one AI marking per reply, counted against the
// plan, given back when the AI fails, stored for its owner only. The AI is
// replaced by a stand-in here; the real model was checked separately.
let signedIn: { user: { id: string } } | null = null;
vi.mock("next-auth", () => ({ getServerSession: async () => signedIn }));
const reviewEmail = vi.fn();
vi.mock("@/lib/providers/gemini-email-review-provider", () => ({ createGeminiEmailReviewProvider: () => ({ reviewEmail }) }));
const { POST, GET } = await import("@/app/api/email-reviews/route");

const stamp = Date.now();
const users: string[] = [];
process.env.GEMINI_API_KEY ||= "test-key";
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});
async function user() {
  const u = await db.user.create({ data: { email: `email-review-${stamp}-${users.length}@example.test`, passwordHash: "x", name: "Email Test" } });
  users.push(u.id);
  return u.id;
}
const reply =
  "Dear Sunita, I am sorry your study table is late and that our calls did not help. It is at our local hub and will reach you this Saturday between 10 am and 2 pm. As an apology, your next delivery is free. Please reply if you need anything else. Kind regards, Ravi";
const post = (body: unknown) => POST(new Request("http://localhost/api/email-reviews", { method: "POST", body: JSON.stringify(body) }));
const aiResult = { ratings: { tone: 5, structure: 4, grammar: 5, clarity: 4, resolution: 5 }, strengths: ["Warm apology."], fixes: ["Add the order number."], modelReply: "Dear Sunita, thank you for your patience with your order." };
const usageCount = (userId: string) => db.usageEvent.count({ where: { userId, feature: "EMAIL_REVIEW" } });

describe("POST /api/email-reviews", () => {
  beforeEach(() => {
    signedIn = null;
    reviewEmail.mockReset();
  });

  it("needs a signed-in user", async () => {
    expect((await post({ taskKey: "late-delivery", reply })).status).toBe(401);
  });

  it("marks, scores in code, saves and counts one use", async () => {
    const me = await user();
    signedIn = { user: { id: me } };
    reviewEmail.mockResolvedValue({ result: aiResult, tokenUsage: { textInput: 600, output: 350 }, model: "gemini-3.1-flash-lite" });
    const res = await post({ taskKey: "late-delivery", reply, score: 100 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.review).toMatchObject({ taskKey: "late-delivery", score: 90, fixes: ["Add the order number."] }); // (23 - 5) / 20 = 90
    expect(body.remaining).toBe(PLAN_LIMITS.FREE.EMAIL_REVIEW - 1);
    expect(await usageCount(me)).toBe(1);
    const saved = await db.emailReview.findFirstOrThrow({ where: { userId: me } });
    expect(saved.costUsd).toBeGreaterThan(0);

    const other = await user();
    signedIn = { user: { id: other } };
    expect((await (await GET()).json()).reviews).toEqual([]);
  });

  it("gives the use back and shows a plain sentence when the AI fails", async () => {
    const me = await user();
    signedIn = { user: { id: me } };
    reviewEmail.mockRejectedValue(new Error("Gemini generateContent failed (500): {raw provider body}"));
    const res = await post({ taskKey: "late-delivery", reply });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/^We couldn't mark your email this time/);
    expect(JSON.stringify(body)).not.toContain("Gemini");
    expect(await usageCount(me)).toBe(0);
    expect(await db.emailReview.count({ where: { userId: me } })).toBe(0);
  });

  it("stops at the plan's limit without calling the AI", async () => {
    const me = await user();
    signedIn = { user: { id: me } };
    for (let i = 0; i < PLAN_LIMITS.FREE.EMAIL_REVIEW; i++) await db.usageEvent.create({ data: { userId: me, feature: "EMAIL_REVIEW" } });
    const res = await post({ taskKey: "late-delivery", reply });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/AI email reviews/);
    expect(reviewEmail).not.toHaveBeenCalled();
  });

  it("refuses unknown tasks and replies that are too short or too long, without using an allowance", async () => {
    const me = await user();
    signedIn = { user: { id: me } };
    expect((await post({ taskKey: "made-up", reply })).status).toBe(400);
    expect((await post({ taskKey: "late-delivery", reply: "Sorry, it is coming Saturday." })).status).toBe(400);
    expect((await post({ taskKey: "late-delivery", reply: "word ".repeat(400) })).status).toBe(400);
    expect(await usageCount(me)).toBe(0);
    expect(reviewEmail).not.toHaveBeenCalled();
  });
});
