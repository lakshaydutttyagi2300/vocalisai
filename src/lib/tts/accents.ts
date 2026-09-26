// Accents a candidate can choose for natural-voice playback. Safe to import
// in the browser: labels and BCP-47 language tags only - which ElevenLabs
// voice speaks each accent is decided on the server (src/lib/tts/elevenlabs.ts).

export const ACCENTS = [
  { code: "IN", label: "Indian English", short: "India", lang: "en-IN" },
  { code: "US", label: "American English", short: "US", lang: "en-US" },
  { code: "UK", label: "British English", short: "UK", lang: "en-GB" },
] as const;

export type AccentCode = (typeof ACCENTS)[number]["code"];
export type VoiceGender = "female" | "male";

export const DEFAULT_ACCENT: AccentCode = "IN";

export function isAccentCode(value: unknown): value is AccentCode {
  return typeof value === "string" && ACCENTS.some((a) => a.code === value);
}

export function accentLang(code: AccentCode): string {
  return ACCENTS.find((a) => a.code === code)?.lang ?? "en-IN";
}
