import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import type { DeskTicket } from "@/lib/ticket-handling/desk";

// The support desk endpoints: one open shift per candidate, holds only on
// their own shift, and a marked ticket from the shift is resolved there
// with its score. The AI marking is a stand-in.
let signedIn: { user: { id: string } } | null = null;
vi.mock("next-auth", () => ({ getServerSession: async () => signedIn }));
const reviewTicket = vi.fn();
vi.mock("@/lib/providers/gemini-ticket-provider", () => ({ createGeminiTicketProvider: () => ({ reviewTicket }) }));
const shifts = await import("@/app/api/desk-shifts/route");
const hold = (await import("@/app/api/desk-shifts/[id]/tickets/[key]/route")).POST;
const review = (await import("@/app/api/ticket-reviews/route")).POST;

const stamp = Date.now();
const users: string[] = [];
process.env.GEMINI_API_KEY ||= "test-key";
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});
async function signIn() {
  const u = await db.user.create({ data: { email: `desk-${stamp}-${users.length}@example.test`, passwordHash: "x", name: "Desk Test" } });
  users.push(u.id);
  signedIn = { user: { id: u.id } };
  return u.id;
}
const req = (body: unknown) => new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body) });
const start = async () => (await (await shifts.POST()).json()).shift as { id: string; tickets: DeskTicket[] };
const reply = "Dear customer, thank you for writing to us and I am sorry for the trouble. I have checked your account and taken the next step, and you will hear from us within one working day. Kind regards, Support";
const note = "Checked the account, explained the next step and set a follow-up for tomorrow morning.";

describe("support desk endpoints", () => {
  beforeEach(() => {
    signedIn = null;
    reviewTicket.mockReset();
  });

  it("needs a signed-in user", async () => {
    expect((await shifts.GET()).status).toBe(401);
    expect((await shifts.POST()).status).toBe(401);
  });

  it("starts one shift at a time, and shows it back", async () => {
    const me = await signIn();
    const first = await start();
    expect(first.tickets).toHaveLength(5);
    const second = await start();
    expect(second.id).not.toBe(first.id);
    expect(await db.deskShift.count({ where: { userId: me, endedAt: null } })).toBe(1);
    expect((await (await shifts.GET()).json()).shift.id).toBe(second.id);
  });

  it("holds and resumes a ticket on the candidate's own shift only", async () => {
    await signIn();
    const shift = await start();
    const key = shift.tickets[0].key;
    const ctx = { params: Promise.resolve({ id: shift.id, key }) };
    let body = await (await hold(req({ action: "hold" }), ctx)).json();
    expect(body.tickets.find((t: DeskTicket) => t.key === key).status).toBe("on_hold");
    body = await (await hold(req({ action: "resume" }), ctx)).json();
    expect(body.tickets.find((t: DeskTicket) => t.key === key).status).toBe("open");
    await signIn();
    expect((await hold(req({ action: "hold" }), ctx)).status).toBe(404);
  });

  it("resolves a marked ticket in the shift with its score, and shows it in happiness", async () => {
    await signIn();
    const shift = await start();
    const key = shift.tickets[1].key;
    reviewTicket.mockResolvedValue({
      result: { ratings: { category: 5, priority: 5, reply: 4, note: 4, accuracy: 5 }, bestCategory: "Delivery", bestPriority: "High", priorityReason: "Time-sensitive.", strengths: ["Clear."], fixes: ["Add a time."], modelNote: "Done and noted." },
      tokens: { input: 600, output: 200 },
      model: "gemini-3.1-flash-lite",
    });
    const res = await review(req({ ticketKey: key, category: "Delivery", priority: "High", reply, note, shiftId: shift.id }));
    expect(res.status).toBe(200);
    const stored = JSON.parse((await db.deskShift.findUniqueOrThrow({ where: { id: shift.id } })).ticketsJson) as DeskTicket[];
    expect(stored.find((t) => t.key === key)).toMatchObject({ status: "resolved", score: 90 });
    expect(stored.filter((t) => t.status === "resolved")).toHaveLength(1);
    expect((await (await shifts.GET()).json()).recentScores).toEqual([90]);
  });

  it("never resolves a ticket in someone else's shift", async () => {
    await signIn();
    const shift = await start();
    await signIn();
    reviewTicket.mockResolvedValue({
      result: { ratings: { category: 3, priority: 3, reply: 3, note: 3, accuracy: 3 }, bestCategory: "Delivery", bestPriority: "Low", priorityReason: "Not urgent.", strengths: ["Polite."], fixes: ["More detail."], modelNote: "Noted." },
      tokens: { input: 1, output: 1 },
      model: "gemini-3.1-flash-lite",
    });
    expect((await review(req({ ticketKey: shift.tickets[0].key, category: "Delivery", priority: "Low", reply, note, shiftId: shift.id }))).status).toBe(200);
    const stored = JSON.parse((await db.deskShift.findUniqueOrThrow({ where: { id: shift.id } })).ticketsJson) as DeskTicket[];
    expect(stored.every((t) => t.status === "open")).toBe(true);
  });
});
