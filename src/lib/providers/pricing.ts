// Single source of truth for provider unit pricing.
// Sourced directly from official provider pages, NOT third-party aggregators.
//
// Groq: https://console.groq.com/docs/models (whisper-large-v3-turbo)
// Gemini: https://ai.google.dev/gemini-api/docs/pricing (checked live, last_updated 2026-09-11 UTC)
//
// Re-verify these against the live pages before trusting cost projections for
// a real launch decision - provider pricing changes without much notice.

export interface ProviderPricing {
  provider: string;
  model: string;
  usdPerHourAudio?: number;
  usdPerMillionInputTokens?: number;
  usdPerMillionOutputTokens?: number;
  sourceCheckedAt: string;
  sourceUrl?: string;
}

export const GROQ_WHISPER_TURBO: ProviderPricing = {
  provider: "groq",
  model: "whisper-large-v3-turbo",
  usdPerHourAudio: 0.04,
  sourceCheckedAt: "2026-09-14",
};

// gemini-2.5-flash-lite and gemini-2.5-flash were BOTH confirmed working
// earlier in this same build (Phase 4's benchmark), then confirmed returning
// HTTP 404 "no longer available to new users" a few hours later while
// building Phase 8 - Google deprecated them mid-session. Re-verified live
// against the API (not just the pricing page) before pinning these.
export const GEMINI_FLASH_LITE_3_1: ProviderPricing = {
  provider: "gemini",
  model: "gemini-3.1-flash-lite",
  usdPerMillionInputTokens: 0.25, // text/image/video input
  usdPerMillionOutputTokens: 1.5,
  sourceCheckedAt: "2026-09-14",
  sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
};

// Audio input for this model is priced separately from text/image/video input.
export const GEMINI_FLASH_LITE_3_1_AUDIO_INPUT_PER_MILLION = 0.5;

// Fallback if the pinned model errors or gets deprecated too.
export const GEMINI_FLASH_LITE_3_5: ProviderPricing = {
  provider: "gemini",
  model: "gemini-3.5-flash-lite",
  usdPerMillionInputTokens: 0.3,
  usdPerMillionOutputTokens: 2.5,
  sourceCheckedAt: "2026-09-14",
  sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
};

export function estimateTranscriptionCostUsd(
  durationSeconds: number,
  pricing: ProviderPricing = GROQ_WHISPER_TURBO
): number {
  return (durationSeconds / 3600) * (pricing.usdPerHourAudio ?? 0);
}

export function estimateAnalysisCostUsd(
  textInputTokens: number,
  outputTokens: number,
  audioInputTokens = 0,
  pricing: ProviderPricing = GEMINI_FLASH_LITE_3_1
): number {
  const audioRate =
    pricing.model === GEMINI_FLASH_LITE_3_1.model ? GEMINI_FLASH_LITE_3_1_AUDIO_INPUT_PER_MILLION : (pricing.usdPerMillionInputTokens ?? 0);
  return (
    (textInputTokens / 1e6) * (pricing.usdPerMillionInputTokens ?? 0) +
    (audioInputTokens / 1e6) * audioRate +
    (outputTokens / 1e6) * (pricing.usdPerMillionOutputTokens ?? 0)
  );
}
