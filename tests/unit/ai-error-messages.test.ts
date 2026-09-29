import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A provider failure can carry the model's raw output or the API's error
// body. Candidates must get a plain message; the details go to the server log.
const storage = vi.hoisted(() => ({ readRecording: vi.fn() }));
const whisper = vi.hoisted(() => ({ transcribe: vi.fn() }));
const gemini = vi.hoisted(() => ({ analyzeVoiceResponse: vi.fn() }));

vi.mock("@/lib/storage", () => storage);
vi.mock("@/lib/providers/groq-whisper-provider", () => ({ createGroqWhisperProvider: () => whisper }));
vi.mock("@/lib/providers/gemini-analysis-provider", () => ({ createGeminiAnalysisProvider: () => gemini }));

const { analyzeAttempt } = await import("@/lib/analyze-attempt");

const RAW_LEAK = 'Gemini did not return valid JSON: {"pronunciation": {"rating": [internal';

const attempt = {
  id: "attempt_1",
  category: "SPEAKING",
  difficulty: "BEGINNER",
  recording: { filePath: "recordings/x.webm", mimeType: "audio/webm", durationSeconds: 12 },
  question: { prompt: "Describe your day.", scoringCriteria: null },
} as unknown as Parameters<typeof analyzeAttempt>[0];

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv("GROQ_API_KEY", "test-groq");
  vi.stubEnv("GEMINI_API_KEY", "test-gemini");
  storage.readRecording.mockResolvedValue(Buffer.from("audio"));
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  consoleError.mockRestore();
});

describe("AI failures shown to candidates", () => {
  it("hides the provider's raw error when transcription fails, but logs it", async () => {
    whisper.transcribe.mockRejectedValue(new Error("Groq 401: invalid_api_key sk-..."));
    const result = await analyzeAttempt(attempt);
    expect(result).toMatchObject({ ok: false, status: 502 });
    if (result.ok) return;
    expect(result.error).not.toMatch(/Groq|401|api_key/);
    expect(consoleError).toHaveBeenCalled();
  });

  it("hides the model's raw output when AI analysis fails, but logs it", async () => {
    whisper.transcribe.mockResolvedValue({ transcript: "I went to work.", durationSeconds: 12, segments: [] });
    gemini.analyzeVoiceResponse.mockRejectedValue(new Error(RAW_LEAK));
    const result = await analyzeAttempt(attempt);
    expect(result).toMatchObject({ ok: false, status: 502 });
    if (result.ok) return;
    expect(result.error).not.toContain("{");
    expect(result.error).not.toMatch(/Gemini|JSON/);
    expect(String(consoleError.mock.calls[0])).toBeTruthy();
  });
});
