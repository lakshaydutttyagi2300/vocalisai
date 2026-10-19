import type { z } from "zod";
import { parseGeminiJson } from "@/lib/providers/gemini-json";
import { BlockedError, PermanentError, TransientError } from "./errors";
import { dayKey, type SocialConfig } from "./config";
import type { SocialStore } from "./store";

// Agents only see this interface, so tests can supply a scripted fake.
export interface AiClient {
  json<T extends z.ZodType>(schema: T, prompt: string, label: string): Promise<z.infer<T>>;
}

const MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite"]; // same pinned pair the app already uses

/** Gemini free tier, behind a hard daily call cap kept in the database. */
export function geminiClient(store: SocialStore, config: SocialConfig, now: () => Date = () => new Date()): AiClient {
  return {
    async json(schema, prompt, label) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new BlockedError("GEMINI_API_KEY is not set");
      const key = `ai:${dayKey(now())}`;
      const used = await store.incrementSetting(key, 1);
      if (used > config.maxAiCallsPerDay) {
        const tomorrow = new Date(now()); tomorrow.setUTCHours(24, 0, 0, 0);
        throw new BlockedError(`Daily AI limit of ${config.maxAiCallsPerDay} calls reached`, tomorrow);
      }
      let lastErr: unknown;
      for (const model of MODELS) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 1 },
          }),
          signal: AbortSignal.timeout(30_000),
        }).catch((e) => { lastErr = e; return null; });
        if (!res) continue;
        if (res.status === 429 || res.status >= 500) { lastErr = new Error(`status ${res.status}`); continue; }
        if (!res.ok) throw new PermanentError(`Gemini rejected the request (${res.status}) for ${label}`);
        const raw = await res.json();
        const text = raw.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new TransientError(`Gemini returned nothing for ${label}`);
        return parseGeminiJson(text, schema, label);
      }
      throw new TransientError(`Gemini unavailable for ${label}: ${String(lastErr)}`);
    },
  };
}
