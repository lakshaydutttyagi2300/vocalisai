// Concrete AIAnalysisProvider implementation: pinned Gemini model.
// Conforms to the contract in ./ai-analysis-provider.mjs.
//
// The model ID is PINNED (not "-latest") so behavior and pricing don't shift
// under us silently. To change models, change PINNED_MODEL here - nothing
// else in the assessment engine needs to know.

const PINNED_MODEL = "gemini-2.5-flash-lite";
const FALLBACK_MODEL = "gemini-2.5-flash";

function buildPrompt(transcript, context) {
  return `You are a BPO Voice & Accent assessment analyst. Analyze the following candidate transcript${
    context ? ` (context: ${context})` : ""
  }. Return ONLY valid JSON matching this shape:
{
  "grammar": { "issues": [{"excerpt": string, "problem": string, "correction": string}], "overall_comment": string },
  "vocabulary": { "assessment": string, "professional_terms_used": [string], "repetitive_words": [string] },
  "customer_service_tone": { "empathy": string, "professionalism": string, "relevance": string },
  "overall_comment": string
}
Base every point ONLY on the actual text below, quoting exact excerpts for issues. Do not invent issues that are not present. Keep the response concise regardless of transcript length.

Transcript:
"""
${transcript}
"""`;
}

async function callGemini(apiKey, model, transcript, context) {
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

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini did not return valid JSON: ${text}`);
  }

  return { parsed, raw, latencyMs };
}

export function createGeminiAnalysisProvider(apiKey) {
  if (!apiKey) throw new Error("createGeminiAnalysisProvider: apiKey is required");

  return {
    providerName: "gemini",
    model: PINNED_MODEL,

    /** @returns {Promise<import('./ai-analysis-provider.mjs').AnalysisResult>} */
    async analyzeSpeakingResponse({ transcript, context }) {
      let modelUsed = PINNED_MODEL;
      let outcome;
      try {
        outcome = await callGemini(apiKey, PINNED_MODEL, transcript, context);
      } catch (err) {
        // Fail over once to the fallback model rather than failing the whole assessment.
        modelUsed = FALLBACK_MODEL;
        outcome = await callGemini(apiKey, FALLBACK_MODEL, transcript, context);
      }

      const usage = outcome.raw.usageMetadata || {};
      return {
        result: outcome.parsed,
        tokenUsage: {
          input: usage.promptTokenCount ?? 0,
          output: usage.candidatesTokenCount ?? 0,
          total: usage.totalTokenCount ?? 0,
        },
        providerName: "gemini",
        model: modelUsed,
        latencyMs: outcome.latencyMs,
      };
    },

    /** Confirms the pinned model still exists and the key can call ListModels. */
    async verifyConnection() {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini auth check failed (${res.status}): ${errText}`);
      }
      const json = await res.json();
      const names = (json.models || []).map((m) => m.name.replace("models/", ""));
      const pinnedAvailable = names.includes(PINNED_MODEL);
      if (!pinnedAvailable) {
        console.warn(
          `WARNING: pinned model "${PINNED_MODEL}" was not found in ListModels. It may have been deprecated - check https://ai.google.dev/gemini-api/docs/pricing.`
        );
      }
      return { pinnedAvailable, availableModels: names };
    },
  };
}
