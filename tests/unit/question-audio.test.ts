import { describe, it, expect, vi, beforeEach } from "vitest";
import { audioScriptHash } from "@/lib/audio-script-hash";
import { audioScriptHash as generatorHash } from "../../prisma/question-audio/script-hash.mjs";
import { candidateStimulus, generatedAudioKey, parseStimulus } from "@/lib/question-stimulus";
import { synthRateFor, voiceMapFor } from "../../prisma/exam-demo/assets.mjs";

// The listening-audio pipeline: generated files are only ever used when
// they're valid and still match the script; speaker ids stay internal; the
// transcript appears only when the spec allows it; the generator gives each
// speaker a distinct voice; and the audio route serves only that file.

const TURNS = [
  { speaker: "S1", text: "So, why are you interested in this role?" },
  { speaker: "S2", text: "I've been working in retail for two years." },
];
const KEY = "question-audio/1b4e28ba-2fa1-41d2-883f-0016d3cca427.wav";

function spec(extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    audio: {
      script: TURNS,
      voices: { S1: "adult", S2: "adult, contrasting" },
      speechRate: 1.0,
      pauseBetweenTurnsMs: 400,
      maxPlays: 2,
      ttsNotes: null,
      generationStatus: "not_generated",
      audioAssetKey: null,
      transcriptVisibleToCandidate: false,
      ...extra,
    },
  });
}
const generated = (extra: Record<string, unknown> = {}) =>
  spec({ generationStatus: "generated", audioAssetKey: KEY, audioScriptHash: audioScriptHash(TURNS, 1.0), ...extra });
const q = { id: "q_123", type: "LISTENING_COMPREHENSION", category: "LISTENING" };

describe("generated listening audio", () => {
  it("the website and the offline generator compute the same script fingerprint", () => {
    for (const rate of [1.0, 0.85, undefined, null]) {
      expect(audioScriptHash(TURNS, rate as number | null | undefined)).toBe(generatorHash(TURNS, rate as number | null | undefined));
    }
    expect(audioScriptHash(TURNS, 1)).not.toBe(audioScriptHash([{ ...TURNS[0], text: "Changed." }, TURNS[1]], 1));
    expect(audioScriptHash(TURNS, 1)).not.toBe(audioScriptHash(TURNS, 0.8));
  });

  it("uses the generated file only when it's valid and still matches the script", () => {
    expect(parseStimulus(generated(), q)).toMatchObject({ kind: "audio", audioUrl: "/api/questions/q_123/audio" });
    expect(generatedAudioKey(generated())).toBe(KEY);

    for (const [why, passage] of [
      ["not generated yet", spec()],
      ["generation failed", generated({ generationStatus: "failed" })],
      ["script edited after generation", generated({ script: [{ speaker: "S1", text: "Different words." }] })],
      ["speed edited after generation", generated({ speechRate: 0.8 })],
      ["key outside question-audio/", generated({ audioAssetKey: "recordings/user1/private.webm" })],
      ["path traversal", generated({ audioAssetKey: "question-audio/../recordings/x.wav" })],
    ] as const) {
      expect(parseStimulus(passage, q), why).toMatchObject({ kind: "audio", audioUrl: null });
      expect(generatedAudioKey(passage), why).toBeNull();
    }
  });

  it("never sends the storage key, fingerprint or any spec field to the browser", () => {
    const wire = JSON.stringify(candidateStimulus(generated(), q));
    // (Speaker ids travel only as values inside `turns`, to pick a voice per
    // speaker - the UI never renders them; the e2e test checks the screen.)
    for (const f of [KEY, "audioAssetKey", "audioScriptHash", "generationStatus", "voices", "maxPlays", "speechRate", "transcriptVisibleToCandidate"]) {
      expect(wire, f).not.toContain(f);
    }
  });

  it("shows a transcript only when the spec allows it, labelled Speaker 1/2 - never S1/S2", () => {
    expect(parseStimulus(spec(), q)).toMatchObject({ transcript: null });
    const s = parseStimulus(spec({ transcriptVisibleToCandidate: true }), q);
    expect(s).toMatchObject({
      transcript: [
        { label: "Speaker 1", text: "So, why are you interested in this role?" },
        { label: "Speaker 2", text: "I've been working in retail for two years." },
      ],
    });
    expect(JSON.stringify((s as { transcript: unknown }).transcript)).not.toMatch(/\bS[12]\b/);
  });

  it("the generator gives Speaker 1 and Speaker 2 different voices, and maps speech rate sensibly", () => {
    const voices = voiceMapFor([
      ["S1", "a"],
      ["S2", "b"],
      ["S1", "c"],
    ]);
    expect(voices.get("S1")).not.toBe(voices.get("S2"));
    expect(voiceMapFor([["F", "a"], ["M", "b"]]).get("F")).toBe("Microsoft Zira Desktop"); // practice tests unchanged
    expect(synthRateFor(1.0)).toBe(0);
    expect(synthRateFor(0.85)).toBeLessThan(0);
    expect(synthRateFor(5)).toBe(10);
    expect(synthRateFor(undefined)).toBe(-1);
  });
});

// --- the audio route ------------------------------------------------------

const mocks = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  question: null as null | { passage: string | null; isActive: boolean },
  read: vi.fn(async (_key: string): Promise<Buffer> => Buffer.from("RIFF....WAVEfmt ")),
}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => mocks.session) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { practiceQuestion: { findUnique: vi.fn(async () => mocks.question) } } }));
vi.mock("@/lib/storage", () => ({ readRecording: (key: string) => mocks.read(key) }));

describe("GET /api/questions/[id]/audio", () => {
  beforeEach(() => {
    mocks.session = { user: { id: "u1" } };
    mocks.question = { passage: generated(), isActive: true };
    mocks.read.mockClear();
  });
  const call = async () => {
    const { GET } = await import("@/app/api/questions/[id]/audio/route");
    return GET(new Request("http://x/api/questions/q_123/audio"), { params: Promise.resolve({ id: "q_123" }) });
  };

  it("streams the question's own generated file to a signed-in user, uncached", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/wav");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.read).toHaveBeenCalledWith(KEY);
  });

  it("refuses signed-out users, and 404s (never another file) for anything not generated, stale or invalid", async () => {
    mocks.session = null;
    expect((await call()).status).toBe(401);
    mocks.session = { user: { id: "u1" } };

    for (const passage of [spec(), generated({ script: [{ speaker: "S1", text: "edited" }] }), generated({ audioAssetKey: "recordings/u2/secret.webm" }), "plain text", null]) {
      mocks.question = { passage, isActive: true };
      expect((await call()).status).toBe(404);
    }
    mocks.question = { passage: generated(), isActive: false };
    expect((await call()).status).toBe(404);
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("a missing file is a clean 404 (the player then uses the browser's voices)", async () => {
    mocks.read.mockRejectedValueOnce(new Error("NoSuchKey"));
    const res = await call();
    expect(res.status).toBe(404);
    expect(JSON.stringify(await res.json())).not.toContain(KEY);
  });
});
