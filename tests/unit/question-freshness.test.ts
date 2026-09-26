import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { lastSeenByUser, orderByFreshness, pickFresh } from "@/lib/question-freshness";
import { selectQuestionUnits } from "@/lib/exam-runner";

// "Fresh first": every activity serves questions the candidate has never
// met before any repeat, and reuses the least-recently-seen ones only when
// the pool runs out. Integration part runs against the TEST database with
// its own private category, so other test files can't interfere.

const session = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock("next-auth", () => session);

const T = (min: number) => new Date(Date.UTC(2026, 8, 1, 10, min));

describe("fresh-first ordering", () => {
  const pool = ["a", "b", "c", "d", "e"].map((id) => ({ id }));

  it("puts never-seen questions first, then seen ones oldest-first", () => {
    const seen = new Map([["a", T(5)], ["b", T(1)], ["c", T(3)]]);
    const ordered = orderByFreshness(pool, seen).map((q) => q.id);
    expect(new Set(ordered.slice(0, 2))).toEqual(new Set(["d", "e"]));
    expect(ordered.slice(2)).toEqual(["b", "c", "a"]);
    expect(pickFresh(pool, seen, 3).map((q) => q.id).slice(2)).toEqual(["b"]);
    expect(pickFresh(pool, seen, 0)).toEqual([]);
  });

  it("v2 exams draw unseen question units first too", () => {
    const units = [
      { id: "q1", itemGroupId: null, orderInGroup: null },
      { id: "q2", itemGroupId: null, orderInGroup: null },
      { id: "q3", itemGroupId: null, orderInGroup: null },
      { id: "q4", itemGroupId: null, orderInGroup: null },
    ];
    const seen = new Map([["q1", T(1)], ["q2", T(2)]]);
    for (const seed of ["s1", "s2", "s3", "s4"]) {
      expect(new Set(selectQuestionUnits(units, 2, seed, new Set(), seen))).toEqual(new Set(["q3", "q4"]));
    }
    // No history: unchanged behaviour (still a seeded pick of 2).
    expect(selectQuestionUnits(units, 2, "s1", new Set())).toHaveLength(2);
  });
});

describe("no repeats across practice sessions (test database)", { timeout: 120_000 }, () => {
  const run = Date.now();
  const category = `FRESH_TEST_${run}`;
  let userId = "";
  let questionIds: string[] = [];

  beforeAll(async () => {
    const user = await db.user.create({ data: { email: `fresh-${run}@example.test`, passwordHash: "x", name: "Fresh Test" } });
    userId = user.id;
    await db.subscription.create({ data: { userId, plan: "PREMIUM", status: "ACTIVE", currentPeriodStart: new Date(Date.now() - 86_400_000), currentPeriodEnd: new Date(Date.now() + 29 * 86_400_000) } });
    session.getServerSession.mockResolvedValue({ user: { id: userId, email: user.email, role: "CANDIDATE" } });
    for (let i = 0; i < 12; i++) {
      const q = await db.practiceQuestion.create({
        data: { category, difficulty: "BEGINNER", type: "MULTIPLE_CHOICE", prompt: `fresh ${run} #${i}`, options: JSON.stringify(["x", "y", "z"]), correctAnswer: "x", timeLimitSeconds: 30 },
      });
      questionIds.push(q.id);
    }
  }, 60_000);

  afterAll(async () => {
    await db.practiceAttempt.deleteMany({ where: { userId } });
    await db.conversationSession.deleteMany({ where: { userId } });
    await db.usageEvent.deleteMany({ where: { userId } });
    await db.subscription.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });
    await db.practiceQuestion.deleteMany({ where: { id: { in: questionIds } } });
  }, 60_000);

  async function fetchAndAnswer(count: number): Promise<string[]> {
    const { GET } = await import("@/app/api/practice/questions/route");
    const { POST } = await import("@/app/api/practice/attempts/route");
    const res = await GET(new Request(`http://localhost/api/practice/questions?category=${category}&difficulty=BEGINNER&count=${count}`));
    expect(res.status).toBe(200);
    const { questions } = (await res.json()) as { questions: { id: string }[] };
    for (const q of questions) {
      await POST(new Request("http://localhost/api/practice/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, responseText: "x", timeTakenSeconds: 3 }),
      }));
      await new Promise((r) => setTimeout(r, 5)); // distinct timestamps
    }
    return questions.map((q) => q.id);
  }

  it("serves every question once before repeating any, then brings back the oldest first", async () => {
    const first = await fetchAndAnswer(5);
    const second = await fetchAndAnswer(5);
    expect(new Set([...first, ...second]).size).toBe(10); // no repeats in 10 of 12

    const third = await fetchAndAnswer(5);
    const neverSeen = questionIds.filter((id) => !first.includes(id) && !second.includes(id));
    expect(neverSeen).toHaveLength(2);
    for (const id of neverSeen) expect(third).toContain(id); // the last 2 unseen come first
    const repeats = third.filter((id) => !neverSeen.includes(id));
    expect(repeats).toHaveLength(3);
    for (const id of repeats) expect(first).toContain(id); // repeats come from the OLDEST session
  });

  it("counts a question as seen when it came from any activity", async () => {
    const q = questionIds[0];
    await db.conversationSession.create({ data: { userId, role: "CUSTOMER", questionId: q } });
    const seen = await lastSeenByUser(userId, [q, questionIds[1]]);
    expect(seen.has(q)).toBe(true);
  });
});
