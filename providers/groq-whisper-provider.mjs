// Concrete SpeechProvider implementation: Groq-hosted Whisper Large v3 Turbo.
// Conforms to the contract in ./speech-provider.mjs.

const MODEL = "whisper-large-v3-turbo";

export function createGroqWhisperProvider(apiKey) {
  if (!apiKey) throw new Error("createGroqWhisperProvider: apiKey is required");

  return {
    providerName: "groq",
    model: MODEL,

    /** @returns {Promise<import('./speech-provider.mjs').TranscriptionResult>} */
    async transcribe({ audioBuffer, filename, mimeType }) {
      const blob = new Blob([audioBuffer], { type: mimeType || "audio/wav" });
      const form = new FormData();
      form.append("file", blob, filename || "audio.wav");
      form.append("model", MODEL);
      form.append("response_format", "verbose_json");

      const start = Date.now();
      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq transcription failed (${res.status}): ${errText}`);
      }

      const raw = await res.json();
      return {
        transcript: (raw.text || "").trim(),
        language: raw.language ?? null,
        durationSeconds: typeof raw.duration === "number" ? raw.duration : null,
        providerName: "groq",
        model: MODEL,
        latencyMs,
        raw,
      };
    },

    /** Lightweight auth/connectivity check - does not consume transcription quota. */
    async verifyConnection() {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq auth check failed (${res.status}): ${errText}`);
      }
      return true;
    },
  };
}
