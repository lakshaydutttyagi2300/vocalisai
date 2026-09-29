import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createGeminiAnalysisProvider, voiceAnalysisResultSchema, type VoiceAnalysisResult } from "@/lib/providers/gemini-analysis-provider";
import { createGeminiConversationProvider } from "@/lib/providers/gemini-conversation-provider";
import { parseGeminiJson } from "@/lib/providers/gemini-json";

// Gemini is asked for JSON of a given shape but doesn't enforce it. A reply
// in the wrong shape must never be stored or rendered: the provider rejects
// it, retries once on the fallback model, and fails cleanly if that's bad too.

function analysis(): VoiceAnalysisResult {
  return {
    pronunciation: { rating: "adequate", mispronouncedWords: [{ word: "comfortable", note: "stress", phoneticHint: "KUMF-ter-bul" }], articulation: "Clear", difficultSounds: ["th"], intelligibility: "Good" },
    fluency: { rating: "strong", hesitations: "Few", fillers: "Some", repetitions: "None", longPauses: "None", smoothness: "Smooth" },
    grammar: { rating: "weak", issues: [{ excerpt: "I will helping", problem: "verb form", correction: "I will help" }], overallComment: "Mostly fine" },
    vocabulary: { rating: "adequate", assessment: "Varied", professionalTermsUsed: [], repetitiveWords: ["very"] },
    voiceClarity: { rating: "strong", articulation: "Crisp", volumeComment: "Good", clarity: "Clear", intelligibility: "High" },
    delivery: { rating: "adequate", confidenceIndicators: "Steady", vocalVariation: "Some", engagement: "Engaged", responseCompleteness: "Complete" },
    customerHandling: { applicable: false, empathyRating: "not_applicable", relevanceRating: "not_applicable", problemSolvingRating: "not_applicable", comment: "" },
  };
}

function geminiReply(body: unknown) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }], usageMetadata: {} }), { status: 200 });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("speech analysis output shape", () => {
  it("accepts a well-formed analysis, and one from before phoneticHint existed", () => {
    expect(voiceAnalysisResultSchema.safeParse(analysis()).success).toBe(true);
    const old = analysis();
    delete old.pronunciation.mispronouncedWords[0].phoneticHint;
    expect(voiceAnalysisResultSchema.safeParse(old).success).toBe(true);
  });

  it("rejects the shapes that would break the results page", () => {
    const objectWhereTextBelongs = { ...analysis(), fluency: { ...analysis().fluency, fillers: { count: 3 } } };
    const unknownRating = { ...analysis(), grammar: { ...analysis().grammar, rating: "excellent" } };
    const { delivery: _, ...missingSection } = analysis();
    for (const bad of [objectWhereTextBelongs, unknownRating, missingSection, "not an object", null]) {
      expect(voiceAnalysisResultSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("retries on the fallback model when the first reply has the wrong shape", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(geminiReply({ ...analysis(), grammar: "fine" }))
      .mockResolvedValueOnce(geminiReply(analysis()));
    vi.stubGlobal("fetch", fetchMock);

    const out = await createGeminiAnalysisProvider("test-key").analyzeVoiceResponse({ audioBuffer: Buffer.from("a"), audioMimeType: "audio/webm", transcript: "hello" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out.model).not.toBe(String(fetchMock.mock.calls[0][0]).match(/models\/([^:]+)/)?.[1]);
    expect(out.result).toEqual(analysis());
  });

  it("fails instead of returning bad data when both models reply in the wrong shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => geminiReply({ pronunciation: "n/a" })));
    await expect(
      createGeminiAnalysisProvider("test-key").analyzeVoiceResponse({ audioBuffer: Buffer.from("a"), audioMimeType: "audio/webm", transcript: "hello" }),
    ).rejects.toThrow(/unexpected shape/);
  });
});

describe("parseGeminiJson", () => {
  const schema = z.object({ reply: z.string().trim().min(1) });

  it("returns the checked value and drops fields the schema doesn't know", () => {
    expect(parseGeminiJson('{"reply":" Hi ","debug":{"x":1}}', schema, "a reply")).toEqual({ reply: "Hi" });
  });

  it("rejects text that isn't JSON, and JSON in the wrong shape", () => {
    expect(() => parseGeminiJson("Sure! Here's your reply", schema, "a reply")).toThrow(/valid JSON/);
    expect(() => parseGeminiJson('{"reply":{"text":"hi"}}', schema, "a reply")).toThrow(/unexpected shape/);
    expect(() => parseGeminiJson('{"reply":"   "}', schema, "a reply")).toThrow(/unexpected shape/);
  });
});

describe("conversation summary output shape", () => {
  const summary = {
    grammar: { issues: [], overallComment: "Good" },
    vocabulary: { assessment: "Varied", repetitiveWords: [] },
    relevance: "On topic",
    responseQuality: "Clear",
    customerHandling: "Doesn't apply",
    coachingNote: "Slow down slightly.",
  };
  const summarize = () =>
    createGeminiConversationProvider("test-key").summarizeConversation({
      role: "INTERVIEWER",
      scenario: "Job interview",
      history: [{ speaker: "candidate", text: "Hello" }],
    });

  it("accepts a complete summary", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiReply(summary)));
    expect((await summarize()).result).toEqual(summary);
  });

  it("rejects a summary missing the grammar section the results page reads directly", async () => {
    const { grammar: _, ...noGrammar } = summary;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiReply(noGrammar)));
    await expect(summarize()).rejects.toThrow(/unexpected shape/);
  });
});
