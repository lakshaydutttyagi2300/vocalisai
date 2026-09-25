import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";
import { DEMO_PAPERS, type DemoQuestion } from "../../prisma/exam-demo/content.mjs";
import { removeExamDemo, seedExamDemo } from "../../prisma/exam-demo/seed.mjs";

// P1-H: a candidate sits the whole demo exam through the real server - the
// same template -> plan -> runner path a dev user gets after
// `npm run seed:exam-demo -- --make-default`. Seeded into the TEST branch
// under a throwaway family (no audio/chart generation), made the default
// and flag-enabled for this test only, then everything is put back.
const password = "correct-horse-battery-staple";
const familySlug = `TEST_DEMO_E2E_${Date.now()}`;

const contentByPrompt = new Map<string, DemoQuestion>(
  DEMO_PAPERS.flatMap((p) => p.parts.flatMap((pt) => [...(pt.groups ?? []).flatMap((g) => g.questions), ...(pt.questions ?? [])])).map((q) => [q.prompt, q])
);

function rightAnswer(q: DemoQuestion): unknown {
  if (q.type === "GAP_FILL") return (JSON.parse(q.correctAnswer!) as string[][]).map((a) => a[0]);
  if (q.type === "MULTI_SELECT") return JSON.parse(q.correctAnswer!);
  if (q.type === "LONG_WRITING") return "A short placeholder response written by the automated test.";
  return q.correctAnswer;
}

interface ViewQuestion {
  id: string;
  type: string;
  prompt: string;
  itemGroup: { type: string; playLimit: number | null; text: string | null } | null;
}

test("a candidate sits the full demo exam: 4 papers in order, right answers score, results show real counts", async ({ page }) => {
  test.setTimeout(420_000); // ~50 requests, each a round-trip to the remote test DB

  const seeded = await seedExamDemo(db, { familySlug });
  const previousDefaults = await db.mockTestTemplate.findMany({ where: { isDefault: true }, select: { id: true } });
  const previousFlag = await db.featureFlag.findUnique({ where: { key: "exam_runner_v2" } });
  let userId: string | null = null;

  try {
    await db.mockTestTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    await db.mockTestTemplate.update({ where: { id: seeded.templateId! }, data: { isDefault: true } });
    await db.featureFlag.upsert({
      where: { key: "exam_runner_v2" },
      create: { key: "exam_runner_v2", label: "Exam Runner v2", enabled: true },
      update: { enabled: true },
    });

    const email = `e2e-demo-${Date.now()}@example.test`;
    const user = await createTestUser(email, password);
    userId = user.id;
    await setPlan(user.id, "STARTER", { periodDays: 30 });
    await page.goto("/");
    await loginAs(page, email, password);

    const created = await (await page.request.post("/api/mock-tests/sessions")).json();
    expect(created.runner).toBe("v2");
    const id: string = created.sessionId;

    // --- Listening: 4 recordings x 3 questions, heard once, locked order ---
    const listening = await (await page.request.post(`/api/exam-sessions/${id}/start`)).json();
    expect(listening.paperCount).toBe(4);
    expect(listening.paper).toMatchObject({ name: "Listening", durationSeconds: 1800, navigationMode: "LOCKED_SEQUENTIAL" });
    expect(listening.paper.parts.map((p: { name: string }) => p.name)).toEqual(["Part 1", "Part 2", "Part 3", "Part 4"]);
    const lq = listening.questions as ViewQuestion[];
    expect(lq).toHaveLength(12);
    for (const q of lq) expect(q.itemGroup).toMatchObject({ type: "AUDIO", playLimit: 1 });
    // Neither the transcript nor any answer key reaches the browser.
    expect(JSON.stringify(listening)).not.toContain("Okafor");
    expect(JSON.stringify(listening)).not.toContain("correctAnswer");

    for (const [i, q] of lq.entries()) {
      const res = await page.request.put(`/api/exam-sessions/${id}/response`, { data: { questionId: q.id, answer: rightAnswer(contentByPrompt.get(q.prompt)!) } });
      expect(res.ok(), q.prompt).toBe(true);
      if (i < lq.length - 1) await page.request.post(`/api/exam-sessions/${id}/advance`, { data: { fromIndex: i } });
    }

    // --- Reading: 3 passages, free navigation ------------------------------
    const reading = await (await page.request.post(`/api/exam-sessions/${id}/submit-paper`, { data: { paperIndex: 0 } })).json();
    expect(reading.paper).toMatchObject({ name: "Reading", durationSeconds: 3600, navigationMode: "FREE_WITHIN_SECTION", allowReview: true });
    const rq = reading.questions as ViewQuestion[];
    expect(rq).toHaveLength(9);
    expect(new Set(rq.map((q) => q.itemGroup?.text?.split("\n")[0]))).toEqual(
      new Set(["The Return of the Night Train", "Why We Doodle", "Mapping the Ocean Floor"])
    );
    // Answered out of order on purpose - allowed in this paper.
    for (const q of [...rq].reverse()) {
      const res = await page.request.put(`/api/exam-sessions/${id}/response`, { data: { questionId: q.id, answer: rightAnswer(contentByPrompt.get(q.prompt)!) } });
      expect(res.ok(), q.prompt).toBe(true);
    }

    // --- Writing: one Task 1 (150 words) and one Task 2 (250 words) ---------
    const writing = await (await page.request.post(`/api/exam-sessions/${id}/submit-paper`, { data: { paperIndex: 1 } })).json();
    expect(writing.paper.name).toBe("Writing");
    const wq = writing.questions as ViewQuestion[];
    expect(wq.map((q) => q.type)).toEqual(["LONG_WRITING", "LONG_WRITING"]);
    expect(wq[0].prompt).toMatch(/at least 150 words/);
    expect(wq[1].prompt).toMatch(/at least 250 words/);
    for (const q of wq) {
      expect((await page.request.put(`/api/exam-sessions/${id}/response`, { data: { questionId: q.id, answer: rightAnswer(contentByPrompt.get(q.prompt)!) } })).ok()).toBe(true);
    }

    // --- Speaking: 3 parts, with the part timings the recorder uses ---------
    const speaking = await (await page.request.post(`/api/exam-sessions/${id}/submit-paper`, { data: { paperIndex: 2 } })).json();
    expect(speaking.paper.name).toBe("Speaking");
    expect(speaking.paper.parts.map((p: { prepSeconds: number | null; responseSeconds: number | null }) => [p.prepSeconds, p.responseSeconds])).toEqual([
      [0, 30],
      [60, 120],
      [0, 45],
    ]);
    expect((speaking.questions as ViewQuestion[]).map((q) => q.type)).toEqual(Array(7).fill("TIMED_SPEAKING"));

    const done = await (await page.request.post(`/api/exam-sessions/${id}/submit-paper`, { data: { paperIndex: 3 } })).json();
    expect(done.status).toBe("COMPLETED");

    // Marked by the rule-based graders only: every objective answer right,
    // writing/speaking left unmarked (never a made-up score).
    const responses = await db.itemResponse.findMany({ where: { mockTestSessionId: id }, include: { question: { select: { type: true } } } });
    const objective = responses.filter((r) => !["LONG_WRITING", "TIMED_SPEAKING"].includes(r.question.type));
    expect(objective).toHaveLength(21);
    expect(objective.every((r) => r.isCorrect === true)).toBe(true);
    expect(responses.filter((r) => r.question.type === "LONG_WRITING").every((r) => r.isCorrect === null && r.score === null)).toBe(true);

    await page.goto(`/exam/results/${id}`);
    await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible();
    // Each paper's own card: "Correct (auto-marked)" is the figure that matters
    // ("Answered" shows the same numbers, since every question was answered).
    const correctIn = (paper: string) =>
      page.locator(".card", { has: page.getByRole("heading", { name: paper }) }).locator("div", { has: page.getByText("Correct (auto-marked)") }).locator("dd");
    await expect(correctIn("Listening")).toHaveText("12 of 12");
    await expect(correctIn("Reading")).toHaveText("9 of 9");
    await expect(page.locator(".card", { has: page.getByRole("heading", { name: "Writing" }) })).toContainText("2 responses");
    await expect(page.getByText(/not affiliated with or endorsed by IELTS/)).toBeVisible();
  } finally {
    if (userId) await db.user.delete({ where: { id: userId } }); // cascades the session and its answers
    await db.featureFlag.deleteMany({ where: { key: "exam_runner_v2" } });
    if (previousFlag) {
      await db.featureFlag.create({ data: { key: previousFlag.key, label: previousFlag.label, description: previousFlag.description, enabled: previousFlag.enabled } });
    }
    await db.mockTestTemplate.update({ where: { id: seeded.templateId! }, data: { isDefault: false } });
    if (previousDefaults.length > 0) {
      await db.mockTestTemplate.updateMany({ where: { id: { in: previousDefaults.map((t) => t.id) } }, data: { isDefault: true } });
    }
    await removeExamDemo(db, { familySlug, removeFamily: true });
  }
});
