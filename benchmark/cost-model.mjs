// PROJECTED cost model, not a benchmark measurement.
//
// Only ONE real data point exists so far: a 17.5-second synthetic clip
// (41 words -> 218 input tokens / 271 output tokens on Gemini).
// Everything below extrapolates from that single anchor using explicit,
// documented assumptions. Treat this as a planning tool, not a fact -
// re-run with real 1/5/10/30-minute recordings once available and replace
// the assumed constants with measured ones.
//
// Deterministic values (duration, word count, WPM) are computed the same
// way the real application will compute them: from application code, never
// from an AI call.

import {
  GROQ_WHISPER_TURBO,
  GEMINI_FLASH_LITE_2_5,
  estimateTranscriptionCostUsd,
  estimateAnalysisCostUsd,
} from "../providers/pricing.mjs";

const INR_PER_USD = 84;

// --- Assumptions, stated explicitly ---
const ASSUMED_WPM = 140; // anchored to the one real measurement; real candidates will vary a lot
const INPUT_FIXED_OVERHEAD_TOKENS = 160; // our analysis prompt template, measured: 218 - (41 words * ~1.4)
const INPUT_TOKENS_PER_WORD = 1.4; // derived from the one real data point, not a general constant

// Output tokens are modeled in tiers, not as unbounded linear growth, because
// the production prompt should instruct the model to stay concise regardless
// of transcript length (bounded JSON output is a deliberate cost control).
function assumedOutputTokens(durationMinutes) {
  if (durationMinutes <= 1) return 280; // matches the real 17.5s measurement's order of magnitude
  if (durationMinutes <= 5) return 450;
  if (durationMinutes <= 10) return 600;
  return 900; // 30-minute / full assessment, one combined analysis call
}

function wordsFor(durationMinutes) {
  return Math.round(ASSUMED_WPM * durationMinutes);
}

function modelScenario(label, durationMinutes, countInAssessments = 1) {
  const words = wordsFor(durationMinutes);
  const durationSeconds = durationMinutes * 60;

  const transcriptionUsd = estimateTranscriptionCostUsd(durationSeconds, GROQ_WHISPER_TURBO) * countInAssessments;

  const inputTokens = INPUT_FIXED_OVERHEAD_TOKENS + words * INPUT_TOKENS_PER_WORD;
  const outputTokens = assumedOutputTokens(durationMinutes);
  const inputUsd =
    (inputTokens / 1e6) * GEMINI_FLASH_LITE_2_5.usdPerMillionInputTokens * countInAssessments;
  const outputUsd =
    (outputTokens / 1e6) * GEMINI_FLASH_LITE_2_5.usdPerMillionOutputTokens * countInAssessments;

  const otherUsd = 0; // no other paid provider in the current architecture

  const totalUsd = transcriptionUsd + inputUsd + outputUsd + otherUsd;

  return {
    scenario: label,
    assessments: countInAssessments,
    minutes_per_assessment: durationMinutes,
    assumed_words_per_assessment: words,
    transcription_usd: transcriptionUsd,
    ai_input_usd: inputUsd,
    ai_output_usd: outputUsd,
    other_usd: otherUsd,
    total_usd: totalUsd,
    total_inr: totalUsd * INR_PER_USD,
  };
}

const scenarios = [
  modelScenario("1-minute speaking response", 1),
  modelScenario("5-minute practice test", 5),
  modelScenario("10-minute practice test", 10),
  modelScenario("30-minute full assessment", 30),
  modelScenario("1,000 assessments (avg 10 min each)", 10, 1000),
];

function fmtUsd(n) {
  return `$${n.toFixed(6)}`;
}
function fmtInr(n) {
  return `₹${n.toFixed(4)}`;
}

console.log("=== ProActing Cost MODEL (projected, not measured beyond one 17.5s sample) ===\n");
console.log(
  `Anchors: Groq ${GROQ_WHISPER_TURBO.model} @ $${GROQ_WHISPER_TURBO.usdPerHourAudio}/hr | Gemini ${GEMINI_FLASH_LITE_2_5.model} @ $${GEMINI_FLASH_LITE_2_5.usdPerMillionInputTokens}/$${GEMINI_FLASH_LITE_2_5.usdPerMillionOutputTokens} per 1M in/out tokens\n`
);

for (const s of scenarios) {
  console.log(`--- ${s.scenario} ---`);
  console.log(`  Assumed words: ${s.assumed_words_per_assessment} (x${s.assessments} assessment(s))`);
  console.log(`  Transcription: ${fmtUsd(s.transcription_usd)}`);
  console.log(`  AI input:      ${fmtUsd(s.ai_input_usd)}`);
  console.log(`  AI output:     ${fmtUsd(s.ai_output_usd)}`);
  console.log(`  Other:         ${fmtUsd(s.other_usd)}`);
  console.log(`  TOTAL:         ${fmtUsd(s.total_usd)}  (${fmtInr(s.total_inr)})`);
  console.log("");
}
