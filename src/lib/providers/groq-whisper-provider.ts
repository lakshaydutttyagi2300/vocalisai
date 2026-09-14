// Concrete SpeechProvider: Groq-hosted Whisper Large v3 Turbo.
// verbose_json gives us real per-segment timestamps for free, which is what
// makes genuine long-pause detection possible later without any extra cost.

const MODEL = "whisper-large-v3-turbo";

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  transcript: string;
  language: string | null;
  durationSeconds: number | null;
  segments: TranscriptionSegment[];
  providerName: "groq";
  model: string;
  latencyMs: number;
}

export function createGroqWhisperProvider(apiKey: string) {
  if (!apiKey) throw new Error("createGroqWhisperProvider: apiKey is required");

  return {
    providerName: "groq" as const,
    model: MODEL,

    async transcribe({
      audioBuffer,
      filename,
      mimeType,
    }: {
      audioBuffer: Buffer;
      filename: string;
      mimeType: string;
    }): Promise<TranscriptionResult> {
      // Buffer's underlying ArrayBufferLike can be a SharedArrayBuffer, which
      // BlobPart's stricter lib.dom typing rejects - Uint8Array.from copies
      // into a real ArrayBuffer-backed view, satisfying the type and runtime
      // both.
      const blob = new Blob([Uint8Array.from(audioBuffer)], { type: mimeType || "audio/webm" });
      const form = new FormData();
      form.append("file", blob, filename || "audio.webm");
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
        segments: Array.isArray(raw.segments)
          ? raw.segments.map((s: { start: number; end: number; text: string }) => ({
              start: s.start,
              end: s.end,
              text: s.text,
            }))
          : [],
        providerName: "groq",
        model: MODEL,
        latencyMs,
      };
    },

    async verifyConnection(): Promise<boolean> {
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
