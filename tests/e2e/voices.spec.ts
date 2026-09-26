import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";

// Phase 3 in a real browser: the results page offers natural-voice Listen
// buttons (model answer + mispronounced word) and an accent picker that is
// remembered. The test environment has no ElevenLabs key, so this also
// proves the graceful fallback: playback switches to the device's voice
// with a one-line note, never an error.
const password = "correct-horse-battery-staple";
const SHOTS = process.env.E2E_SCREENSHOT_DIR;

test("results page: Listen buttons, accent picker, and the device-voice fallback", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `e2e-voices-${Date.now()}@example.test`;
  const user = await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);

  const question = await db.practiceQuestion.findFirstOrThrow({ where: { category: "READING", isActive: true } });
  const recording = await db.practiceRecording.create({ data: { userId: user.id, filePath: `recordings/${user.id}/e2e.webm`, mimeType: "audio/webm", durationSeconds: 15 } });
  const attempt = await db.practiceAttempt.create({
    data: { userId: user.id, questionId: question.id, category: "READING", difficulty: question.difficulty, recordingId: recording.id, timeTakenSeconds: 15 },
  });
  await db.speechAnalysis.create({
    data: {
      attemptId: attempt.id,
      transcript: "I want to particularly thank the team.",
      wordCount: 7,
      durationSeconds: 15,
      wpm: 120,
      paceClassification: "balanced",
      fillerCount: 0,
      fillerBreakdown: "{}",
      repetitionCount: 0,
      repetitionExamples: "[]",
      longPauses: "[]",
      aiAnalysisJson: JSON.stringify({
        pronunciation: { rating: "adequate", mispronouncedWords: [{ word: "particularly", note: "Say every syllable.", phoneticHint: "par-TIK-yuh-ler-lee" }], articulation: "Clear.", difficultSounds: [], intelligibility: "Easy to follow." },
        fluency: { rating: "adequate", hesitations: "None.", fillers: "None.", repetitions: "None.", longPauses: "None.", smoothness: "Smooth." },
        grammar: { rating: "strong", issues: [], overallComment: "Good." },
        vocabulary: { rating: "adequate", assessment: "Simple.", professionalTermsUsed: [], repetitiveWords: [] },
        voiceClarity: { rating: "strong", articulation: "Clear.", volumeComment: "Good.", clarity: "Clear.", intelligibility: "High." },
        delivery: { rating: "adequate", confidenceIndicators: "Fine.", vocalVariation: "Some.", engagement: "Moderate.", responseCompleteness: "Complete." },
        customerHandling: { applicable: false, empathyRating: "not_applicable", relevanceRating: "not_applicable", problemSolvingRating: "not_applicable", comment: "" },
      }),
      improvedAnswerJson: JSON.stringify({
        improvedAnswer: "I would particularly like to thank the whole team for their support.",
        improvements: { grammar: false, sentenceStructure: true, vocabulary: true, professionalTone: true, clarity: false },
        summary: "More complete and professional.",
      }),
      transcriptionProvider: "e2e",
      transcriptionModel: "e2e",
      analysisProvider: "e2e",
      analysisModel: "e2e",
      estimatedCostUsd: 0,
    },
  });

  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(`/practice/results/${attempt.id}`);
    const hear = page.getByRole("button", { name: /Hear this answer/ });
    await expect(hear).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /^Listen/ }).first()).toBeVisible();

    // Accent picker: choose UK, and it's remembered across a reload.
    const picker = page.getByRole("radiogroup", { name: "Voice accent" }).first();
    await picker.getByRole("radio", { name: "UK" }).click();
    await expect(picker.getByRole("radio", { name: "UK" })).toHaveAttribute("aria-checked", "true");
    await expect(hear).toHaveAccessibleName(/British English/);
    await page.reload();
    await expect(page.getByRole("button", { name: /Hear this answer \(British English\)/ })).toBeVisible({ timeout: 30_000 });

    // No ElevenLabs key in tests: it falls back to the device voice, with a note.
    await page.getByRole("button", { name: /Hear this answer/ }).click();
    await expect(page.getByText(/Playing with your device's voice instead/)).toBeVisible({ timeout: 15_000 });
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/voices-results.png`, fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});
