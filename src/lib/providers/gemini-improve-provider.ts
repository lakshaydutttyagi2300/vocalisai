// "Improve My Answer" (Phase 6) - a separate, explicitly-requested AI call
// over a candidate's own real transcript. Text-only, on-demand, cached by
// the caller. The model rewrites the response and must explain what
// changed against a fixed checklist - never a free-form essay - so the
// UI can render it as structured "what improved" bullets rather than
// re-parsing prose.

const PINNED_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

export interface ImprovedAnswerResult {
  improvedAnswer: string;
  improvements: {
    grammar: boolean;
    sentenceStructure: boolean;
    vocabulary: boolean;
    professionalTone: boolean;
    clarity: boolean;
  };
  summary: string;
}

function buildPrompt(transcript: string, context?: string): string {
  return `You are an English communication coach. A candidate gave this spoken response${
    context ? ` to: "${context}"` : ""
  }, transcribed exactly as spoken (including any filler words or grammar mistakes):

"""
${transcript}
"""

Rewrite it as a stronger version of the SAME answer - same meaning and intent, same length ballpark - fixing grammar, sentence structure, vocabulary, professional tone and clarity ONLY where the original genuinely needs it. Do not invent new content the candidate didn't say. If the original is already strong in a dimension, don't force a change there.

Return ONLY valid JSON matching exactly this shape:
{
  "improvedAnswer": string,
  "improvements": { "grammar": boolean, "sentenceStructure": boolean, "vocabulary": boolean, "professionalTone": boolean, "clarity": boolean },
  "summary": string
}
Each boolean in "improvements" should be true only if you actually changed something in that dimension. "summary" is one short sentence on the main improvement.`;
}

async function callGemini(apiKey: string, model: string, transcript: string, context?: string) {
  const start = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(transcript, context) }] }],
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

  let parsed: ImprovedAnswerResult;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini did not return valid JSON: ${text}`);
  }
  if (!parsed.improvedAnswer?.trim()) throw new Error("Gemini returned an empty improved answer.");

  return { parsed, raw, latencyMs };
}

export function createGeminiImproveProvider(apiKey: string) {
  if (!apiKey) throw new Error("createGeminiImproveProvider: apiKey is required");

  return {
    providerName: "gemini" as const,
    model: PINNED_MODEL,

    async improveAnswer(transcript: string, context?: string) {
      let modelUsed = PINNED_MODEL;
      let outcome;
      try {
        outcome = await callGemini(apiKey, PINNED_MODEL, transcript, context);
      } catch {
        modelUsed = FALLBACK_MODEL;
        outcome = await callGemini(apiKey, FALLBACK_MODEL, transcript, context);
      }

      const usage = outcome.raw.usageMetadata || {};

      return {
        result: outcome.parsed,
        tokenUsage: {
          textInput: usage.promptTokenCount ?? 0,
          output: usage.candidatesTokenCount ?? 0,
          total: usage.totalTokenCount ?? 0,
        },
        providerName: "gemini" as const,
        model: modelUsed,
        latencyMs: outcome.latencyMs,
      };
    },
  };
}
