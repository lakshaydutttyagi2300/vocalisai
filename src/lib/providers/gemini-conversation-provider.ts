// Text-only Gemini calls for the live back-and-forth of an AI Voice
// Conversation. Separate from gemini-analysis-provider.ts, which does the
// heavier audio-based per-recording analysis (Phase 8) - this module is
// about generating the AI character's next line quickly and cheaply, and
// producing one overall summary once the conversation ends.

const PINNED_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

export interface ConversationTurnInput {
  speaker: "ai" | "candidate";
  text: string;
}

async function callGemini(apiKey: string, model: string, prompt: string, jsonMode: boolean) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined,
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini generateContent failed (${res.status}): ${errText}`);
  }
  const raw = await res.json();
  const text = raw.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini returned no content: ${JSON.stringify(raw)}`);
  const usage = raw.usageMetadata || {};
  return { text, tokenUsage: { input: usage.promptTokenCount ?? 0, output: usage.candidatesTokenCount ?? 0 } };
}

async function callWithFallback(apiKey: string, prompt: string, jsonMode: boolean) {
  try {
    return { ...(await callGemini(apiKey, PINNED_MODEL, prompt, jsonMode)), model: PINNED_MODEL };
  } catch {
    return { ...(await callGemini(apiKey, FALLBACK_MODEL, prompt, jsonMode)), model: FALLBACK_MODEL };
  }
}

interface AudioPart {
  mimeType: string;
  base64: string;
}

async function callGeminiWithAudio(apiKey: string, model: string, prompt: string, audioParts: AudioPart[]) {
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
              ...audioParts.map((a) => ({ inlineData: { mimeType: a.mimeType, data: a.base64 } })),
              { text: prompt },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini generateContent failed (${res.status}): ${errText}`);
  }
  const raw = await res.json();
  const text = raw.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini returned no content: ${JSON.stringify(raw)}`);
  const usage = raw.usageMetadata || {};
  return { text, tokenUsage: { input: usage.promptTokenCount ?? 0, output: usage.candidatesTokenCount ?? 0 } };
}

async function callWithFallbackAudio(apiKey: string, prompt: string, audioParts: AudioPart[]) {
  try {
    return { ...(await callGeminiWithAudio(apiKey, PINNED_MODEL, prompt, audioParts)), model: PINNED_MODEL };
  } catch {
    return { ...(await callGeminiWithAudio(apiKey, FALLBACK_MODEL, prompt, audioParts)), model: FALLBACK_MODEL };
  }
}

function formatHistory(turns: ConversationTurnInput[]): string {
  return turns.map((t) => `${t.speaker === "ai" ? "THEM" : "CANDIDATE"}: ${t.text}`).join("\n");
}

export function createGeminiConversationProvider(apiKey: string) {
  if (!apiKey) throw new Error("createGeminiConversationProvider: apiKey is required");

  return {
    async generateNextTurn({
      systemPrompt,
      scenario,
      history,
    }: {
      systemPrompt: string;
      scenario: string;
      history: ConversationTurnInput[];
    }) {
      const prompt = `${systemPrompt}

Scenario: ${scenario}

Conversation so far:
${formatHistory(history)}

Write ONLY your next line of dialogue as THEM, with no label, no quotation marks, no stage directions - just the words you would say.`;

      const outcome = await callWithFallback(apiKey, prompt, false);
      return { text: outcome.text.trim(), model: outcome.model, tokenUsage: outcome.tokenUsage };
    },

    async summarizeConversation({
      role,
      scenario,
      history,
    }: {
      role: string;
      scenario: string;
      history: ConversationTurnInput[];
    }) {
      const candidateLines = history.filter((t) => t.speaker === "candidate").map((t) => t.text).join(" ");

      const prompt = `You are a BPO Voice & Accent assessment analyst reviewing a practice roleplay conversation. The candidate practiced as themselves in a "${role}" scenario: ${scenario}

Full conversation:
${formatHistory(history)}

Analyze ONLY the CANDIDATE's lines. Ground every point in what they actually said - quote exact excerpts for grammar issues, and never invent an issue that isn't there. Use hedged, non-clinical language for delivery/confidence observations - these are indicators for review, not facts.

Return ONLY valid JSON matching exactly this shape:
{
  "grammar": { "issues": [{"excerpt": string, "problem": string, "correction": string}], "overallComment": string },
  "vocabulary": { "assessment": string, "repetitiveWords": [string] },
  "relevance": string,
  "responseQuality": string,
  "customerHandling": string,
  "coachingNote": string
}
"customerHandling" should note empathy/professionalism/problem-solving if this was a CUSTOMER or SUPERVISOR scenario, or otherwise say it doesn't apply. "coachingNote" should be one specific, actionable suggestion based on what actually happened in this conversation.

Candidate's combined responses for reference: """${candidateLines}"""`;

      const outcome = await callWithFallback(apiKey, prompt, true);
      let parsed;
      try {
        parsed = JSON.parse(outcome.text);
      } catch {
        throw new Error(`Gemini did not return valid JSON: ${outcome.text}`);
      }
      return { result: parsed, model: outcome.model, tokenUsage: outcome.tokenUsage };
    },

    // Phase 11: the full 10-dimension customer-service rubric, using the
    // candidate's ACTUAL audio from every turn (not just transcript text) -
    // pronunciation/fluency/listening genuinely need to be heard, not
    // inferred from spelling. Grammar/tone/empathy/etc. are judged from the
    // same audio + the full transcript for context.
    async analyzeCustomerServiceSimulation({
      scenario,
      scenarioType,
      history,
      candidateAudioClips,
    }: {
      scenario: string;
      scenarioType?: string | null;
      history: ConversationTurnInput[];
      candidateAudioClips: AudioPart[];
    }) {
      const prompt = `You are a BPO Voice & Accent assessment analyst reviewing a customer-service roleplay simulation.${
        scenarioType ? ` Scenario type: ${scenarioType}.` : ""
      } Scenario: ${scenario}

Full conversation transcript (for context - the candidate's actual voice is attached as audio, listen to it directly for pronunciation/fluency/listening):
${formatHistory(history)}

Evaluate ONLY the candidate (the customer-service agent), across all their turns. Ground every claim in what you actually heard or read - quote exact excerpts for grammar issues, and never invent an issue that isn't there. Use hedged, non-clinical language - these are indicators for review, not certainties.

Return ONLY valid JSON matching exactly this shape:
{
  "listening": string,
  "grammar": { "issues": [{"excerpt": string, "problem": string, "correction": string}], "overallComment": string },
  "pronunciation": { "mispronouncedWords": [{"word": string, "note": string}], "articulation": string, "intelligibility": string },
  "fluency": { "hesitations": string, "smoothness": string },
  "professionalTone": string,
  "empathy": string,
  "relevance": string,
  "problemSolving": string,
  "deEscalation": string,
  "responseQuality": string,
  "coachingNote": string
}
"listening" should assess whether the candidate's responses show they actually understood what the customer said (or missed/misread it). "deEscalation" should note whether tension increased or decreased over the conversation, or say it doesn't apply if the customer was never upset. "coachingNote" must be one specific, actionable suggestion based on what actually happened in THIS conversation.`;

      const outcome = await callWithFallbackAudio(apiKey, prompt, candidateAudioClips);
      let parsed;
      try {
        parsed = JSON.parse(outcome.text);
      } catch {
        throw new Error(`Gemini did not return valid JSON: ${outcome.text}`);
      }
      return { result: parsed, model: outcome.model, tokenUsage: outcome.tokenUsage };
    },
  };
}
