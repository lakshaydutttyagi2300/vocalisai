import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { skillRows } from "@/lib/skills/taxonomy";
import { mapLegacyQuestion } from "@/lib/skills/legacy-mapping";
import {
  attemptCredit,
  bandFor,
  computeMastery,
  difficultyFactor,
  selfAndAncestors,
  type MasteryAttempt,
} from "@/lib/skills/mastery";
import { drillTokenCovers, issueDrillToken } from "@/lib/skills/drill-token";
import { speechOverallScore } from "@/lib/skills/mastery-store";
import { bankKey, starterQuestions, seedStarterContent, difficultyForLevel } from "../../prisma/seed-skills-content.mjs";

// Skills platform, Phase 2: mastery maths, the starter question bank, the
// one-charge-per-drill token, and the drill -> answer -> mastery flow
// against the TEST database (routes called directly, session mocked).

const session = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock("next-auth", () => session);

const NOW = new Date("2026-09-26T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);
const att = (credit: number, level: number | null, d = 0): MasteryAttempt => ({ credit, level, at: daysAgo(d) });

describe("mastery score", () => {
  it("is 100 for all-correct, 0 for all-wrong", () => {
    expect(computeMastery([att(1, 3), att(1, 3), att(1, 3)], NOW).score).toBe(100);
    expect(computeMastery([att(0, 3), att(0, 3)], NOW).score).toBe(0);
    expect(computeMastery([], NOW)).toMatchObject({ score: 0, band: "UNRATED", attempts: 0 });
  });

  it("weights recent answers more than old ones", () => {
    const improving = computeMastery([att(0, 3, 60), att(0, 3, 60), att(1, 3, 0), att(1, 3, 0)], NOW);
    const slipping = computeMastery([att(1, 3, 60), att(1, 3, 60), att(0, 3, 0), att(0, 3, 0)], NOW);
    expect(improving.score).toBeGreaterThan(80);
    expect(slipping.score).toBeLessThan(20);
  });

  it("gives more credit for harder questions (and forgives hard misses more)", () => {
    const hardRight = computeMastery([att(1, 5), att(0, 1)], NOW);
    const easyRight = computeMastery([att(1, 1), att(0, 5)], NOW);
    expect(hardRight.score).toBeGreaterThan(easyRight.score);
    expect(difficultyFactor(1)).toBeLessThan(difficultyFactor(6));
    expect(difficultyFactor(null)).toBe(difficultyFactor(3));
  });

  it("uses the spec's bands, with a 5-answer minimum and Mastered needing 2+ levels", () => {
    expect(bandFor(95, 4, 3)).toBe("UNRATED");
    expect(bandFor(49.9, 5, 1)).toBe("WEAK");
    expect(bandFor(50, 5, 1)).toBe("DEVELOPING");
    expect(bandFor(74.9, 5, 1)).toBe("DEVELOPING");
    expect(bandFor(75, 5, 1)).toBe("PROFICIENT");
    expect(bandFor(89.9, 5, 2)).toBe("PROFICIENT");
    expect(bandFor(90, 5, 2)).toBe("MASTERED");
    expect(bandFor(95, 9, 1)).toBe("PROFICIENT");
  });

  it("only counts the latest 50 answers", () => {
    const old = Array.from({ length: 60 }, () => att(0, 3, 30));
    const recent = Array.from({ length: 50 }, () => att(1, 3, 1));
    expect(computeMastery([...old, ...recent], NOW)).toMatchObject({ score: 100, attempts: 50 });
  });

  it("rolls up to parents and reads AI-scored answers as partial credit", () => {
    expect(selfAndAncestors("ENG.GRM.TENSES")).toEqual(["ENG.GRM.TENSES", "ENG.GRM", "ENG"]);
    expect(attemptCredit({ isCorrect: true, score: 100 })).toBe(1);
    expect(attemptCredit({ isCorrect: false, score: 0 })).toBe(0);
    expect(attemptCredit({ isCorrect: null, score: 65 })).toBe(0.65);
    expect(attemptCredit({ isCorrect: null, score: null })).toBeNull();
  });

  it("scores a voice analysis exactly like the results page's Overall (5 ratings + pace)", () => {
    const ai = JSON.stringify({
      pronunciation: { rating: "strong" },
      fluency: { rating: "adequate" },
      grammar: { rating: "adequate" },
      vocabulary: { rating: "weak" },
      voiceClarity: { rating: "strong" },
    });
    // (90 + 65 + 65 + 35 + 90 + 100) / 6 = 74.17
    expect(speechOverallScore({ aiAnalysisJson: ai, paceClassification: "balanced" })).toBe(74);
    expect(speechOverallScore({ aiAnalysisJson: "not json", paceClassification: "balanced" })).toBeNull();
    expect(speechOverallScore(null)).toBeNull();
  });
});

describe("question bank content", () => {
  const bank = starterQuestions();
  const mcqs = bank.filter((q) => q.type === "MULTIPLE_CHOICE");
  const prompts = bank.filter((q) => q.type !== "MULTIPLE_CHOICE");
  const skills = new Map(skillRows().map((r) => [r.id, r]));

  it("is large, deterministic, has no duplicates, and only uses real practice categories", () => {
    expect(bank.length).toBeGreaterThanOrEqual(2000);
    expect(JSON.stringify(starterQuestions())).toBe(JSON.stringify(bank)); // same bank every run
    expect(new Set(bank.map(bankKey)).size).toBe(bank.length);
    for (const c of new Set(bank.map((q) => q.category))) expect(PRACTICE_MODES.some((m) => m.category === c), c).toBe(true);
    // Every level of the three aptitude areas has enough questions for many sessions without repeats.
    for (const c of ["NUMERICAL_APTITUDE", "LOGICAL_REASONING", "VERBAL_REASONING"]) {
      for (const d of ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]) {
        expect(mcqs.filter((q) => q.category === c && q.difficulty === d).length, `${c}/${d}`).toBeGreaterThanOrEqual(15);
      }
    }
  });

  it("tags every question with an exact, enabled skill and a level that matches its difficulty", () => {
    for (const q of bank) {
      const s = skills.get(q.skillId);
      expect(s, q.skillId).toBeTruthy();
      expect(s!.depth, q.skillId).toBe(3);
      expect(s!.enabled).toBe(true);
      expect(q.level).toBeGreaterThanOrEqual(1);
      expect(q.level).toBeLessThanOrEqual(6);
      expect(q.difficulty).toBe(difficultyForLevel(q.level));
      expect(["MULTIPLE_CHOICE", "SHORT_ANSWER"]).toContain(q.type);
      expect(q).toMatchObject({ skillPrecision: "skill", skillSource: "author", bankStatus: "live" });
    }
  });

  it("open prompts have no fixed answer; read-aloud prompts carry the exact text to read", () => {
    expect(prompts.length).toBeGreaterThanOrEqual(250);
    for (const q of prompts) {
      expect(q.options, q.prompt).toBeNull();
      expect(q.correctAnswer, q.prompt).toBeNull();
      expect(q.scoringCriteria, q.prompt).toBeTruthy();
      if (q.category === "READING") expect(q.expectedAnswer).toBe(q.passage);
    }
  });

  it("every MCQ: answer is one of 3-4 distinct options; every wrong option has a reason", () => {
    for (const q of mcqs) {
      const options = JSON.parse(q.options!) as string[];
      const reasons = JSON.parse(q.distractorReasons!) as Record<string, string>;
      expect(options.length, q.prompt).toBeGreaterThanOrEqual(3);
      expect(options.length, q.prompt).toBeLessThanOrEqual(4);
      expect(new Set(options).size, q.prompt).toBe(options.length);
      expect(options, q.prompt).toContain(q.correctAnswer);
      expect(Object.keys(reasons).sort(), q.prompt).toEqual(options.filter((o) => o !== q.correctAnswer).sort());
      for (const r of Object.values(reasons)) expect(r.length).toBeGreaterThan(10);
      for (const o of options) expect(o, q.prompt).not.toMatch(/NaN|undefined|Infinity|null/);
      expect(q.explanation!.length).toBeGreaterThan(10);
      expect(`${q.prompt} ${q.explanation}`, q.prompt).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it("puzzle answers are really unique: re-solving each seating/floor/schedule puzzle gives one answer", () => {
    const perms = (a: number[]): number[][] => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
    const floors = mcqs.filter((q) => q.skillId === "REA.ARR.PUZZLES");
    expect(floors.length).toBeGreaterThan(10);
    for (const q of floors) {
      const names = q.prompt.split(" each live on")[0].replace(" and ", ", ").split(", ");
      const clues = q.prompt.split("the top). ")[1].split(/(?<=\.) /).slice(0, -1);
      const floorOf = (p: number[], n: string) => p[names.indexOf(n)] + 1;
      const ok = (p: number[]) =>
        clues.every((c) => {
          let m;
          if ((m = c.match(/^(\w+) lives on the top floor\.$/))) return floorOf(p, m[1]) === 5;
          if ((m = c.match(/^(\w+) lives on the ground floor\.$/))) return floorOf(p, m[1]) === 1;
          if ((m = c.match(/^(\w+) lives on an even-numbered floor\.$/))) return floorOf(p, m[1]) % 2 === 0;
          if ((m = c.match(/^(\w+) lives on an odd-numbered floor\.$/))) return floorOf(p, m[1]) % 2 === 1;
          if ((m = c.match(/^(\w+) lives on the floor immediately above (\w+)\.$/))) return floorOf(p, m[1]) === floorOf(p, m[2]) + 1;
          if ((m = c.match(/^(\w+) lives somewhere below (\w+)\.$/))) return floorOf(p, m[1]) < floorOf(p, m[2]);
          if ((m = c.match(/^There (?:is exactly one floor|are exactly (\d+) floors) between (\w+) and (\w+)\.$/)))
            return Math.abs(floorOf(p, m[2]) - floorOf(p, m[3])) - 1 === (m[1] ? Number(m[1]) : 1);
          throw new Error(`unparsed clue: ${c}`);
        });
      const sols = perms([0, 1, 2, 3, 4]).filter(ok);
      expect(sols.length, q.prompt).toBe(1);
      const ask = q.prompt.match(/On which floor does (\w+) live\?$/);
      const who = q.prompt.match(/Who lives on floor (\d)\?$/);
      if (ask) expect(q.correctAnswer).toBe(`Floor ${floorOf(sols[0], ask[1])}`);
      if (who) expect(q.correctAnswer).toBe(names.find((n) => floorOf(sols[0], n) === Number(who[1])));
    }
  });

  it("computed answers are really correct (spot-checks recomputed from the question text)", () => {
    const percentOf = bank.filter((q) => /^What is \d+% of \d+\?$/.test(q.prompt));
    expect(percentOf.length).toBeGreaterThan(0);
    for (const q of percentOf) {
      const [, p, n] = q.prompt.match(/^What is (\d+)% of (\d+)\?$/)!.map(Number);
      expect(Number(q.correctAnswer)).toBeCloseTo((p * n) / 100);
    }
    const together = bank.filter((q) => q.prompt.startsWith("Asha can finish a task in"));
    expect(together.length).toBeGreaterThan(0);
    for (const q of together) {
      const [a, b] = q.prompt.match(/\d+/g)!.map(Number);
      expect(parseFloat(q.correctAnswer!)).toBeCloseTo((a * b) / (a + b), 1);
    }
    const series = bank.filter((q) => q.skillId === "REA.SER.NUM" && q.explanation!.includes("add "));
    for (const q of series) {
      const nums = q.prompt.match(/-?\d+/g)!.map(Number);
      const d = nums[1] - nums[0];
      if (nums.slice(1).every((n, i) => n - nums[i] === d)) expect(Number(q.correctAnswer)).toBe(nums[nums.length - 1] + d);
    }
  });

  it("contains no coding or personality content", () => {
    const text = JSON.stringify(bank).toLowerCase();
    for (const banned of ["programming", "python", "javascript", "personality"]) expect(text).not.toContain(banned);
  });

  it("the new practice categories map onto the skill tree", () => {
    for (const c of ["NUMERICAL_APTITUDE", "LOGICAL_REASONING", "VERBAL_REASONING"]) {
      expect(mapLegacyQuestion({ category: c, type: "MULTIPLE_CHOICE" })).toBeTruthy();
    }
  });
});

describe("drill token (one charge per drill)", () => {
  it("covers only the served questions, for the same user, until it expires", () => {
    const t = issueDrillToken("user_a", ["q1", "q2"], 1_000)!;
    expect(t).toBeTruthy();
    expect(drillTokenCovers(t, "user_a", "q1", 2_000)).toBe(true);
    expect(drillTokenCovers(t, "user_a", "q3", 2_000)).toBe(false);
    expect(drillTokenCovers(t, "user_b", "q1", 2_000)).toBe(false);
    expect(drillTokenCovers(t, "user_a", "q1", 1_000 + 4 * 3600_000)).toBe(false);
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ u: "user_a", q: ["q9"], e: 9e15 })).toString("base64url");
    expect(drillTokenCovers(`${forged}.${sig}`, "user_a", "q9", 2_000)).toBe(false);
    expect(drillTokenCovers(`${body}.x${sig.slice(1)}`, "user_a", "q1", 2_000)).toBe(false);
    expect(drillTokenCovers(undefined, "user_a", "q1")).toBe(false);
  });
});

describe("drill -> answer -> mastery on the test database", { timeout: 180_000 }, () => {
  const run = Date.now();
  let userId = "";

  beforeAll(async () => {
    await seedStarterContent(db);
    const user = await db.user.create({ data: { email: `skills-p2-${run}@example.test`, passwordHash: "x", name: "Skills P2" } });
    userId = user.id;
    // Paid plan so usage limits don't interfere with the flow under test.
    await db.subscription.create({ data: { userId, plan: "PREMIUM", status: "ACTIVE", currentPeriodStart: new Date(Date.now() - 86_400_000), currentPeriodEnd: new Date(Date.now() + 29 * 86_400_000) } });
    session.getServerSession.mockResolvedValue({ user: { id: userId, email: user.email, role: "CANDIDATE" } });
  }, 120_000);

  afterAll(async () => {
    if (!userId) return;
    await db.userSkillMastery.deleteMany({ where: { userId } });
    await db.practiceAttempt.deleteMany({ where: { userId } });
    await db.usageEvent.deleteMany({ where: { userId } });
    await db.subscription.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });
  }, 60_000);

  it("re-seeding the starter bank changes nothing", async () => {
    expect(await seedStarterContent(db)).toMatchObject({ created: 0, updated: 0, retired: 0 });
  });

  it("serves a drill without answers, charges one session, and answers update mastery with reasons", async () => {
    const { GET } = await import("@/app/api/skills/drill/route");
    const { POST } = await import("@/app/api/practice/attempts/route");

    const res = await GET(new Request("http://localhost/api/skills/drill?skill=QNT.COM.PERCENT&count=6"));
    expect(res.status).toBe(200);
    const drill = await res.json();
    expect(drill.questions).toHaveLength(6);
    expect(drill.drillToken).toBeTruthy();
    for (const q of drill.questions) {
      expect(q.skillId).toBe("QNT.COM.PERCENT");
      expect(q).not.toHaveProperty("correctAnswer");
      expect(q).not.toHaveProperty("explanation");
      expect(q).not.toHaveProperty("distractorReasons");
    }
    const levels = drill.questions.map((q: { level: number }) => q.level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b)); // easiest first
    expect(await db.usageEvent.count({ where: { userId, feature: "PRACTICE_SESSION" } })).toBe(1);

    // Answer: first one wrong (on purpose), the rest right.
    const stored = await db.practiceQuestion.findMany({ where: { id: { in: drill.questions.map((q: { id: string }) => q.id) } } });
    const byId = new Map(stored.map((q) => [q.id, q]));
    let last: { mastery: { band: string; score: number; attempts: number } } | null = null;
    for (const [i, q] of drill.questions.entries()) {
      const real = byId.get(q.id)!;
      const wrong = (JSON.parse(real.options!) as string[]).find((o) => o !== real.correctAnswer)!;
      const answer = i === 0 ? wrong : real.correctAnswer!;
      const r = await POST(
        new Request("http://localhost/api/practice/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: q.id, responseText: answer, timeTakenSeconds: 12, drillToken: drill.drillToken }),
        })
      );
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.isCorrect).toBe(i !== 0);
      if (i === 0) expect(body.distractorReason).toBe(JSON.parse(real.distractorReasons!)[wrong]);
      else expect(body.distractorReason).toBeNull();
      expect(body.skillId).toBe("QNT.COM.PERCENT");
      last = body;
    }
    // Still one charge: the drill's answers weren't charged again.
    expect(await db.usageEvent.count({ where: { userId, feature: "PRACTICE_SESSION" } })).toBe(1);

    // Attempts carry the skill + level; mastery rolled up to QNT.COM and QNT.
    const attempts = await db.practiceAttempt.findMany({ where: { userId } });
    expect(attempts).toHaveLength(6);
    for (const a of attempts) {
      expect(a.skillId).toBe("QNT.COM.PERCENT");
      expect(a.level).toBe(byId.get(a.questionId)!.level);
    }
    expect(last!.mastery.attempts).toBe(6);
    expect(last!.mastery.band).not.toBe("UNRATED");
    const rows = await db.userSkillMastery.findMany({ where: { userId }, orderBy: { skillId: "asc" } });
    expect(rows.map((r) => r.skillId)).toEqual(["QNT", "QNT.COM", "QNT.COM.PERCENT"]);
    for (const r of rows) {
      expect(r.attempts).toBe(6);
      expect(r.correct).toBe(5);
      expect(r.score).toBeGreaterThan(60);
      expect(r.score).toBeLessThan(100);
    }
  });

  it("an answer without a valid drill token is charged as before", async () => {
    const { POST } = await import("@/app/api/practice/attempts/route");
    const q = await db.practiceQuestion.findFirstOrThrow({ where: { skillId: "REA.SER.NUM", difficulty: "BEGINNER" } });
    const before = await db.usageEvent.count({ where: { userId, feature: "PRACTICE_SESSION" } });
    const r = await POST(
      new Request("http://localhost/api/practice/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, responseText: q.correctAnswer, timeTakenSeconds: 5, drillToken: "forged.token" }),
      })
    );
    expect(r.status).toBe(200);
    expect(await db.usageEvent.count({ where: { userId, feature: "PRACTICE_SESSION" } })).toBe(before + 1);
  });

  it("the 'I'm weak in' diagnostic spans a category's subcategories; speaking categories point to practice", async () => {
    const { GET } = await import("@/app/api/skills/diagnostic/route");
    const res = await GET(new Request("http://localhost/api/skills/diagnostic?category=rea"));
    expect(res.status).toBe(200);
    const diag = await res.json();
    expect(diag.kind).toBe("diagnostic");
    expect(diag.questions.length).toBeGreaterThanOrEqual(6);
    expect(diag.questions.length).toBeLessThanOrEqual(12);
    const subs = new Set(diag.questions.map((q: { skillId: string }) => q.skillId.split(".").slice(0, 2).join(".")));
    expect(subs.size).toBeGreaterThanOrEqual(4);
    for (const q of diag.questions) {
      expect(q.level).toBeGreaterThanOrEqual(2);
      expect(q.level).toBeLessThanOrEqual(4);
      expect(q).not.toHaveProperty("correctAnswer");
    }

    const voice = await (await GET(new Request("http://localhost/api/skills/diagnostic?category=SPK"))).json();
    expect(voice).toMatchObject({ kind: "voice", practice: { href: expect.stringContaining("/practice") } });

    const hidden = await GET(new Request("http://localhost/api/skills/diagnostic?category=DGT"));
    expect(hidden.status).toBe(404); // behind the all-categories flag
  });
});
