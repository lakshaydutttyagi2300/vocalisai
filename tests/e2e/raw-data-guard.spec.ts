import { test, expect, type Page } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";

// Proves raw question data (audio/image production specs, or any other JSON
// stored in a question's passage) can't reach a candidate - on the wire or on
// screen - for NEW content of any shape, through Next in practice, after a
// refresh mid mock-test, and when resuming a new-style exam.
test.use({
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
  permissions: ["camera", "microphone"],
});

const password = "correct-horse-battery-staple";
const run = Date.now();

const spec = (script: [string, string][], extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    audio: {
      script: script.map(([speaker, text]) => ({ speaker, text })),
      voices: { S1: "adult, clear, neutral international accent", S2: "adult, contrasting pitch", S3: "older adult" },
      speechRate: 0.9,
      pauseBetweenTurnsMs: 400,
      maxPlays: 2,
      ttsNotes: "internal note for the voice team",
      generationStatus: "not_generated",
      audioAssetKey: null,
      transcriptVisibleToCandidate: false,
      ...extra,
    },
  });
const IMAGE = JSON.stringify({
  image: {
    prompt: "Illustrator brief: clean flat style office scene",
    altText: "Three colleagues planning at a whiteboard with sticky notes.",
    keyElements: ["whiteboard", "sticky notes"],
    generationStatus: "not_generated",
    imageAssetKey: null,
  },
});

// Every token that would mean raw data leaked onto the screen.
const FORBIDDEN = [
  /\{"/,
  /"\w+":/,
  /\bS[1-3]\b/,
  /generationStatus|speechRate|maxPlays|audioAssetKey|audioScriptHash|ttsNotes|transcriptVisibleToCandidate|imageAssetKey|pauseBetweenTurnsMs/,
  /internal note for the voice team/,
  /neutral international accent/,
  /Illustrator brief/,
  /mystery-video-field/,
  /\{broken/,
];
// Hidden transcripts (these sentences are only ever spoken).
const TRANSCRIPTS = [/meeting has moved to room four/i, /bring the signed contract/i, /three of us will present/i, /the printer on floor two/i];

async function assertClean(page: Page, where: string) {
  const text = await page.locator("body").innerText();
  for (const bad of [...FORBIDDEN, ...TRANSCRIPTS]) expect(text, `${where}: ${bad}`).not.toMatch(bad);
}
function assertCleanWire(json: unknown, where: string) {
  const wire = JSON.stringify(json);
  for (const f of ["generationStatus", "audioAssetKey", "audioScriptHash", "ttsNotes", "maxPlays", "speechRate", "transcriptVisibleToCandidate", "imageAssetKey", "internal note", "neutral international accent", "Illustrator brief", "mystery-video-field", "{broken", '\\"audio\\"', '\\"image\\"']) {
    expect(wire, `${where}: ${f}`).not.toContain(f);
  }
}

async function candidate(page: Page, tag: string) {
  const email = `e2e-raw-${tag}-${run}@example.test`;
  const user = await createTestUser(email, password);
  await setPlan(user.id, "STARTER", { periodDays: 30 });
  await page.goto("/");
  await loginAs(page, email, password);
  return user;
}

async function throughEntry(page: Page) {
  await page.goto("/mock-tests");
  await assertClean(page, "mock intro");
  await page.getByRole("button", { name: "Begin system check" }).click();
  await page.getByRole("button", { name: "Enable camera" }).click();
  await page.getByRole("button", { name: "Enable microphone" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const toRules = page.getByRole("button", { name: "Continue to rules" });
  await expect(toRules).toBeEnabled({ timeout: 20_000 });
  await toRules.click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start test" }).click();
}

// Temporarily replaces the INTERMEDIATE pool of some categories with this
// test's own questions; restore() puts everything back.
async function isolatePools(categories: string[]) {
  const hidden = (
    await db.practiceQuestion.findMany({ where: { category: { in: categories }, difficulty: "INTERMEDIATE", isActive: true }, select: { id: true } })
  ).map((q) => q.id);
  await db.practiceQuestion.updateMany({ where: { id: { in: hidden } }, data: { isActive: false } });
  const created: string[] = [];
  return {
    created,
    async add(data: Parameters<typeof db.practiceQuestion.create>[0]["data"]) {
      const q = await db.practiceQuestion.create({ data });
      created.push(q.id);
      return q;
    },
    async restore() {
      await db.itemResponse.deleteMany({ where: { questionId: { in: created } } });
      await db.practiceAttempt.deleteMany({ where: { questionId: { in: created } } });
      await db.practiceQuestion.deleteMany({ where: { id: { in: created } } });
      await db.practiceQuestion.updateMany({ where: { id: { in: hidden } }, data: { isActive: true } });
    },
  };
}

const listeningQ = (prompt: string, passage: string) => ({
  category: "LISTENING",
  difficulty: "INTERMEDIATE",
  type: "LISTENING_COMPREHENSION",
  prompt: `${prompt} [${run}]`,
  passage,
  options: JSON.stringify(["Room four", "Room one", "The lobby", "Online"]),
  correctAnswer: "Room four",
  timeLimitSeconds: 120,
});

test("new questions of ANY shape never expose raw data - on the wire, through Next in practice, and at import", async ({ page }) => {
  test.setTimeout(300_000);
  const pools = await isolatePools(["LISTENING"]);
  const user = await candidate(page, "shapes");
  try {
    await pools.add(listeningQ("Where is the meeting?", spec([["S1", "The meeting has moved to room four."], ["S2", "Thanks, I'll tell the team."]])));
    await pools.add(listeningQ("What must they bring?", spec([["S1", "Please bring the signed contract."], ["S2", "Of course."], ["S3", "And your ID card."]])));
    await pools.add(listeningQ("Who will present?", JSON.stringify({ video: { url: "x", "mystery-video-field": 1 } }))); // unknown spec
    await pools.add(listeningQ("Which printer is broken?", "{broken json")); // malformed

    // 1) What the server sends: sanitized stimulus only, never the spec.
    const api = await (await page.request.get("/api/practice/questions?category=LISTENING&difficulty=INTERMEDIATE&count=10")).json();
    assertCleanWire(api, "practice API");
    const byPrompt = new Map((api.questions as { prompt: string; passage: unknown; stimulus: { kind: string } }[]).map((q) => [q.prompt.replace(` [${run}]`, ""), q]));
    expect(byPrompt.get("Where is the meeting?")?.stimulus.kind).toBe("audio");
    expect(byPrompt.get("What must they bring?")?.stimulus.kind).toBe("audio");
    expect(byPrompt.get("Who will present?")?.stimulus.kind).toBe("none"); // unknown JSON -> nothing, not text
    expect(byPrompt.get("Which printer is broken?")?.stimulus.kind).toBe("none");
    for (const q of byPrompt.values()) expect(q.passage).toBeNull();

    // 2) On screen, clicking Next through every question.
    await page.goto("/practice/listening");
    await page.getByRole("button", { name: "Intermediate" }).click();
    let seen = 0;
    for (let i = 0; i < 6; i++) {
      await expect(page.getByText(/Question \d+ of \d+/).or(page.getByRole("heading", { name: "Session complete" }))).toBeVisible({ timeout: 30_000 });
      if (await page.getByRole("heading", { name: "Session complete" }).isVisible()) break;
      await assertClean(page, `practice question ${i + 1}`);
      const player = page.getByLabel("Listening recording");
      if (await player.isVisible()) {
        const speakers = (await player.innerText()).match(/between (\d) speakers/)?.[1];
        expect(["2", "3"]).toContain(speakers);
        await player.getByRole("button", { name: "Play audio" }).click();
        await assertClean(page, `practice question ${i + 1} after play`);
      }
      await page.locator(".card button").filter({ hasText: /^Room four$/ }).click();
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(page.getByText(/^(Correct\.|Not quite\.)/)).toBeVisible({ timeout: 30_000 });
      await assertClean(page, `practice feedback ${i + 1}`);
      await page.getByRole("button", { name: /Next question|Finish/ }).click();
      seen++;
    }
    expect(seen).toBe(4);
    await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();

    // 3) Future content: admin import refuses JSON the renderer can't show.
    await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    await loginAs(page, `e2e-raw-shapes-${run}@example.test`, password); // role is read at login
    const imported = await (
      await page.request.post("/api/admin/questions", {
        data: {
          allowDuplicates: true,
          questions: [
            { ...listeningQ("Bad import", "{broken json"), options: ["A", "B"], correctAnswer: "A", isActive: false },
            { ...listeningQ("Unknown spec import", JSON.stringify({ video: { url: "x" } })), options: ["A", "B"], correctAnswer: "A", isActive: false },
            { ...listeningQ("Good spec import", spec([["S1", "Hello."], ["S2", "Hi."]])), options: ["A", "B"], correctAnswer: "A", isActive: false },
          ],
        },
      })
    ).json();
    expect(imported.inserted).toBe(1);
    const errors = JSON.stringify(imported);
    expect(errors).toMatch(/isn't a recognised stimulus/);
    const good = await db.practiceQuestion.findFirst({ where: { prompt: `Good spec import [${run}]` } });
    if (good) pools.created.push(good.id);
    expect(good).toBeTruthy();
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await pools.restore();
  }
});

test("refreshing in the middle of a mock test never exposes raw data", async ({ page }) => {
  test.setTimeout(300_000);
  const pools = await isolatePools(["LISTENING"]);
  await pools.add(listeningQ("Where is the meeting?", spec([["S1", "The meeting has moved to room four."], ["S2", "Thanks, I'll tell the team."]])));
  await pools.add(listeningQ("Which printer is broken?", spec([["S1", "The printer on floor two is broken."], ["S2", "I'll call IT."]])));
  const template = await db.mockTestTemplate.create({
    data: { name: `Refresh check ${run}`, sections: { create: [{ order: 1, category: "LISTENING", difficulty: "INTERMEDIATE", questionCount: 2 }] } },
  });
  const previousDefaults = (await db.mockTestTemplate.findMany({ where: { isDefault: true }, select: { id: true } })).map((t) => t.id);
  await db.mockTestTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  await db.mockTestTemplate.update({ where: { id: template.id }, data: { isDefault: true } });
  const user = await candidate(page, "refresh");

  try {
    await throughEntry(page);
    await page.getByRole("button", { name: "Start section" }).click();
    const card = page.locator("div.rounded-lg.bg-white").first();
    await expect(card.getByLabel("Listening recording")).toBeVisible({ timeout: 30_000 });
    await assertClean(page, "before refresh");
    await card.locator("div.space-y-2 button").first().click();
    await card.getByRole("button", { name: "Submit & next" }).click();
    await expect(card.getByLabel("Listening recording")).toBeVisible({ timeout: 30_000 });

    // Refresh on the second listening question.
    await page.reload();
    await assertClean(page, "right after refresh");
    await throughEntry(page);
    await page.getByRole("button", { name: "Start section" }).click();
    await expect(card.getByLabel("Listening recording")).toBeVisible({ timeout: 30_000 });
    await expect(card.getByLabel("Listening recording")).toContainText("Plays left: 2 of 2");
    await assertClean(page, "after refresh + re-entry");
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.mockTestTemplate.update({ where: { id: template.id }, data: { isDefault: false } });
    if (previousDefaults.length) await db.mockTestTemplate.updateMany({ where: { id: { in: previousDefaults } }, data: { isDefault: true } });
    await db.mockTestSession.deleteMany({ where: { templateId: template.id } });
    await db.mockTestTemplate.delete({ where: { id: template.id } });
    await pools.restore();
  }
});

test("resuming a new-style exam after a refresh keeps its players and answers, and never exposes raw data", async ({ page }) => {
  test.setTimeout(420_000);
  const pools = await isolatePools(["LISTENING", "SPEAKING"]);
  const family = await db.examFamily.create({ data: { slug: `TEST_RAW_${run}`, name: `Raw check ${run}` } });
  const variant = await db.examVariant.create({ data: { familyId: family.id, slug: "RAW", name: "Raw check", scoreScale: "CEFR" } });
  const paper = await db.examPaper.create({
    data: { variantId: variant.id, order: 1, name: "Listening", durationSeconds: 1200, navigationMode: "FREE_WITHIN_SECTION", allowReview: true },
  });
  const part = await db.examPart.create({ data: { paperId: paper.id, order: 1, name: "Part 1" } });
  for (const [prompt, passage] of [
    ["Where is the meeting?", spec([["S1", "The meeting has moved to room four."], ["S2", "Thanks, I'll tell the team."]])],
    ["What must they bring?", spec([["S1", "Please bring the signed contract."], ["S2", "Of course."]])],
  ] as const) {
    await pools.add({ ...listeningQ(prompt, passage), examPartId: part.id });
  }
  await pools.add({
    category: "LISTENING",
    difficulty: "INTERMEDIATE",
    type: "SHORT_ANSWER",
    prompt: `Describe what the colleagues are doing. [${run}]`,
    passage: IMAGE,
    timeLimitSeconds: 120,
    examPartId: part.id,
  });
  const template = await db.mockTestTemplate.create({
    data: {
      name: `Raw v2 check ${run}`,
      examVariantId: variant.id,
      sections: { create: [{ order: 1, category: "LISTENING", difficulty: "INTERMEDIATE", questionCount: 3, examPartId: part.id }] },
    },
  });
  const previousDefaults = (await db.mockTestTemplate.findMany({ where: { isDefault: true }, select: { id: true } })).map((t) => t.id);
  await db.mockTestTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  await db.mockTestTemplate.update({ where: { id: template.id }, data: { isDefault: true } });
  const previousFlag = await db.featureFlag.findUnique({ where: { key: "exam_runner_v2" } });
  await db.featureFlag.upsert({ where: { key: "exam_runner_v2" }, create: { key: "exam_runner_v2", label: "Exam Runner v2", enabled: true }, update: { enabled: true } });
  const user = await candidate(page, "resume");

  try {
    await throughEntry(page);
    await expect(page.getByRole("heading", { name: "Listening" })).toBeVisible({ timeout: 30_000 });
    const sessionId = (await db.mockTestSession.findFirstOrThrow({ where: { userId: user.id } })).id;

    // Go to the "Where is the meeting?" question, check its player, answer it.
    const qButtons = page.getByRole("button", { name: /^Question \d/ });
    await expect(qButtons).toHaveCount(3);
    let answeredPrompt = "";
    for (let i = 0; i < 3; i++) {
      await qButtons.nth(i).click();
      await assertClean(page, `v2 question ${i + 1}`);
      const player = page.getByLabel("Listening recording");
      const picture = page.getByLabel("Picture");
      expect((await player.count()) + (await picture.count()), `v2 question ${i + 1} has a stimulus`).toBe(1);
      if ((await picture.count()) === 1) await expect(picture).toContainText("Three colleagues planning at a whiteboard");
      if ((await player.count()) === 1 && !answeredPrompt && (await page.getByText("Where is the meeting?").count())) {
        await expect(player).toContainText("A conversation between 2 speakers");
        await page.getByRole("radio", { name: "Room four" }).click();
        answeredPrompt = "Where is the meeting?";
      }
    }
    expect(answeredPrompt).toBe("Where is the meeting?");
    await expect(page.getByText("All changes saved")).toBeVisible({ timeout: 20_000 });
    assertCleanWire(await (await page.request.get(`/api/exam-sessions/${sessionId}`)).json(), "v2 state API");

    // Refresh -> back through the entry flow -> the SAME exam resumes.
    await page.reload();
    await assertClean(page, "v2 right after refresh");
    await throughEntry(page);
    await expect(page.getByRole("heading", { name: "Listening" })).toBeVisible({ timeout: 30_000 });
    expect(await db.mockTestSession.count({ where: { userId: user.id } })).toBe(1);
    for (let i = 0; i < 3; i++) {
      await qButtons.nth(i).click();
      await assertClean(page, `v2 resumed question ${i + 1}`);
      if (await page.getByText("Where is the meeting?").count()) {
        await expect(page.getByLabel("Listening recording")).toContainText("A conversation between 2 speakers");
        await expect(page.getByRole("radio", { name: "Room four" })).toHaveAttribute("aria-checked", "true"); // answer kept
      }
    }
    await page.screenshot({ path: "test-results/raw-guard/v2-resumed.png", fullPage: true });
    assertCleanWire(await (await page.request.get(`/api/exam-sessions/${sessionId}`)).json(), "v2 state API after resume");
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.featureFlag.deleteMany({ where: { key: "exam_runner_v2" } });
    if (previousFlag) await db.featureFlag.create({ data: { key: previousFlag.key, label: previousFlag.label, description: previousFlag.description, enabled: previousFlag.enabled } });
    await db.mockTestTemplate.update({ where: { id: template.id }, data: { isDefault: false } });
    if (previousDefaults.length) await db.mockTestTemplate.updateMany({ where: { id: { in: previousDefaults } }, data: { isDefault: true } });
    await db.mockTestSession.deleteMany({ where: { templateId: template.id } });
    await db.mockTestTemplate.delete({ where: { id: template.id } });
    await pools.restore();
    await db.examFamily.delete({ where: { id: family.id } });
  }
});
