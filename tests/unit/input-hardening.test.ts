import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

// Bugs found in the 23 Oct 2026 review: a bad event in a proctoring batch
// lost the whole batch (server error), a non-text recording id crashed the
// interview turn, and an interview with no scenarios still used the
// allowance. Providers are mocked; nothing calls Groq or Gemini.
let signedIn: { user: { id: string; role: string } } | null = null;
vi.mock("next-auth", () => ({ getServerSession: async () => signedIn }));
const { POST: postEvents } = await import("@/app/api/mock-tests/sessions/[id]/events/route");
const { POST: postTurn } = await import("@/app/api/conversations/[id]/turns/route");
const { POST: startConversation } = await import("@/app/api/conversations/route");
const { setPlan } = await import("@/lib/entitlements");

const stamp = Date.now();
const users: string[] = [];
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});
async function signIn() {
  const u = await db.user.create({ data: { email: `hardening-${stamp}-${users.length}@example.test`, passwordHash: "x", name: "Hardening" } });
  users.push(u.id);
  signedIn = { user: { id: u.id, role: "CANDIDATE" } };
  return u.id;
}
const post = (body: unknown) => new Request("http://localhost/x", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("proctoring events", () => {
  beforeEach(() => {
    signedIn = null;
  });

  it("keeps a batch when one event has a bad time or detail", async () => {
    const me = await signIn();
    const s = await db.mockTestSession.create({ data: { userId: me } });
    const res = await postEvents(
      post({
        events: [
          { eventType: "TAB_HIDDEN", occurredAt: "not a date" },
          { eventType: "TAB_HIDDEN", detail: { nested: true }, occurredAt: "1970-01-01T00:00:00Z" },
          { eventType: "TAB_HIDDEN", detail: "x".repeat(2000) },
          { eventType: "NOT_A_REAL_EVENT" },
        ],
      }),
      ctx(s.id),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).saved).toBe(3);
    const rows = await db.proctoringEvent.findMany({ where: { sessionId: s.id } });
    expect(rows).toHaveLength(3);
    for (const r of rows) expect(Math.abs(r.occurredAt.getTime() - Date.now())).toBeLessThan(60_000);
    expect(rows.map((r) => r.detail?.length ?? 0).sort((a, b) => a - b)).toEqual([0, 0, 500]);
  });

  it("refuses a huge batch", async () => {
    const me = await signIn();
    const s = await db.mockTestSession.create({ data: { userId: me } });
    const res = await postEvents(post({ events: Array.from({ length: 201 }, () => ({ eventType: "TAB_HIDDEN" })) }), ctx(s.id));
    expect(res.status).toBe(400);
  });
});

describe("interview simulation", () => {
  it("answers a non-text recording id with a plain 400, not a crash", async () => {
    const me = await signIn();
    const convo = await db.conversationSession.create({ data: { userId: me, role: "INTERVIEWER", turns: { create: [{ turnIndex: 0, speaker: "ai", text: "Hi" }] } } });
    const res = await postTurn(post({ recordingId: { id: "x" } }), ctx(convo.id));
    expect(res.status).toBe(400);
  });

  it("does not use the allowance when no scenario exists for the choice", async () => {
    const me = await signIn();
    await setPlan(me, "PREMIUM"); // every level, so the request reaches the scenario lookup
    const lookup = vi.spyOn(db.practiceQuestion, "findMany").mockResolvedValueOnce([]); // no scenario for this choice
    const res = await startConversation(post({ role: "INTERVIEWER", difficulty: "EXPERT" }));
    lookup.mockRestore();
    expect(res.status).toBe(404);
    expect(await db.usageEvent.count({ where: { userId: me, feature: "INTERVIEW_SIMULATION" } })).toBe(0);
  });
});
