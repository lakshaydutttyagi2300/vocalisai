// Standalone benchmark/cost-model tooling only (run via `node benchmark/*.mjs`,
// outside the Next.js app). The application itself uses the parallel,
// TypeScript versions under src/lib/providers/ - kept separate because these
// plain .mjs scripts need to run without the Next.js build pipeline.
//
// Single source of truth for provider unit pricing.
// Sourced directly from official provider pages, NOT third-party aggregators.
//
// Groq: https://console.groq.com/docs/models (whisper-large-v3-turbo)
// Gemini: https://ai.google.dev/gemini-api/docs/pricing (checked live, last_updated 2026-09-11 UTC)
//
// Re-verify these against the live pages before trusting cost projections for
// a real launch decision - provider pricing changes without much notice.

export const GROQ_WHISPER_TURBO = {
  provider: "groq",
  model: "whisper-large-v3-turbo",
  usdPerHourAudio: 0.04,
  sourceCheckedAt: "2026-09-14",
};

export const GEMINI_FLASH_LITE_2_5 = {
  provider: "gemini",
  model: "gemini-2.5-flash-lite",
  usdPerMillionInputTokens: 0.1, // text/image/video input
  usdPerMillionOutputTokens: 0.4,
  sourceCheckedAt: "2026-09-14",
  sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
};

// Fallback if quality proves insufficient or the Lite model is deprecated.
export const GEMINI_FLASH_2_5 = {
  provider: "gemini",
  model: "gemini-2.5-flash",
  usdPerMillionInputTokens: 0.3,
  usdPerMillionOutputTokens: 2.5,
  sourceCheckedAt: "2026-09-14",
  sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
};

export function estimateTranscriptionCostUsd(durationSeconds, pricing = GROQ_WHISPER_TURBO) {
  return (durationSeconds / 3600) * pricing.usdPerHourAudio;
}

export function estimateAnalysisCostUsd(inputTokens, outputTokens, pricing = GEMINI_FLASH_LITE_2_5) {
  return (
    (inputTokens / 1e6) * pricing.usdPerMillionInputTokens +
    (outputTokens / 1e6) * pricing.usdPerMillionOutputTokens
  );
}
