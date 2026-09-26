// Natural-voice speech with caching, per-user daily limits and a credit
// safety margin. Every generated clip is stored once under a hash of
// (model, voice, text) and reused for every candidate after that, so the
// same sentence is only ever paid for once. When a new clip can't be made
// (no key, switched off, daily limit reached, credits running low, or the
// provider fails) the caller gets a reason and the browser falls back to
// the device's own voice - playback never just breaks.

import { createHash } from "crypto";
import { db } from "@/lib/db";
import { getEffectivePlan, type Plan } from "@/lib/entitlements";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { readRecording, storedFileExists, writeRecording } from "@/lib/storage";
import type { AccentCode, VoiceGender } from "@/lib/tts/accents";
import {
  creditCost,
  elevenLabsRemainingCredits,
  elevenLabsSpeech,
  isElevenLabsConfigured,
  noteCreditsSpent,
  ttsModel,
  voiceFor,
} from "@/lib/tts/elevenlabs";

export const TTS_FLAG = "NATURAL_VOICES";
/** UsageEvent.feature for each NEW clip generated (cache hits are free and not counted). */
export const TTS_USAGE_FEATURE = "TTS_GENERATION";
export const MAX_TTS_CHARS = 1500;

/** New natural-voice clips per candidate per rolling 24 hours. */
export const TTS_DAILY_LIMITS: Record<Plan, number> = {
  FREE: 5,
  STARTER: 25,
  PROFESSIONAL: 60,
  PREMIUM: 120,
};

/** Credits always kept in reserve, so the account is never drained to zero. */
export function reserveCredits(): number {
  const n = Number(process.env.ELEVENLABS_RESERVE_CREDITS);
  return Number.isFinite(n) && n >= 0 ? n : 1000;
}

export type SpeechFailure = "empty" | "too_long" | "not_configured" | "disabled" | "daily_limit" | "budget" | "provider_error";
export type SpeechResult = { ok: true; id: string; cached: boolean } | { ok: false; reason: SpeechFailure };

export const SPEECH_FAILURE_MESSAGES: Record<SpeechFailure, string> = {
  empty: "There's nothing to read out.",
  too_long: "This is too long for natural-voice playback.",
  not_configured: "Natural voices aren't set up yet.",
  disabled: "Natural voices are switched off right now.",
  daily_limit: "You've used today's natural-voice plays.",
  budget: "Natural voices are resting for now.",
  provider_error: "The natural voice couldn't be loaded.",
};

export function normaliseSpeechText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** 40-hex id of a clip; its file lives at tts/<id>.mp3. */
export function speechId(text: string, voiceId: string, model = ttsModel()): string {
  return createHash("sha256").update(`${model}|${voiceId}|${text}`).digest("hex").slice(0, 40);
}

export const speechKey = (id: string) => `tts/${id}.mp3`;
export const isSpeechId = (id: string) => /^[a-f0-9]{40}$/.test(id);

export async function readSpeech(id: string): Promise<Buffer> {
  if (!isSpeechId(id)) throw new Error("Invalid speech id");
  return readRecording(speechKey(id));
}

async function generationsInLast24h(userId: string): Promise<number> {
  return db.usageEvent.count({ where: { userId, feature: TTS_USAGE_FEATURE, createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
}

export async function getSpeech(input: { userId: string; text: string; accent: AccentCode; gender?: VoiceGender }): Promise<SpeechResult> {
  const text = normaliseSpeechText(input.text);
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > MAX_TTS_CHARS) return { ok: false, reason: "too_long" };

  const voiceId = voiceFor(input.accent, input.gender ?? "female");
  const model = ttsModel();
  const id = speechId(text, voiceId, model);

  // Already generated for anyone? Free to replay - no limits apply.
  if (await storedFileExists(speechKey(id))) return { ok: true, id, cached: true };

  if (!isElevenLabsConfigured()) return { ok: false, reason: "not_configured" };
  if (!(await isFeatureEnabled(TTS_FLAG))) return { ok: false, reason: "disabled" };

  const plan = await getEffectivePlan(input.userId);
  if ((await generationsInLast24h(input.userId)) >= TTS_DAILY_LIMITS[plan]) return { ok: false, reason: "daily_limit" };

  const cost = creditCost(text, model);
  const remaining = await elevenLabsRemainingCredits();
  if (remaining !== null && remaining - cost < reserveCredits()) return { ok: false, reason: "budget" };

  let audio: Buffer;
  try {
    audio = await elevenLabsSpeech(text, voiceId, model);
  } catch (err) {
    console.error("natural voice generation failed", err instanceof Error ? err.message : err);
    return { ok: false, reason: "provider_error" };
  }
  await writeRecording(speechKey(id), audio, "audio/mpeg");
  noteCreditsSpent(cost);
  await db.usageEvent.create({ data: { userId: input.userId, feature: TTS_USAGE_FEATURE } });
  return { ok: true, id, cached: false };
}
