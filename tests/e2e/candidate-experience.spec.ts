import { test, expect, type Page } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";

// The whole candidate side in a real browser: every section in the
// candidate menu opens without errors, the grouped menu and phone menu
// work, a practice session can be done by clicking, a speech analysis and a
// mock exam show up in their own sections and open, and the admin area stays
// closed to candidates.
const password = "correct-horse-battery-staple";

const CANDIDATE_PAGES: { path: string; heading: RegExp }[] = [
  { path: "/dashboard", heading: /Good (morning|afternoon|evening)/ },
  { path: "/practice", heading: /Practice Library/ },
  { path: "/practice/conversation", heading: /./ },
  { path: "/practice/quick", heading: /./ },
  { path: "/goal/choose", heading: /./ },
  { path: "/practice/grammar", heading: /Grammar/ },
  { path: "/mock-tests", heading: /Prepare for your assessment/ },
  { path: "/mock-tests/history", heading: /My mock exam results/ },
  { path: "/speech-analysis", heading: /Speech Analysis/ },
  { path: "/progress", heading: /Progress/ },
  { path: "/coach", heading: /./ },
  { path: "/billing", heading: /./ },
  { path: "/profile", heading: /./ },
];

async function candidate(page: Page, tag: string) {
  const email = `e2e-cand-${tag}-${Date.now()}@example.test`;
  const user = await createTestUser(email, password, "Asha Candidate");
  await setPlan(user.id, "STARTER", { periodDays: 30 });
  await page.goto("/");
  await loginAs(page, email, password);
  return user;
}

test("every candidate section opens without errors, and the admin area stays closed", async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  const user = await candidate(page, "pages");

  try {
    for (const { path, heading } of CANDIDATE_PAGES) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBeLessThan(400);
      await expect(page.getByRole("heading", { level: 1 }).first(), path).toHaveText(heading, { timeout: 30_000 });
      await expect(page.getByText(/Application error|Unhandled Runtime Error|Internal Server Error/)).toHaveCount(0);
    }
    expect(errors).toEqual([]);

    // Admin stays separate: no admin menu, no admin data for a candidate.
    await page.goto("/admin");
    await expect(page.getByRole("navigation", { name: "Admin" })).toHaveCount(0);
    expect((await page.request.get("/api/admin/exam-catalogue")).status()).toBe(403);
    expect((await page.request.get("/api/admin/templates")).status()).toBe(403);
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});

test("the candidate menu groups every section, highlights where you are, and works on a phone", async ({ page }) => {
  test.setTimeout(180_000);
  const user = await candidate(page, "nav");
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/dashboard");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav).toBeVisible();

    // One line at laptop width.
    const header = (await page.locator("header").boundingBox())!;
    expect(header.height).toBeLessThan(90);
    await page.screenshot({ path: "test-results/candidate/nav.png", clip: { x: 0, y: 0, width: 1280, height: 90 } });

    // Every group's items are reachable and navigate.
    const groups: [string, string, RegExp][] = [
      ["Practice", "AI conversation", /\/practice\/conversation$/],
      ["Practice", "My skills", /\/skills$/],
      ["Mock Exams", "My results", /\/mock-tests\/history$/],
      ["Account", "Plan & billing", /\/billing$/],
    ];
    for (const [group, item, url] of groups) {
      await nav.getByRole("button", { name: group }).click();
      await nav.getByRole("link", { name: new RegExp(`^${item}`) }).click();
      await expect(page).toHaveURL(url);
      await expect(nav.getByRole("button", { name: group })).toHaveAttribute("data-active", "true");
    }
    await nav.getByRole("button", { name: "Practice" }).click();
    await page.screenshot({ path: "test-results/candidate/practice-menu.png", clip: { x: 0, y: 0, width: 1280, height: 420 } });
    await page.keyboard.press("Escape");

    for (const [name, url] of [["Speech Analysis", /\/speech-analysis$/], ["Progress", /\/progress$/], ["AI Coach", /\/coach$/], ["Dashboard", /\/dashboard$/]] as const) {
      await nav.getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(url);
      await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
    }

    // Phone: one menu listing every candidate page under its section.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Toggle menu" }).click();
    const mobile = page.getByRole("navigation", { name: "Main" });
    for (const name of ["Dashboard", "My skills", "Practice library", "AI conversation", "Quick practice", "My goal plan", "Take a mock exam", "My results", "Speech Analysis", "Progress", "AI Coach", "Profile", "Plan & billing"]) {
      await expect(mobile.getByRole("link", { name, exact: true })).toBeVisible();
    }
    await page.screenshot({ path: "test-results/candidate/phone-menu.png", fullPage: true });
    await mobile.getByRole("link", { name: "Speech Analysis", exact: true }).click();
    await expect(page).toHaveURL(/\/speech-analysis$/);
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});

test("a practice session can be done entirely by clicking, and shows up on the dashboard", async ({ page }) => {
  test.setTimeout(180_000);
  const user = await candidate(page, "practice");
  try {
    await page.goto("/practice");
    await page.getByRole("link", { name: /^Grammar/ }).first().click();
    await expect(page).toHaveURL(/\/practice\/grammar$/);
    await page.getByRole("button", { name: "Beginner" }).click();

    // Answer every question in the session by picking an option.
    for (let i = 0; i < 10; i++) {
      await expect(page.getByText(/Question \d+ of \d+/).or(page.getByRole("heading", { name: "Session complete" }))).toBeVisible({ timeout: 30_000 });
      if (await page.getByRole("heading", { name: "Session complete" }).isVisible()) break;
      await page.locator(".card button").first().click();
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(page.getByText(/^(Correct\.|Not quite\.)/)).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: /Next question|Finish/ }).click();
    }
    await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
    await expect(page.getByText(/You scored \d+ \/ \d+ correct/)).toBeVisible();

    const attempts = await db.practiceAttempt.count({ where: { userId: user.id, category: "GRAMMAR" } });
    expect(attempts).toBeGreaterThan(0);
    await page.goto("/dashboard");
    await expect(page.getByText(`${attempts} practice attempt`)).toBeVisible();
  } finally {
    await db.practiceAttempt.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
});

test("speech analyses and mock exams each appear in their own candidate section and open", async ({ page }) => {
  test.setTimeout(180_000);
  const user = await candidate(page, "history");
  const question = await db.practiceQuestion.findFirstOrThrow({ where: { category: "READING", isActive: true } });

  // A recorded + analysed answer (stored rows only - no AI call is made by this test).
  const recording = await db.practiceRecording.create({ data: { userId: user.id, filePath: `recordings/${user.id}/e2e.webm`, mimeType: "audio/webm", durationSeconds: 20 } });
  const attempt = await db.practiceAttempt.create({
    data: { userId: user.id, questionId: question.id, category: "READING", difficulty: question.difficulty, recordingId: recording.id, timeTakenSeconds: 20, score: 78 },
  });
  await db.speechAnalysis.create({
    data: {
      attemptId: attempt.id,
      transcript: "The quick brown fox jumps over the lazy dog, um, again.",
      wordCount: 12,
      durationSeconds: 20,
      wpm: 136,
      paceClassification: "balanced", // a real PaceClassification value (speech-metrics.ts)
      fillerCount: 1,
      fillerBreakdown: JSON.stringify({ um: 1 }),
      repetitionCount: 0,
      repetitionExamples: "[]",
      longPauses: "[]",
      // The full VoiceAnalysisResult shape a real analysis stores.
      aiAnalysisJson: JSON.stringify({
        pronunciation: { rating: "strong", mispronouncedWords: [], articulation: "Clear.", difficultSounds: [], intelligibility: "Easy to follow." },
        fluency: { rating: "adequate", hesitations: "One short pause.", fillers: "One 'um'.", repetitions: "None.", longPauses: "None.", smoothness: "Mostly smooth." },
        grammar: { rating: "weak", issues: [{ excerpt: "jumps over the lazy dog again", problem: "Awkward ending.", correction: "jumps over the lazy dog once more" }], overallComment: "Some slips." },
        vocabulary: { rating: "adequate", assessment: "Simple.", professionalTermsUsed: [], repetitiveWords: [] },
        voiceClarity: { rating: "strong", articulation: "Clear.", volumeComment: "Good.", clarity: "Clear.", intelligibility: "High." },
        delivery: { rating: "adequate", confidenceIndicators: "Sounds fairly confident.", vocalVariation: "Some.", engagement: "Moderate.", responseCompleteness: "Complete." },
        customerHandling: { applicable: false, empathyRating: "not_applicable", relevanceRating: "not_applicable", problemSolvingRating: "not_applicable", comment: "" },
      }),
      transcriptionProvider: "e2e",
      transcriptionModel: "e2e",
      analysisProvider: "e2e",
      analysisModel: "e2e",
      estimatedCostUsd: 0,
    },
  });

  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  try {
    // Speech Analysis section: summary numbers + the card, which opens the full result.
    await page.goto("/speech-analysis");
    await expect(page.getByText("136 wpm").first()).toBeVisible();
    const card = page.getByRole("list", { name: "Speech analyses" }).getByRole("link").first();
    await expect(card).toContainText("136 wpm (balanced)");
    await expect(card).toContainText("Pronunciation: Strong");
    await expect(card).toContainText("Fluency: Adequate");
    await expect(card).toContainText("Grammar: Needs work");
    await page.screenshot({ path: "test-results/candidate/speech-analysis.png", fullPage: true });
    await card.click();
    await expect(page).toHaveURL(new RegExp(`/practice/results/${attempt.id}$`));
    await expect(page.getByText("Clear.").first()).toBeVisible({ timeout: 30_000 }); // the full breakdown rendered
    await expect(page.getByText(/Application error|Internal Server Error/)).toHaveCount(0);

    // A standard mock exam, started and ended through the real API.
    const created = await (await page.request.post("/api/mock-tests/sessions")).json();
    expect(created.sessionId).toBeTruthy();
    await page.request.patch(`/api/mock-tests/sessions/${created.sessionId}`);

    await page.goto("/mock-tests/history");
    const results = page.getByRole("list", { name: "Mock exam results" });
    await expect(results.getByRole("link")).toHaveCount(1);
    await expect(results.getByRole("link").first()).toContainText(created.template.name);
    await expect(results.getByRole("link").first()).toContainText("Completed");
    await page.screenshot({ path: "test-results/candidate/history.png", fullPage: true });
    await results.getByRole("link").first().click();
    await expect(page).toHaveURL(new RegExp(`/mock-tests/results/${created.sessionId}$`));

    // Dashboard shows both.
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: new RegExp(created.template.name) })).toBeVisible();
    await expect(page.getByText("136 wpm · 1 filler")).toBeVisible();
    await expect(page.getByText("Score 78")).toBeVisible(); // a scored voice answer is never shown as "Incorrect"
    await page.screenshot({ path: "test-results/candidate/dashboard.png", fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    await db.user.delete({ where: { id: user.id } }); // cascades attempts, analysis, recording, sessions
  }
});
