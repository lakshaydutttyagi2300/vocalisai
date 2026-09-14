// Concrete provider for the Personal AI Coach (Phase 15) - a turn-based
// (not streaming) text chat, same cost-driven architecture choice as
// gemini-conversation-provider.ts. The model is only ever given a real,
// deterministically-computed profile digest (src/lib/coach-profile.ts) plus
// the recent chat history - it is explicitly told not to invent scores or
// personalized facts that weren't given to it.

const PINNED_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

export interface CoachChatTurn {
  role: "user" | "coach";
  content: string;
}

function buildPrompt(profileDigest: string, history: CoachChatTurn[], newMessage: string): string {
  const historyText = history.length
    ? history.map((t) => `${t.role === "user" ? "Candidate" : "Coach"}: ${t.content}`).join("\n")
    : "(no prior messages)";

  return `You are a supportive, professional Personal AI Coach for a candidate practicing for BPO (call center) voice and accent assessments. Speak directly to the candidate, warm but concise (2-5 sentences unless they ask for detail).

You may ONLY reference performance facts and numbers given to you below - never invent a score, a trend, or a personalized claim that isn't in this data. If the candidate asks something this data can't answer, say so honestly and suggest what they could do instead (e.g. complete a mock test, or ask about general technique). General BPO communication/grammar/pronunciation advice not tied to their personal data is fine to give.

Candidate's real performance summary (computed from their actual completed assessments):
${profileDigest}

Recent conversation:
${historyText}

Candidate's new message:
"${newMessage}"

Reply with your next message as the coach. Return ONLY valid JSON matching exactly this shape:
{ "reply": string }`;
}

async function callGemini(apiKey: string, model: string, profileDigest: string, history: CoachChatTurn[], newMessage: string) {
  const start = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(profileDigest, history, newMessage) }] }],
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

  let parsed: { reply: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini did not return valid JSON: ${text}`);
  }

  return { parsed, raw, latencyMs };
}

export function createGeminiCoachProvider(apiKey: string) {
  if (!apiKey) throw new Error("createGeminiCoachProvider: apiKey is required");

  return {
    providerName: "gemini" as const,
    model: PINNED_MODEL,

    async reply(profileDigest: string, history: CoachChatTurn[], newMessage: string) {
      let modelUsed = PINNED_MODEL;
      let outcome;
      try {
        outcome = await callGemini(apiKey, PINNED_MODEL, profileDigest, history, newMessage);
      } catch {
        modelUsed = FALLBACK_MODEL;
        outcome = await callGemini(apiKey, FALLBACK_MODEL, profileDigest, history, newMessage);
      }

      const usage = outcome.raw.usageMetadata || {};

      return {
        reply: outcome.parsed.reply,
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
