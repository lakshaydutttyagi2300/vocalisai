import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";
import { PRACTICE_TESTS, type DemoQuestion } from "../../prisma/exam-demo/content.mjs";
import { removeExamDemo, seedExamDemo } from "../../prisma/exam-demo/seed.mjs";

// The IELTS-style practice tests as a candidate meets them on the real
// server: offered as extra choices next to the (unchanged) default mock
// test while exam_runner_v2 is on, hidden when it's off, and sat end to
// end. Seeded into the TEST branch under a throwaway family (no
// audio/chart generation); the flag is restored and everything removed.
const password = "correct-horse-battery-staple";
const familySlug = `TEST_DEMO_E2E_${Date.now()}`;

const contentByPrompt = new Map<string, DemoQuestion>(
  PRACTICE_TESTS.flatMap((t) => t.papers.flatMap((p) => p.parts.flatMap((pt) => [...(pt.groups ?? []).flatMap((g) => g.questions), ...(pt.questions ?? [])]))).map(
    (q) => [q.prompt, q]
  )
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
interface Option {
  templateId: string;
  name: string;
  kind: string;
  isDefault: boolean;
  totalMinutes: number | null;
}

let seededTemplateIds: string[] = [];
let previousFlag: Awaited<ReturnType<typeof db.featureFlag.findUnique>> = null;

async function setFlag(enabled: boolean) {
  await db.featureFlag.upsert({
    where: { key: "exam_runner_v2" },
    create: { key: "exam_runner_v2", label: "Exam Runner v2", enabled },
    update: { enabled },
  });
}

test.beforeAll(async () => {
  test.setTimeout(180_000);
  previousFlag = await db.featureFlag.findUnique({ where: { key: "exam_runner_v2" } });
  const seeded = await seedExamDemo(db, { familySlug });
  seededTemplateIds = seeded.tests.map((t) => t.templateId!);
});

test.afterAll(async () => {
  test.setTimeout(180_000);
  await db.featureFlag.deleteMany({ where: { key: "exam_runner_v2" } });
  if (previousFlag) {
    await db.featureFlag.create({ data: { key: previousFlag.key, label: previousFlag.label, description: previousFlag.description, enabled: previousFlag.enabled } });
  }
  await db.mockTestSession.deleteMany({ where: { templateId: { in: seededTemplateIds } } }); // cascades answers
  await removeExamDemo(db, { familySlug, removeFamily: true });
});

async function candidate(page: import("@playwright/test").Page, tag: string) {
  const email = `e2e-choose-${tag}-${Date.now()}@example.test`;
  const user = await createTestUser(email, password);
  await setPlan(user.id, "STARTER", { periodDays: 30 });
  await page.goto("/");
  await loginAs(page, email, password);
  return user;
}

test("the practice tests are offered only while the new exam is on, next to the unchanged default test", async ({ page }) => {
  test.setTimeout(180_000);
  const user = await candidate(page, "options");
  const defaultTemplate = await db.mockTestTemplate.findFirstOrThrow({ where: { isDefault: true } });

  // OFF: only standard tests - today's default first, plus each Goal Track's
  // own exam (Phase 4) - and no practice tests.
  await setFlag(false);
  const off = (await (await page.request.get("/api/mock-tests/options")).json()).options as Option[];
  expect(off[0]).toMatchObject({ templateId: defaultTemplate.id, kind: "standard", isDefault: true });
  expect(off.every((o) => o.kind === "standard")).toBe(true);
  expect(off.some((o) => seededTemplateIds.includes(o.templateId))).toBe(false);
  // ...and a practice test can't be requested directly.
  const refused = await page.request.post("/api/mock-tests/sessions", { data: { templateId: seededTemplateIds[0] } });
  expect(refused.status()).toBe(400);
  expect(await db.usageEvent.count({ where: { userId: user.id } })).toBe(0); // a refused choice costs nothing

  // ON: default first, then the 3 practice tests.
  await setFlag(true);
  const on = (await (await page.request.get("/api/mock-tests/options")).json()).options as Option[];
  expect(on[0]).toMatchObject({ templateId: defaultTemplate.id, kind: "standard" });
  const offered = on.filter((o) => seededTemplateIds.includes(o.templateId));
  expect(offered.map((o) => o.name)).toEqual(PRACTICE_TESTS.map((t) => t.templateName));
  for (const o of offered) expect(o).toMatchObject({ kind: "exam", totalMinutes: 30 + 60 + 60 + 15 });

  // No choice = the default test, exactly as before (runner v1).
  const plain = await (await page.request.post("/api/mock-tests/sessions")).json();
  expect(plain.template.id).toBe(defaultTemplate.id);
  expect(plain.runner).toBe("v1");

  // A deactivated version disappears from the list.
  const variant = await db.examVariant.findFirstOrThrow({ where: { family: { slug: familySlug }, slug: PRACTICE_TESTS[2].variantSlug } });
  await db.examVariant.update({ where: { id: variant.id }, data: { isActive: false } });
  try {
    const hidden = (await (await page.request.get("/api/mock-tests/options")).json()).options as Option[];
    expect(hidden.map((o) => o.name)).not.toContain(PRACTICE_TESTS[2].templateName);
  } finally {
    await db.examVariant.update({ where: { id: variant.id }, data: { isActive: true } });
  }

  // The chooser screen: every option as a radio card, the standard test pre-selected.
  await page.goto("/mock-tests");
  const chooser = page.getByRole("radiogroup", { name: "Choose a mock test" });
  await expect(chooser).toBeVisible({ timeout: 20_000 });
  await expect(chooser.getByRole("radio", { name: new RegExp(defaultTemplate.name) })).toHaveAttribute("aria-checked", "true");
  const pt2 = chooser.getByRole("radio", { name: new RegExp(PRACTICE_TESTS[1].templateName) });
  await expect(pt2).toContainText("2 h 45 min in total");
  await pt2.click();
  await expect(pt2).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText(/not affiliated with or endorsed by IELTS/)).toBeVisible();
  await page.screenshot({ path: "test-results/practice-tests/chooser.png", fullPage: true });

  await db.user.delete({ where: { id: user.id } });
});

test("a candidate sits Practice Test 2 end to end: 4 papers in order, right answers score, results show real counts", async ({ page }) => {
  test.setTimeout(420_000); // ~50 requests, each a round-trip to the remote test DB
  await setFlag(true);
  const user = await candidate(page, "sit");
  const pt2 = PRACTICE_TESTS[1];

  try {
    const createdRes = await page.request.post("/api/mock-tests/sessions", { data: { templateId: seededTemplateIds[1] } });
    const created = await createdRes.json();
    expect(createdRes.status(), JSON.stringify(created)).toBe(200);
    expect(created.runner).toBe("v2");
    expect(created.template.name).toBe(pt2.templateName);
    const id: string = created.sessionId;

    // --- Listening: 4 recordings x 3 questions, heard once, locked order ---
    const listening = await (await page.request.post(`/api/exam-sessions/${id}/start`)).json();
    expect(listening.paperCount).toBe(4);
    expect(listening.paper).toMatchObject({ name: "Listening", durationSeconds: 1800, navigationMode: "LOCKED_SEQUENTIAL" });
    const lq = listening.questions as ViewQuestion[];
    expect(lq).toHaveLength(12);
    for (const q of lq) expect(q.itemGroup).toMatchObject({ type: "AUDIO", playLimit: 1 });
    // Only Practice Test 2's own content, and no transcript or answer key reaches the browser.
    const pt2Prompts = new Set(pt2.papers[0].parts.flatMap((pt) => pt.groups!.flatMap((g) => g.questions.map((q) => q.prompt))));
    for (const q of lq) expect(pt2Prompts.has(q.prompt), q.prompt).toBe(true);
    expect(JSON.stringify(listening)).not.toContain("Petrakis");
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
    expect(new Set(rq.map((q) => q.itemGroup?.text?.split("\n")[0]))).toEqual(new Set(pt2.papers[1].parts.map((pt) => pt.groups![0].text!.split("\n")[0])));
    for (const q of [...rq].reverse()) {
      const res = await page.request.put(`/api/exam-sessions/${id}/response`, { data: { questionId: q.id, answer: rightAnswer(contentByPrompt.get(q.prompt)!) } });
      expect(res.ok(), q.prompt).toBe(true);
    }

    // --- Writing: Task 1 (150 words) and Task 2 (250 words) ----------------
    const writing = await (await page.request.post(`/api/exam-sessions/${id}/submit-paper`, { data: { paperIndex: 1 } })).json();
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

    const responses = await db.itemResponse.findMany({ where: { mockTestSessionId: id }, include: { question: { select: { type: true } } } });
    const objective = responses.filter((r) => !["LONG_WRITING", "TIMED_SPEAKING"].includes(r.question.type));
    expect(objective).toHaveLength(21);
    expect(objective.every((r) => r.isCorrect === true)).toBe(true);
    expect(responses.filter((r) => r.question.type === "LONG_WRITING").every((r) => r.isCorrect === null && r.score === null)).toBe(true);

    await page.goto(`/exam/results/${id}`);
    await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible();
    // "Correct (auto-marked)" in each paper's own card ("Answered" shows the same numbers).
    const correctIn = (paper: string) =>
      page.locator(".card", { has: page.getByRole("heading", { name: paper }) }).locator("div", { has: page.getByText("Correct (auto-marked)") }).locator("dd");
    await expect(correctIn("Listening")).toHaveText("12 of 12");
    await expect(correctIn("Reading")).toHaveText("9 of 9");
    await expect(page.locator(".card", { has: page.getByRole("heading", { name: "Writing" }) })).toContainText("2 responses");
    await expect(page.getByText(/not affiliated with or endorsed by IELTS/)).toBeVisible();

    // ...and it shows up in the candidate's own sections.
    await page.getByRole("link", { name: "All my results" }).click();
    await expect(page).toHaveURL(/\/mock-tests\/history$/);
    const row = page.getByRole("list", { name: "Mock exam results" }).getByRole("link", { name: new RegExp(pt2.templateName) });
    await expect(row).toContainText("21 / 21 correct");
    await expect(row).toContainText("Completed");
    await page.goto("/progress");
    const papers = page.getByLabel("Exam paper results");
    await expect(papers).toContainText("Listening100%");
    await expect(papers).toContainText("12 of 12 answers correct");
    await expect(papers).toContainText("Reading100%");
    await expect(papers).toContainText("Writing2 responses");
  } finally {
    await db.user.delete({ where: { id: user.id } }); // cascades the session and its answers
  }
});
