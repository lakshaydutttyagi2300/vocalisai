import type { z } from "zod";

// Gemini's JSON mode guarantees JSON, not the shape the prompt asked for, so
// every structured reply goes through this before it's stored or shown.
// The error messages include the raw reply - callers log them, never show them.
export function parseGeminiJson<T extends z.ZodType>(text: string, schema: T, what: string): z.infer<T> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Gemini did not return valid JSON for ${what}: ${text}`);
  }
  const checked = schema.safeParse(json);
  if (!checked.success) throw new Error(`Gemini returned ${what} in an unexpected shape: ${checked.error.message}`);
  return checked.data;
}
