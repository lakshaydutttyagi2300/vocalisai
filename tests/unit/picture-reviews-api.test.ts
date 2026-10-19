import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

// The picture writing endpoint: signed-in only, checks the length, marks once
// per attempt (a double submit is not charged twice) and gives the allowance
// back when the AI fails. The AI marking is a stand-in.
let signedIn: { user: { id: string } } | null = null;
vi.mock("next-auth", () => ({ getServerSession: async () => signedIn }));
const reviewPicture = vi.fn();
vi.mock("@/lib/providers/gemini-picture-review-provider", () => ({ createGeminiPictureReviewProvider: () => ({ reviewPicture }) }));
const { GET, POST } = await import("@/app/api/picture-reviews/route");

const stamp = Date.now();
const users: string[] = [];
process.env.GEMINI_API_KEY ||= "test-key";
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});
async function signIn() {
  const u = await db.user.create({ data: { email: `picture-${stamp}-${users.length}@example.test`, passwordHash: "x", name: "Picture Test" } });
  users.push(u.id);
  signedIn = { user: { id: u.id } };
  return u.id;
}
const req = (body: unknown) => new Request("http://localhost/api/picture-reviews", { method: "POST", body: JSON.stringify(body) });
const text = "A young woman is paying at a café counter. The barista in a black apron is smiling and taking her card. It looks like a busy morning and next she will get her coffee and leave.";
const marking = {
  result: { ratings: { clarity: 4, grammar: 4, interpretation: 5, detail: 3, professionalism: 4 }, strengths: ["Clear and logical."], fixes: ["Mention the card machine."], missedDetails: ["card machine"], modelAnswer: "A customer is paying for her order at a café counter while a smiling barista serves her." },
  tokenUsage: { textInput: 500, output: 200 },
  model: "gemini-3.1-flash-lite",
};
const used = (userId: string) => db.usageEvent.count({ where: { userId, feature: "PICTURE_REVIEW" } });

describe("picture reviews endpoint", () => {
  beforeEach(() => {
    signedIn = null;
    reviewPicture.mockReset();
  });

  it("needs a signed-in user", async () => {
    expect((await POST(req({}))).status).toBe(401);
    expect((await GET()).status).toBe(401);
  });

  it("refuses an unknown photo or a too-short text without using the allowance", async () => {
    const me = await signIn();
    expect((await POST(req({ promptKey: "nope", attemptKey: "attempt-0001", response: text }))).status).toBe(400);
    const short = await POST(req({ promptKey: "cafe-payment", attemptKey: "attempt-0002", response: "Two people." }));
    expect(short.status).toBe(400);
    expect((await short.json()).error).toMatch(/at least 20 words/);
    expect(reviewPicture).not.toHaveBeenCalled();
    expect(await used(me)).toBe(0);
  });

  it("marks once per attempt, with the score worked out from the ratings", async () => {
    const me = await signIn();
    reviewPicture.mockResolvedValue(marking);
    const first = await POST(req({ promptKey: "cafe-payment", attemptKey: "attempt-1001", response: text, timedOut: true }));
    expect(first.status).toBe(200);
    const body = await first.json();
    expect(body.review).toMatchObject({ promptKey: "cafe-payment", score: 75, timedOut: true, response: text, missedDetails: ["card machine"] });
    // The same attempt again (a click as the timer ran out): the saved review, no second marking or charge.
    const again = await POST(req({ promptKey: "cafe-payment", attemptKey: "attempt-1001", response: text, timedOut: false }));
    expect((await again.json()).review.id).toBe(body.review.id);
    expect(reviewPicture).toHaveBeenCalledTimes(1);
    expect(await used(me)).toBe(1);
    expect((await (await GET()).json()).reviews).toHaveLength(1);
  });

  it("gives the allowance back when the AI fails", async () => {
    const me = await signIn();
    reviewPicture.mockRejectedValue(new Error("Gemini down"));
    const res = await POST(req({ promptKey: "site-team", attemptKey: "attempt-2001", response: text }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/wasn't used/);
    expect(await used(me)).toBe(0);
  });
});
