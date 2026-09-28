import { test, expect, type Page } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { seedExamLibrary } from "../../prisma/exam-library/seed.mjs";
import { createTestUser, loginAs } from "./helpers";

// The exam library through the real server: many exam types with filters,
// one card per exam, a timed exam started from its card, spoken and written
// bank questions answered the right way inside a timed exam, and an admin
// adding a brand-new exam type without code.
test.use({
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
  permissions: ["camera", "microphone"],
});

const password = "correct-horse-battery-staple";
const SHOTS = "test-results/exam-library";
let previousFlag: boolean | null = null;
const cleanup: string[] = [];

interface Option {
  templateId: string;
  versionTemplateIds: string[];
  name: string;
  kind: string;
  typeName: string;
  totalMinutes: number | null;
}

test.beforeAll(async () => {
  test.setTimeout(180_000);
  await seedExamLibrary(db); // idempotent: makes sure the test branch has the library
  previousFlag = (await db.featureFlag.findUnique({ where: { key: "exam_runner_v2" } }))?.enabled ?? null;
  await db.featureFlag.upsert({ where: { key: "exam_runner_v2" }, create: { key: "exam_runner_v2", label: "Exam Runner v2", enabled: true }, update: { enabled: true } });
});

test.afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: cleanup } } });
  await db.examFamily.deleteMany({ where: { slug: { startsWith: "E2E_EXAM_TYPE_" } } });
  if (previousFlag === null) await db.featureFlag.deleteMany({ where: { key: "exam_runner_v2" } });
  else await db.featureFlag.update({ where: { key: "exam_runner_v2" }, data: { enabled: previousFlag } });
});

async function candidate(page: Page, tag: string) {
  const email = `e2e-lib-${tag}-${Date.now()}@example.test`;
  const user = await createTestUser(email, password);
  cleanup.push(user.id);
  await setPlan(user.id, "STARTER", { periodDays: 30 });
  await page.goto("/");
  await loginAs(page, email, password);
  return user;
}

test("the exam library: type filters, one card per exam, and a 15-minute grammar test started from its card", async ({ page }) => {
  test.setTimeout(180_000);
  await candidate(page, "ui");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/mock-tests");
  const filters = page.getByRole("group", { name: "Exam type" });
  await expect(filters).toBeVisible({ timeout: 30_000 });
  for (const type of ["Business English", "Customer Service English", "Speaking Test", "Listening Test", "Grammar Test", "Academic English", "Placement Test", "Aptitude"]) {
    await expect(filters.getByRole("button", { name: new RegExp(`^${type}`) })).toBeVisible();
  }
  await page.screenshot({ path: `${SHOTS}/library-all.png`, fullPage: true });

  // Filter to one type: only its exams, each genuinely different.
  await filters.getByRole("button", { name: /^Grammar Test/ }).click();
  const chooser = page.getByRole("radiogroup", { name: "Choose a mock test" });
  await expect(chooser.getByRole("radio")).toHaveCount(3);
  const beginner = chooser.getByRole("radio", { name: /Grammar Check - Beginner/ });
  await expect(beginner).toContainText("15 min in total");
  await expect(beginner).toContainText("15 questions");
  await expect(beginner).toContainText("Beginner");
  await expect(chooser.getByRole("radio", { name: /Grammar Mastery - Advanced/ })).toContainText("30 min in total");
  await beginner.click();
  await expect(beginner).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Selected")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/library-grammar.png`, fullPage: true });

  // Start it: the timed exam screen opens on its Grammar paper.
  await page.getByRole("button", { name: "Begin system check" }).click();
  await page.getByRole("button", { name: "Enable camera" }).click();
  await page.getByRole("button", { name: "Enable microphone" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const toRules = page.getByRole("button", { name: "Continue to rules" });
  await expect(toRules).toBeEnabled({ timeout: 20_000 });
  await toRules.click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start test" }).click();
  await expect(page.getByRole("heading", { name: "Grammar" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/0 of \d+ answered/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/grammar-exam.png`, fullPage: true });

  // Phone (a fresh tab - the exam tab is full screen): the list and the start bar fit the screen.
  const phone = await page.context().newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto("/mock-tests");
  await expect(phone.getByRole("group", { name: "Exam type" })).toBeVisible({ timeout: 30_000 });
  expect(await phone.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await expect(phone.getByRole("button", { name: "Begin system check" })).toBeInViewport();
  await phone.screenshot({ path: `${SHOTS}/library-phone.png` });
  expect(errors).toEqual([]);
});

test("inside a timed exam, spoken questions are recorded and writing tasks get the long answer box", async ({ page }) => {
  test.setTimeout(120_000);
  const user = await candidate(page, "api");
  const options = (await (await page.request.get("/api/mock-tests/options")).json()).options as Option[];
  const byName = (name: string) => options.find((o) => o.name === name)!;

  // Speaking: every question is answered by recording.
  const speakingRes = await page.request.post("/api/mock-tests/sessions", { data: { templateId: byName("Quick Speaking Check").templateId } });
  const speaking = await speakingRes.json();
  expect(speakingRes.status(), JSON.stringify(speaking)).toBe(200);
  expect(speaking.runner).toBe("v2");
  const started = await (await page.request.post(`/api/exam-sessions/${speaking.sessionId}/start`)).json();
  expect(started.questions.length).toBeGreaterThan(0);
  expect(started.questions.every((q: { type: string }) => q.type === "TIMED_SPEAKING")).toBe(true);

  // A typed answer is refused; the candidate's own recording is accepted.
  const first = started.questions[0].id as string;
  expect((await page.request.put(`/api/exam-sessions/${speaking.sessionId}/response`, { data: { questionId: first, answer: "typed" } })).status()).toBe(400);
  const recording = await db.practiceRecording.create({ data: { userId: user.id, filePath: `recordings/${user.id}/e2e.webm`, mimeType: "audio/webm", durationSeconds: 5 } });
  expect((await page.request.put(`/api/exam-sessions/${speaking.sessionId}/response`, { data: { questionId: first, answer: { recordingId: recording.id } } })).ok()).toBe(true);

  // Writing: the long answer box.
  const writing = await (await page.request.post("/api/mock-tests/sessions", { data: { templateId: byName("Writing Essentials").templateId } })).json();
  const writingStarted = await (await page.request.post(`/api/exam-sessions/${writing.sessionId}/start`)).json();
  expect(writingStarted.questions.length).toBeGreaterThan(0);
  expect(writingStarted.questions.every((q: { type: string }) => q.type === "LONG_WRITING")).toBe(true);
});

test("an admin creates a new exam type from the admin panel, no code needed", async ({ page }) => {
  const email = `e2e-lib-admin-${Date.now()}@example.test`;
  const admin = await createTestUser(email, password);
  cleanup.push(admin.id);
  await db.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  await page.goto("/");
  await loginAs(page, email, password);

  const name = `E2E Exam Type ${Date.now()}`;
  await page.goto("/admin/exams");
  await page.getByLabel("New exam type name").fill(name);
  await page.getByLabel("New exam type description").fill("Created by the automated test.");
  await page.getByRole("button", { name: "Create exam type" }).click();
  await expect(page.getByRole("region", { name: `Exam family ${name}` })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Created by the automated test.")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/admin-new-type.png`, fullPage: true });
});
