import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";

// The Customer Support (BPO) English Assessment end to end, on a tiny copy of
// its structure: a Free user's one free try, marking (no recordings, so no AI
// call), the brief result page, the second try refused, and the exam's own
// questions never leaking into ordinary practice.
const password = "correct-horse-battery-staple";
const stamp = Date.now();

let familyCreated = false;
let familyId = "";
let variantId = "";
let templateId = "";
const ids = { mcq: "", dictation: "", repeat: "" };
let groupId = "";
let previousFlag: { enabled: boolean } | null = null;

test.beforeAll(async () => {
  test.skip(
    !!(await db.examVariant.findFirst({ where: { slug: "CUSTOMER_SUPPORT_BPO" } })),
    "The real assessment is loaded in this database; this test needs its own copy."
  );
  previousFlag = await db.featureFlag.findUnique({ where: { key: "exam_runner_v2" } });
  await db.featureFlag.upsert({ where: { key: "exam_runner_v2" }, create: { key: "exam_runner_v2", label: "Exam Runner v2", enabled: true }, update: { enabled: true } });

  let family = await db.examFamily.findUnique({ where: { slug: "CUSTOMER_SERVICE_ENGLISH" } });
  if (!family) {
    family = await db.examFamily.create({ data: { slug: "CUSTOMER_SERVICE_ENGLISH", name: "Customer Service English" } });
    familyCreated = true;
  }
  familyId = family.id;
  const variant = await db.examVariant.create({
    data: {
      familyId,
      slug: "CUSTOMER_SUPPORT_BPO",
      name: `Customer Support (BPO) English ${stamp}`,
      scoreScale: "PASS_MERIT_DISTINCTION",
      papers: {
        create: [
          { order: 1, name: "Listening", durationSeconds: 600, navigationMode: "FREE_WITHIN_SECTION", parts: { create: [{ order: 1, name: "US accent call" }, { order: 2, name: "Dictation" }] } },
          { order: 2, name: "Listen and repeat", durationSeconds: 300, navigationMode: "LOCKED_SEQUENTIAL", parts: { create: [{ order: 1, name: "Listen and repeat", prepSeconds: 3, responseSeconds: 15 }] } },
        ],
      },
    },
    include: { papers: { include: { parts: true } } },
  });
  variantId = variant.id;
  const part = (paper: number, order: number) => variant.papers.find((p) => p.order === paper)!.parts.find((p) => p.order === order)!.id;
  const base = { difficulty: "INTERMEDIATE", timeLimitSeconds: 60, source: "SEEDED" };
  groupId = (await db.itemGroup.create({ data: { type: "AUDIO", title: "US call", assetKey: "item-groups/00000000-0000-4000-8000-000000000000.mp3", playLimit: 1 } })).id;
  ids.mcq = (await db.practiceQuestion.create({ data: { ...base, category: "LISTENING", type: "MULTIPLE_CHOICE", prompt: `What is the account number? ${stamp}`, options: JSON.stringify(["5583", "5538"]), correctAnswer: "5583", tags: ["support:us-listening"], examPartId: part(1, 1), itemGroupId: groupId, orderInGroup: 1 } })).id;
  ids.dictation = (await db.practiceQuestion.create({ data: { ...base, category: "LISTENING", type: "DICTATION", prompt: "Type the sentence.", correctAnswer: "Your order is BK-4729.", tags: ["support:dictation"], examPartId: part(1, 2) } })).id;
  ids.repeat = (await db.practiceQuestion.create({ data: { ...base, category: "PRONUNCIATION", type: "TIMED_SPEAKING", prompt: "Repeat the sentence.", expectedAnswer: "Thank you for calling.", tags: ["support:repeat"], examPartId: part(2, 1) } })).id;
  templateId = (
    await db.mockTestTemplate.create({
      data: {
        name: `Customer Support English Assessment ${stamp}`,
        examVariantId: variantId,
        sections: {
          create: [
            { order: 1, category: "LISTENING", difficulty: "INTERMEDIATE", questionCount: 1, examPartId: part(1, 1) },
            { order: 2, category: "LISTENING", difficulty: "INTERMEDIATE", questionCount: 1, examPartId: part(1, 2) },
            { order: 3, category: "PRONUNCIATION", difficulty: "INTERMEDIATE", questionCount: 1, examPartId: part(2, 1) },
          ],
        },
      },
    })
  ).id;
});

test.afterAll(async () => {
  if (!variantId) return;
  await db.user.deleteMany({ where: { email: { startsWith: `e2e-support-${stamp}` } } });
  await db.practiceQuestion.deleteMany({ where: { id: { in: Object.values(ids).filter(Boolean) } } });
  if (groupId) await db.itemGroup.deleteMany({ where: { id: groupId } });
  await db.mockTestTemplate.deleteMany({ where: { id: templateId } });
  await db.examVariant.deleteMany({ where: { id: variantId } });
  if (familyCreated) await db.examFamily.deleteMany({ where: { id: familyId } });
  if (previousFlag) await db.featureFlag.update({ where: { key: "exam_runner_v2" }, data: { enabled: previousFlag.enabled } });
  else await db.featureFlag.deleteMany({ where: { key: "exam_runner_v2" } });
});

test("a Free user's one free try: take it, get a brief score out of 100, and can't start a second", async ({ page }) => {
  test.setTimeout(180_000);
  const email = `e2e-support-${stamp}@example.test`;
  await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);

  const created = await page.request.post("/api/mock-tests/sessions", { data: { templateId } });
  const session = await created.json();
  expect(created.status(), JSON.stringify(session)).toBe(200);
  expect(session.runner).toBe("v2");
  const id: string = session.sessionId;

  const started = await (await page.request.post(`/api/exam-sessions/${id}/start`)).json();
  expect(started.questions.map((q: { id: string }) => q.id).sort()).toEqual([ids.mcq, ids.dictation].sort());
  expect(JSON.stringify(started)).not.toContain("BK-4729");

  // A candidate keeps the call's play limit (1 here).
  expect(started.questions.find((q: { id: string }) => q.id === ids.mcq).itemGroup.playLimit).toBe(1);
  expect((await page.request.post(`/api/exam-sessions/${id}/audio-play`, { data: { itemGroupId: groupId } })).status()).toBe(200);
  expect((await page.request.post(`/api/exam-sessions/${id}/audio-play`, { data: { itemGroupId: groupId } })).status()).toBe(403);

  // Not finished yet: no result.
  expect((await page.request.post(`/api/exam-sessions/${id}/mark`)).status()).toBe(409);

  for (const [questionId, answer] of [[ids.mcq, "5583"], [ids.dictation, "your order is bk 4729"]] as const) {
    expect((await page.request.put(`/api/exam-sessions/${id}/response`, { data: { questionId, answer } })).ok()).toBe(true);
  }
  await page.request.post(`/api/exam-sessions/${id}/submit-paper`, { data: { paperIndex: 0 } });
  const last = await (await page.request.post(`/api/exam-sessions/${id}/submit-paper`, { data: { paperIndex: 1 } })).json();
  expect(last.status).toBe("COMPLETED");

  // Marked in code: both listening answers right = 25 of 25; the repeat was skipped = 0.
  const marked = await page.request.post(`/api/exam-sessions/${id}/mark`);
  const outcome = await marked.json();
  expect(marked.status(), JSON.stringify(outcome)).toBe(200);
  expect(outcome.status).toBe("done");
  const listening = outcome.result.components.find((c: { key: string }) => c.key === "listening");
  expect(listening).toMatchObject({ points: 25, max: 25 });
  expect(outcome.result.overall).toBe(outcome.result.components.reduce((n: number, c: { points: number }) => n + c.points, 0));
  expect(outcome.result.priorities.length).toBeGreaterThan(0);
  const stored = await db.scoreReport.findUnique({ where: { mockTestSessionId: id } });
  expect(stored?.overallScore).toBe(outcome.result.overall);

  // The brief result page, at phone width too.
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/exam/results/${id}`);
    await expect(page.getByRole("heading", { name: "Your result" })).toBeVisible();
    await expect(page.getByText("Your score by skill")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Practise these first" })).toBeVisible();
    await expect(page.getByRole("link", { name: "See plans and pricing" })).toHaveAttribute("href", "/pricing");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }

  // The free try is used up.
  const again = await page.request.post("/api/mock-tests/sessions", { data: { templateId } });
  expect(again.status()).toBe(403);
  const refused = await again.json();
  expect(refused.error).toContain("free Customer Support Assessment");
  expect(refused.upgrade).toBe(true);

  // Its questions belong to the exam: never served in ordinary practice.
  const practice = await (await page.request.get("/api/practice/questions?category=LISTENING&difficulty=INTERMEDIATE&count=50")).json();
  expect(JSON.stringify(practice)).not.toContain(ids.mcq);
});

test("an admin testing the site can replay a call as often as they like", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `e2e-support-${stamp}-admin@example.test`;
  const admin = await createTestUser(email, password);
  await db.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  await page.goto("/");
  await loginAs(page, email, password);
  const session = await (await page.request.post("/api/mock-tests/sessions", { data: { templateId } })).json();
  const started = await (await page.request.post(`/api/exam-sessions/${session.sessionId}/start`)).json();
  expect(started.questions.find((q: { id: string }) => q.id === ids.mcq).itemGroup.playLimit).toBeNull();
  for (let i = 0; i < 3; i++) {
    expect((await page.request.post(`/api/exam-sessions/${session.sessionId}/audio-play`, { data: { itemGroupId: groupId } })).status()).toBe(200);
  }
});
