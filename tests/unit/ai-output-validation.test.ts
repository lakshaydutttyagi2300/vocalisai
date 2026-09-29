import { afterEach, describe, expect, it, vi } from "vitest";
import { createGeminiAnalysisProvider, voiceAnalysisResultSchema, type VoiceAnalysisResult } from "@/lib/providers/gemini-analysis-provider";

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
