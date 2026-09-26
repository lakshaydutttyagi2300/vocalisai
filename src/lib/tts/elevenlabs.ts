// ElevenLabs text-to-speech. SERVER ONLY: the API key is read from
// process.env.ELEVENLABS_API_KEY and never sent to the browser (there is no
// NEXT_PUBLIC_ variant, and nothing here is imported by client components).
//
// Defaults (checked against ElevenLabs' docs, Sep 2026): model
// eleven_flash_v2_5 - the cheapest (half the per-character price of
// multilingual/v3) and fastest, English supported. American and British
// voices are ElevenLabs' built-in "premade" voices, available to every
// account; the Indian English voices come from the shared Voice Library.
// Every voice and the model can be swapped with env vars, no code change.

import type { AccentCode, VoiceGender } from "@/lib/tts/accents";

const API = "https://api.elevenlabs.io/v1";

export const DEFAULT_TTS_MODEL = "eleven_flash_v2_5";

export const DEFAULT_VOICES: Record<AccentCode, Record<VoiceGender, string>> = {
  IN: { female: "vnJXCu1mkdsxb9UdCYZp" /* Sweta - clear, educational */, male: "w2VczpnpJO48HDyBg1xV" /* Amay - professional */ },
  US: { female: "XrExE9yKIg1WjnnlVkGX" /* Matilda (premade) */, male: "cjVigY5qzO86Huf0OWal" /* Eric (premade) */ },
  UK: { female: "Xb7hH8MSUJpSbSDYk0k2" /* Alice (premade) */, male: "JBFqnCBsd6RMkjVDRZzb" /* George (premade) */ },
};

export function ttsModel(): string {
  return process.env.ELEVENLABS_MODEL_ID || DEFAULT_TTS_MODEL;
}

/** e.g. ELEVENLABS_VOICE_IN_F / ELEVENLABS_VOICE_UK_M override the defaults. */
export function voiceFor(accent: AccentCode, gender: VoiceGender): string {
  return process.env[`ELEVENLABS_VOICE_${accent}_${gender === "female" ? "F" : "M"}`] || DEFAULT_VOICES[accent][gender];
}

export function isElevenLabsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

/** Credits a request will use: Flash models cost half a credit per character. */
export function creditCost(text: string, model = ttsModel()): number {
  return Math.ceil(text.length * (model.includes("flash") || model.includes("turbo") ? 0.5 : 1));
}

// (No TypeScript parameter properties here: the offline scripts import this
// file straight into Node, which only strips types.)
export class ElevenLabsError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.status = status;
  }
}

export async function elevenLabsSpeech(text: string, voiceId: string, model = ttsModel()): Promise<Buffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new ElevenLabsError("ElevenLabs is not configured.", null);
  const res = await fetch(`${API}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new ElevenLabsError(`ElevenLabs returned ${res.status}${detail ? `: ${detail}` : ""}`, res.status);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 100) throw new ElevenLabsError("ElevenLabs returned an empty audio file.", res.status);
  return bytes;
}

// The account's remaining monthly credits, cached for a minute so a burst
// of requests doesn't hit the API each time. Null when it can't be read.
let quotaCache: { at: number; remaining: number | null } | null = null;

export async function elevenLabsRemainingCredits(now = Date.now()): Promise<number | null> {
  if (quotaCache && now - quotaCache.at < 60_000) return quotaCache.remaining;
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;
  let remaining: number | null = null;
  try {
    const res = await fetch(`${API}/user/subscription`, { headers: { "xi-api-key": key }, signal: AbortSignal.timeout(10_000) });
    if (res.ok) {
      const data = (await res.json()) as { character_count?: number; character_limit?: number };
      if (typeof data.character_count === "number" && typeof data.character_limit === "number") {
        remaining = data.character_limit - data.character_count;
      }
    }
  } catch {
    remaining = null;
  }
  quotaCache = { at: now, remaining };
  return remaining;
}

/** Lets a caller (or a test) record credits just spent without waiting for the next refresh. */
export function noteCreditsSpent(credits: number) {
  if (quotaCache && quotaCache.remaining !== null) quotaCache.remaining -= credits;
}

export function resetElevenLabsQuotaCache() {
  quotaCache = null;
}
