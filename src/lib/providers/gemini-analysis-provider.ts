// Concrete AIAnalysisProvider: pinned Gemini model, with the ACTUAL AUDIO
// sent alongside the transcript. Gemini 2.5 Flash-Lite genuinely accepts
// audio input (it has its own line-item audio price on the pricing page),
// which matters here specifically: a text-only model cannot hear
// pronunciation, articulation or vocal delivery - it can only ever guess at
// those from transcription artifacts. Sending real audio lets those
// sections be genuinely audio-derived instead of a text-only approximation
// dressed up as the real thing.
//
// Grammar/vocabulary are still transcript-text analysis - that's the right
// tool for those, no audio needed.

const PINNED_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

// "rating" fields are a constrained 3-value enum, not a free score number.
// This is the Phase 13 scoring engine's only AI input per dimension - the
// actual 0-100 numbers are computed by application code from these enums
// plus deterministic counts (see src/lib/scoring-engine.ts), never by
// asking the model for a score directly.
export type Rating = "strong" | "adequate" | "weak";

export interface VoiceAnalysisResult {
  pronunciation: {
    rating: Rating;
    mispronouncedWords: { word: string; note: string }[];
    articulation: string;
    difficultSounds: string[];
    intelligibility: string;
  };
  fluency: {
    rating: Rating;
    hesitations: string;
    fillers: string;
    repetitions: string;
    longPauses: string;
    smoothness: string;
  };
  grammar: {
    rating: Rating;
    issues: { excerpt: string; problem: string; correction: string }[];
    overallComment: string;
  };
  vocabulary: {
    rating: Rating;
    assessment: string;
    professionalTermsUsed: string[];
    repetitiveWords: string[];
  };
  voiceClarity: {
    rating: Rating;
    articulation: string;
    volumeComment: string;
    clarity: string;
    intelligibility: string;
  };
  delivery: {
    rating: Rating;
    confidenceIndicators: string;
    vocalVariation: string;
    engagement: string;
    responseCompleteness: string;
  };
  // Only meaningful when the response was a customer-service scenario;
  // "not_applicable" otherwise rather than a forced/invented judgment.
  customerHandling: {
    applicable: boolean;
    empathyRating: Rating | "not_applicable";
    relevanceRating: Rating | "not_applicable";
    problemSolvingRating: Rating | "not_applicable";
    comment: string;
  };
}

function buildPrompt(transcript: string, context?: string, scoringCriteria?: string | null): string {
  return `You are a BPO Voice & Accent assessment analyst. You have been given both the candidate's actual AUDIO RECORDING and its transcript for one speaking response${
    context ? ` (context: ${context})` : ""
  }.${scoringCriteria ? ` What this response is meant to be assessed on: ${scoringCriteria}` : ""}

Use the AUDIO for pronunciation, voiceClarity and delivery sections - genuinely listen to it, don't just infer from spelling. Use the TRANSCRIPT for grammar and vocabulary.

Ground every claim in something you actually heard or read - quote exact excerpts for grammar issues. Never invent an issue that isn't there. For delivery and confidence, use hedged, non-clinical language ("appears to", "sounds") - these are indicators for a human reviewer, not psychological facts or diagnoses.

For each section below, also set "rating" to exactly one of "strong", "adequate" or "weak" - a plain classification consistent with your own comments, not a numeric score. This is the ONLY numeric-adjacent judgment we ask of you; the actual scores are computed separately from these ratings combined with real measured data (word count, timing, filler counts). Only mark "customerHandling.applicable": true if this response was actually a customer-service scenario - otherwise set it false and use "not_applicable" for its three ratings.

Return ONLY valid JSON matching exactly this shape:
{
  "pronunciation": { "rating": "strong"|"adequate"|"weak", "mispronouncedWords": [{"word": string, "note": string}], "articulation": string, "difficultSounds": [string], "intelligibility": string },
  "fluency": { "rating": "strong"|"adequate"|"weak", "hesitations": string, "fillers": string, "repetitions": string, "longPauses": string, "smoothness": string },
  "grammar": { "rating": "strong"|"adequate"|"weak", "issues": [{"excerpt": string, "problem": string, "correction": string}], "overallComment": string },
  "vocabulary": { "rating": "strong"|"adequate"|"weak", "assessment": string, "professionalTermsUsed": [string], "repetitiveWords": [string] },
  "voiceClarity": { "rating": "strong"|"adequate"|"weak", "articulation": string, "volumeComment": string, "clarity": string, "intelligibility": string },
  "delivery": { "rating": "strong"|"adequate"|"weak", "confidenceIndicators": string, "vocalVariation": string, "engagement": string, "responseCompleteness": string },
  "customerHandling": { "applicable": boolean, "empathyRating": "strong"|"adequate"|"weak"|"not_applicable", "relevanceRating": "strong"|"adequate"|"weak"|"not_applicable", "problemSolvingRating": "strong"|"adequate"|"weak"|"not_applicable", "comment": string }
}

Transcript (for grammar/vocabulary reference only):
"""
${transcript}
"""`;
}

async function callGemini(
  apiKey: string,
  model: string,
  audioBase64: string,
  audioMimeType: string,
  transcript: string,
  context?: string,
  scoringCriteria?: string | null
) {
  const start = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: audioMimeType, data: audioBase64 } },
              { text: buildPrompt(transcript, context, scoringCriteria) },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  const latencyMs = Date.now() - start;

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini generateContent failed (${res.status}): ${errText}`);
  }

  const raw = await res.json();
  const text = raw.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini returned no content: ${JSON.stringify(raw)}`);

  let parsed: VoiceAnalysisResult;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini did not return valid JSON: ${text}`);
  }

  return { parsed, raw, latencyMs };
}

export function createGeminiAnalysisProvider(apiKey: string) {
  if (!apiKey) throw new Error("createGeminiAnalysisProvider: apiKey is required");

  return {
    providerName: "gemini" as const,
    model: PINNED_MODEL,

    async analyzeVoiceResponse({
      audioBuffer,
      audioMimeType,
      transcript,
      context,
      scoringCriteria,
    }: {
      audioBuffer: Buffer;
      audioMimeType: string;
      transcript: string;
      context?: string;
      scoringCriteria?: string | null;
    }) {
      const audioBase64 = audioBuffer.toString("base64");

      let modelUsed = PINNED_MODEL;
      let outcome;
      try {
        outcome = await callGemini(apiKey, PINNED_MODEL, audioBase64, audioMimeType, transcript, context, scoringCriteria);
      } catch {
        modelUsed = FALLBACK_MODEL;
        outcome = await callGemini(apiKey, FALLBACK_MODEL, audioBase64, audioMimeType, transcript, context, scoringCriteria);
      }

      const usage = outcome.raw.usageMetadata || {};
      const audioTokens =
        usage.promptTokensDetails?.find((d: { modality: string; tokenCount: number }) => d.modality === "AUDIO")
          ?.tokenCount ?? 0;
      const textInputTokens = (usage.promptTokenCount ?? 0) - audioTokens;

      return {
        result: outcome.parsed,
        tokenUsage: {
          textInput: Math.max(0, textInputTokens),
          audioInput: audioTokens,
          output: usage.candidatesTokenCount ?? 0,
          total: usage.totalTokenCount ?? 0,
        },
        providerName: "gemini" as const,
        model: modelUsed,
        latencyMs: outcome.latencyMs,
      };
    },

    async verifyConnection() {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini auth check failed (${res.status}): ${errText}`);
      }
      const json = await res.json();
      const names = (json.models || []).map((m: { name: string }) => m.name.replace("models/", ""));
      return { pinnedAvailable: names.includes(PINNED_MODEL), availableModels: names };
    },
  };
}
