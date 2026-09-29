import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

// A mock assessment is charged once at the start, so its answers skip the
// per-answer usage check. It must never take more answers than it has
// questions, or the score page would pay for AI analysis of every extra one.
const session = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock("next-auth", () => session);

const { POST } = await import("@/app/api/practice/attempts/route");

const run = Date.now();
let userId = "";
let questionId = "";
let templateId = "";

function answer(mockTestSessionId: string) {
  return POST(
    new Request("http://localhost/api/practice/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, responseText: "b", timeTakenSeconds: 5, mockTestSessionId }),
    }),
  );
}

async function newSession(endedMinutesAgo: number | null = null) {
  const endedAt = endedMinutesAgo === null ? null : new Date(Date.now() - endedMinutesAgo * 60_000);
  return (await db.mockTestSession.create({ data: { userId, templateId, endedAt } })).id;
}

beforeAll(async () => {
  userId = (await db.user.create({ data: { email: `mock-limit-${run}@example.test`, passwordHash: "x", name: "Mock Limit" } })).id;
  questionId = (
    await db.practiceQuestion.create({
      data: { category: "GRAMMAR", difficulty: "BEGINNER", type: "MULTIPLE_CHOICE", prompt: `mock limit ${run}`, options: JSON.stringify(["a", "b"]), correctAnswer: "a", timeLimitSeconds: 30, isActive: false },
    })
  ).id;
  templateId = (
    await db.mockTestTemplate.create({
      data: {
        name: `mock-limit-${run}`,
        sections: { create: [ { order: 1, category: "GRAMMAR", difficulty: "BEGINNER", questionCount: 1 }, { order: 2, category: "GRAMMAR", difficulty: "BEGINNER", questionCount: 1 } ] },
      },
    })
  ).id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: userId } }); // cascades sessions and attempts
  await db.mockTestTemplate.deleteMany({ where: { id: templateId } });
  await db.practiceQuestion.deleteMany({ where: { id: questionId } });
});

beforeEach(() => {
  session.getServerSession.mockResolvedValue({ user: { id: userId, email: `mock-limit-${run}@example.test`, role: "CANDIDATE" } });
});

describe("answers attached to a mock assessment", () => {
  it("are accepted up to the template's question count, then refused", async () => {
    const id = await newSession();
    expect((await answer(id)).status).toBe(200);
    expect((await answer(id)).status).toBe(200);
    const third = await answer(id);
    expect(third.status).toBe(409);
    expect(await db.practiceAttempt.count({ where: { mockTestSessionId: id } })).toBe(2);
  });

  it("can't exceed the limit by being sent in parallel", async () => {
    const id = await newSession();
    const statuses = (await Promise.all(Array.from({ length: 6 }, () => answer(id)))).map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(2);
    expect(await db.practiceAttempt.count({ where: { mockTestSessionId: id } })).toBe(2);
  }, 60_000);

  it("are still accepted just after the assessment ends (last upload), but not long after", async () => {
    expect((await answer(await newSession(1))).status).toBe(200);
    const late = await answer(await newSession(30));
    expect(late.status).toBe(409);
    expect((await late.json()).error).toMatch(/already ended/);
  });
});
