import { test, expect, type Page } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { audioScriptHash } from "@/lib/audio-script-hash";
import { createTestUser, loginAs } from "./helpers";

// A complete standard mock test in a real browser (fake camera + mic): 14
// consecutive questions, each moved on with "Submit & next". Five listening
// questions carry passages shaped EXACTLY like production's audio specs
// (one marked as generated whose file is missing -> must fall back to the
// browser's voices; one that allows its transcript), plus a picture task
// with an image spec, and every other kind of task. After every question
// the whole screen is checked: no raw JSON, no spec field names, no S1/S2
// speaker ids, no hidden transcript.
test.use({
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] },
  permissions: ["camera", "microphone"],
});

const password = "correct-horse-battery-staple";
const run = Date.now();

function audioSpec(script: [string, string][], extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    audio: {
      script: script.map(([speaker, text]) => ({ speaker, text })),
      voices: { S1: "adult, clear, neutral international accent", S2: "adult, contrasting pitch, different English accent from S1" },
      speechRate: 1.0,
      pauseBetweenTurnsMs: 400,
      maxPlays: 2,
      ttsNotes: null,
      generationStatus: "not_generated",
      audioAssetKey: null,
      transcriptVisibleToCandidate: false,
      ...extra,
    },
  });
}

const INTERVIEW_SCRIPT: [string, string][] = [
  ["S1", "So, why are you interested in this role?"],
  ["S2", "I've been working in retail for two years, and I really enjoy helping customers."],
];
const LISTENING = [
  // "Generated", with a valid key + matching fingerprint, but the file isn't in storage.
  {
    prompt: "Why is the candidate interested in the role?",
    options: ["They enjoy helping customers", "They want a higher salary", "They dislike retail", "They are moving city"],
    passage: audioSpec(INTERVIEW_SCRIPT, {
      generationStatus: "generated",
      audioAssetKey: "question-audio/00000000-0000-4000-8000-000000000000.wav",
      audioScriptHash: audioScriptHash(INTERVIEW_SCRIPT.map(([speaker, text]) => ({ speaker, text })), 1.0),
    }),
  },
  // Transcript explicitly allowed -> shown only on request, with neutral labels.
  {
    prompt: "What time does the shop open?",
    options: ["8 o'clock", "9 o'clock", "10 o'clock", "Noon"],
    passage: audioSpec(
      [
        ["S1", "Excuse me, when does the shop open?"],
        ["S2", "At nine o'clock every day."],
      ],
      { transcriptVisibleToCandidate: true }
    ),
  },
  { prompt: "What is Dad doing?", options: ["Reading", "Washing the car", "Cooking", "Sleeping"], passage: audioSpec([["S1", "Where's Dad?"], ["S2", "He's in the garden. He's washing the car."]]) },
  { prompt: "Where are the speakers going?", options: ["The cinema", "The station", "The park", "A restaurant"], passage: audioSpec([["S1", "Shall we walk to the station?"], ["S2", "Yes, the train leaves in twenty minutes."]]) },
  { prompt: "What does the caller want?", options: ["A refund", "A new password", "A delivery date", "A manager"], passage: audioSpec([["S1", "Hello, I can't log in to my account."], ["S2", "No problem, I'll send you a new password."]]) },
];
const IMAGE_PASSAGE = JSON.stringify({
  image: {
    prompt: "Original illustration, clean flat style: a covered city bus stop on a rainy afternoon.",
    altText: "People waiting at a bus stop in the rain as a bus approaches.",
    keyElements: ["bus stop", "rain", "umbrella"],
    generationStatus: "not_generated",
    imageAssetKey: null,
  },
});

// Anything from the raw specs that must never be on screen.
const FORBIDDEN_ON_SCREEN = [
  /\{"/,
  /"script"/,
  /"speaker"/,
  /\bS1\b/,
  /\bS2\b/,
  /generationStatus/,
  /speechRate/,
  /maxPlays/,
  /audioAssetKey/,
  /audioScriptHash/,
  /ttsNotes/,
  /transcriptVisibleToCandidate/,
  /imageAssetKey/,
  /clean flat style/,
  /neutral international accent/,
  /why are you interested in this role/i, // hidden transcripts
  /washing the car\./,
  /train leaves in twenty minutes/,
];

const SECTIONS: [string, number][] = [
  ["LISTENING", 5],
  ["SPEAKING", 1],
  ["GRAMMAR", 1],
  ["VOCABULARY", 1],
  ["READING_COMPREHENSION", 1],
  ["READING", 1],
  ["CUSTOMER_SERVICE", 1],
  ["FLUENCY", 1],
  ["SITUATIONAL_JUDGEMENT", 1],
  ["INTERVIEW", 1],
];
const TOTAL = SECTIONS.reduce((n, [, c]) => n + c, 0);

async function assertNoRawSpec(page: Page, where: string) {
  const text = await page.locator("body").innerText();
  for (const bad of FORBIDDEN_ON_SCREEN) expect(text, `${where}: ${bad}`).not.toMatch(bad);
}

test("14 consecutive mock-test questions: proper tasks every time, raw question data never shown", async ({ page }) => {
  test.setTimeout(900_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const audioRequests: { url: string; status: number }[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/api/questions/")) audioRequests.push({ url: r.url(), status: r.status() });
  });

  // Controlled pools for the spec-shaped sections (restored afterwards).
  const hiddenIds = (
    await db.practiceQuestion.findMany({ where: { category: { in: ["LISTENING", "SPEAKING"] }, difficulty: "INTERMEDIATE", isActive: true }, select: { id: true } })
  ).map((q) => q.id);
  await db.practiceQuestion.updateMany({ where: { id: { in: hiddenIds } }, data: { isActive: false } });
  const created: string[] = [];
  for (const l of LISTENING) {
    const q = await db.practiceQuestion.create({
      data: {
        category: "LISTENING",
        difficulty: "INTERMEDIATE",
        type: "LISTENING_COMPREHENSION",
        prompt: `${l.prompt} [${run}]`,
        passage: l.passage,
        options: JSON.stringify(l.options),
        correctAnswer: l.options[0],
        timeLimitSeconds: 120,
      },
    });
    created.push(q.id);
  }
  const generatedQuestionId = created[0];
  const picture = await db.practiceQuestion.create({
    data: {
      category: "SPEAKING",
      difficulty: "INTERMEDIATE",
      type: "SHORT_ANSWER",
      prompt: `Describe the picture. Say where the people are and what the weather is like. [${run}]`,
      passage: IMAGE_PASSAGE,
      timeLimitSeconds: 60,
    },
  });
  created.push(picture.id);

  const template = await db.mockTestTemplate.create({
    data: {
      name: `Rendering check ${run}`,
      sections: { create: SECTIONS.map(([category, questionCount], i) => ({ order: i + 1, category, difficulty: "INTERMEDIATE", questionCount })) },
    },
  });
  const previousDefaults = (await db.mockTestTemplate.findMany({ where: { isDefault: true }, select: { id: true } })).map((t) => t.id);
  await db.mockTestTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  await db.mockTestTemplate.update({ where: { id: template.id }, data: { isDefault: true } });

  const email = `e2e-render-${run}@example.test`;
  const user = await createTestUser(email, password);
  await setPlan(user.id, "STARTER", { periodDays: 30 });

  try {
    await page.goto("/");
    await loginAs(page, email, password);

    // The candidate's browser never receives an internal field either.
    const api = await (await page.request.get("/api/practice/questions?category=LISTENING&difficulty=INTERMEDIATE&count=10")).json();
    const wire = JSON.stringify(api);
    for (const f of ["generationStatus", "audioAssetKey", "audioScriptHash", "voices", "ttsNotes", "maxPlays", "transcriptVisibleToCandidate", "neutral international accent"]) {
      expect(wire, f).not.toContain(f);
    }
    for (const q of api.questions) expect(q.passage).toBeNull(); // listening text is never sent as displayable text

    // The real entry flow: intro -> system check -> rules -> proctored shell.
    await page.goto("/mock-tests");
    await page.getByRole("button", { name: "Begin system check" }).click();
    await page.getByRole("button", { name: "Enable camera" }).click();
    await page.getByRole("button", { name: "Enable microphone" }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    const toRules = page.getByRole("button", { name: "Continue to rules" });
    await expect(toRules).toBeEnabled({ timeout: 20_000 });
    await toRules.click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Start test" }).click();

    const card = page.locator("div.rounded-lg.bg-white").first();
    const log: string[] = [];
    let answered = 0;
    let transcriptChecked = false;
    let generatedChecked = false;

    for (const [category, count] of SECTIONS) {
      await expect(page.getByRole("button", { name: "Start section" })).toBeVisible({ timeout: 60_000 });
      await assertNoRawSpec(page, `${category} intro`);
      await page.getByRole("button", { name: "Start section" }).click();

      for (let i = 0; i < count; i++) {
        const heading = card.getByRole("heading", { level: 3 });
        await expect(heading).toBeVisible({ timeout: 30_000 });
        const prompt = (await heading.innerText()).trim();
        const instruction = (await card.locator("p").first().innerText()).trim();
        log.push(`#${answered + 1} ${category}: ${instruction} | ${prompt}`);
        await assertNoRawSpec(page, `#${answered + 1} ${category}`);
        await expect(page.locator("span.font-mono").filter({ hasText: /^\d{2}:\d{2}$/ }).first()).toBeVisible(); // timer

        if (category === "LISTENING") {
          const player = card.getByLabel("Listening recording");
          await expect(player).toContainText("Listening task");
          await expect(player).toContainText("A conversation between 2 speakers");
          await expect(player).toContainText("Plays left: 2 of 2");
          expect(instruction).toMatch(/Listening · Play the recording, then choose the best answer/i);

          if (prompt.startsWith("What time does the shop open?")) {
            // Transcript allowed: only on request, with "Speaker 1/2", never S1/S2.
            await player.getByRole("button", { name: "Show transcript" }).click();
            await expect(player).toContainText("Speaker 1: Excuse me, when does the shop open?");
            await expect(player).toContainText("Speaker 2: At nine o'clock every day.");
            await player.getByRole("button", { name: "Hide transcript" }).click();
            transcriptChecked = true;
          } else {
            await expect(player.getByRole("button", { name: "Show transcript" })).toHaveCount(0);
          }

          await player.getByRole("button", { name: "Play audio" }).click();
          if (prompt.startsWith("Why is the candidate interested")) {
            // Generated audio requested from the protected route; its file is
            // missing (404) so the SAME play falls back to browser voices.
            await expect.poll(() => audioRequests.find((r) => r.url.endsWith(`/api/questions/${generatedQuestionId}/audio`))?.status, { timeout: 20_000 }).toBe(404);
            generatedChecked = true;
            await page.screenshot({ path: "test-results/mock-render/listening-fallback.png", fullPage: true });
          }
          // One play used (or given back if this browser can't speak at all -
          // then the friendly message shows instead of any data).
          await expect(player).toContainText(/Plays left: 1 of 2|Plays left: 2 of 2|can't be played right now/);
          await assertNoRawSpec(page, `#${answered + 1} after play`);
          if (answered === 2) await page.screenshot({ path: "test-results/mock-render/listening.png", fullPage: true });
        }
        if (category === "SPEAKING") {
          const pic = card.getByLabel("Picture");
          await expect(pic).toContainText("People waiting at a bus stop in the rain as a bus approaches.");
          expect(instruction).toMatch(/Picture task/i);
          await page.screenshot({ path: "test-results/mock-render/picture.png", fullPage: true });
        }

        // Answer it, then "Submit & next" / "Stop & next".
        const last = answered + 1 === TOTAL;
        if (await card.getByRole("button", { name: "Start recording" }).isVisible()) {
          await card.getByRole("button", { name: "Start recording" }).click();
          await expect(card.getByText("Recording...")).toBeVisible();
          await page.waitForTimeout(1200);
          await card.getByRole("button", { name: last ? "Stop & finish" : "Stop & next" }).click();
        } else {
          if (await card.locator("textarea").isVisible()) {
            await card.locator("textarea").fill("I would listen carefully, apologise, and explain the next steps clearly.");
          } else {
            await card.locator("div.space-y-2 button").first().click();
          }
          await card.getByRole("button", { name: last ? "Submit & finish" : "Submit & next" }).click();
        }
        answered++;
        if (!last && i + 1 < count) await expect(heading).not.toHaveText(prompt, { timeout: 30_000 });
      }
    }

    expect(answered).toBe(TOTAL);
    expect(transcriptChecked).toBe(true);
    expect(generatedChecked).toBe(true);

    await expect(page).toHaveURL(/\/mock-tests\/results\//, { timeout: 60_000 });
    await expect(page.getByText(/Application error|Internal Server Error/)).toHaveCount(0);
    await assertNoRawSpec(page, "results");

    const session = await db.mockTestSession.findFirstOrThrow({ where: { userId: user.id }, include: { attempts: { select: { questionId: true, recordingId: true } } } });
    expect(session.attempts).toHaveLength(TOTAL); // every one of the 14 answers saved
    for (const id of created.slice(0, 5)) expect(session.attempts.some((a) => a.questionId === id), id).toBe(true);
    expect(session.attempts.find((a) => a.questionId === picture.id)?.recordingId).toBeTruthy();
    expect(errors).toEqual([]);
    console.log(log.join("\n"));
  } finally {
    await db.user.delete({ where: { id: user.id } }); // cascades session + attempts
    await db.mockTestTemplate.update({ where: { id: template.id }, data: { isDefault: false } });
    if (previousDefaults.length) await db.mockTestTemplate.updateMany({ where: { id: { in: previousDefaults } }, data: { isDefault: true } });
    await db.mockTestSession.deleteMany({ where: { templateId: template.id } });
    await db.mockTestTemplate.delete({ where: { id: template.id } });
    await db.practiceAttempt.deleteMany({ where: { questionId: { in: created } } });
    await db.practiceQuestion.deleteMany({ where: { id: { in: created } } });
    await db.practiceQuestion.updateMany({ where: { id: { in: hiddenIds } }, data: { isActive: true } });
  }
});
