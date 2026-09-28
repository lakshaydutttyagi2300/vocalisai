import { describe, it, expect } from "vitest";
import { candidateStimulus, parseStimulus, stimulusText, validateListeningStimulus, validatePassageStimulus } from "@/lib/question-stimulus";
import { processQuestionBatch } from "@/lib/question-import";

// The shapes below are exactly what the production question bank stores in
// PracticeQuestion.passage for its listening and picture questions.
const AUDIO_SPEC = JSON.stringify({
  audio: {
    script: [
      { speaker: "S1", text: "Where's Dad?" },
      { speaker: "S2", text: "He's in the garden. He's washing the car." },
    ],
    voices: { S1: "adult, clear, neutral international accent", S2: "adult, contrasting pitch" },
    speechRate: 0.85,
    pauseBetweenTurnsMs: 400,
    maxPlays: 2,
    ttsNotes: null,
    generationStatus: "not_generated",
    audioAssetKey: null,
    transcriptVisibleToCandidate: false,
  },
});

const IMAGE_SPEC = JSON.stringify({
  image: {
    prompt: "Original illustration, clean flat style: a covered city bus stop on a rainy afternoon...",
    altText: "People waiting at a bus stop in the rain as a bus approaches.",
    keyElements: ["bus stop", "rain", "umbrella"],
    generationStatus: "not_generated",
    imageAssetKey: null,
  },
});

const INTERNAL_FIELDS = ["voices", "speechRate", "maxPlays", "generationStatus", "audioAssetKey", "ttsNotes", "transcriptVisibleToCandidate", "imageAssetKey", "clean flat style", "pauseBetweenTurnsMs", "keyElements"];

describe("question stimulus - what a candidate may see", () => {
  it("turns an audio spec into a playable recording and drops every internal field", () => {
    const listening = { type: "LISTENING_COMPREHENSION", category: "LISTENING" };
    const s = parseStimulus(AUDIO_SPEC, listening);
    expect(s).toEqual({
      kind: "audio",
      turns: [
        { speaker: "S1", text: "Where's Dad?" },
        { speaker: "S2", text: "He's in the garden. He's washing the car." },
      ],
      rate: 0.85,
      pauseMs: 400,
      playLimit: 2,
      audioUrl: null,
      transcript: null,
    });
    const sent = JSON.stringify(candidateStimulus(AUDIO_SPEC, listening));
    for (const f of INTERNAL_FIELDS) expect(sent, f).not.toContain(f);
    expect(candidateStimulus(AUDIO_SPEC, listening).passage).toBeNull(); // nothing displayable as text
  });

  it("turns an image spec into a scene description, never the illustrator's brief", () => {
    const s = parseStimulus(IMAGE_SPEC, { type: "SHORT_ANSWER", category: "SPEAKING" });
    expect(s).toEqual({ kind: "image", description: "People waiting at a bus stop in the rain as a bus approaches.", features: ["bus stop", "rain", "umbrella"] });
    const sent = JSON.stringify(candidateStimulus(IMAGE_SPEC, { category: "SPEAKING" }));
    for (const f of INTERNAL_FIELDS) expect(sent, f).not.toContain(f);
  });

  it("never lets unrecognised or malformed JSON through as text", () => {
    for (const bad of ['{"video":{"url":"x"}}', '{"audio":{"script":[]}}', '{"image":{"prompt":"only a brief"}}', "{not json", "[1,2,3]", '{"audio":{"script":"nope"}}']) {
      const out = candidateStimulus(bad, { category: "GRAMMAR" });
      expect(out, bad).toEqual({ stimulus: { kind: "none" }, passage: null });
    }
  });

  it("keeps plain-text passages exactly as before for reading, read-aloud and customer scenarios", () => {
    const text = "The museum opens at ten.\nTickets are free on Sundays.";
    for (const category of ["READING_COMPREHENSION", "READING", "CUSTOMER_SERVICE", "SITUATIONAL_JUDGEMENT"]) {
      expect(candidateStimulus(text, { category, type: "SHORT_ANSWER" })).toEqual({ stimulus: { kind: "text", text }, passage: text });
    }
  });

  it("plays a plain-text listening passage instead of printing it (the transcript would give away the answer)", () => {
    const out = candidateStimulus("The train to Leeds leaves from platform four.", { type: "LISTENING_COMPREHENSION", category: "LISTENING" });
    expect(out.passage).toBeNull();
    expect(out.stimulus).toMatchObject({ kind: "audio", turns: [{ speaker: "S1", text: "The train to Leeds leaves from platform four." }], playLimit: null });
  });

  it("clamps silly spec values to safe ones", () => {
    const s = parseStimulus(JSON.stringify({ audio: { script: [{ text: "Hi" }], speechRate: 9, pauseBetweenTurnsMs: -5, maxPlays: 0 } }), { category: "LISTENING" });
    expect(s).toEqual({ kind: "audio", turns: [{ speaker: "S1", text: "Hi" }], rate: 1.5, pauseMs: 0, playLimit: null, audioUrl: null, transcript: null });
  });

  it("gives plain text for server-side uses (e.g. an AI conversation's opening line)", () => {
    expect(stimulusText("Hello, I was charged twice.")).toBe("Hello, I was charged twice.");
    expect(stimulusText(AUDIO_SPEC)).toBe("Where's Dad? He's in the garden. He's washing the car.");
    expect(stimulusText(IMAGE_SPEC)).toBe("People waiting at a bus stop in the rain as a bus approaches.");
    expect(stimulusText('{"weird":1}')).toBeNull();
    expect(stimulusText(null)).toBeNull();
  });

  it("admin import accepts plain text and valid specs, and rejects JSON it can't render", () => {
    expect(validatePassageStimulus(null)).toBeNull();
    expect(validatePassageStimulus("A plain passage.")).toBeNull();
    expect(validatePassageStimulus(AUDIO_SPEC)).toBeNull();
    expect(validatePassageStimulus(IMAGE_SPEC)).toBeNull();
    expect(validatePassageStimulus('{"audio":{"script":[]}}')).toMatch(/isn't a recognised stimulus/);
    expect(validatePassageStimulus("{broken")).toMatch(/isn't a recognised stimulus/);
  });
});

describe("a listening question must have something to listen to", () => {
  const listening = { category: "LISTENING", type: "LISTENING_COMPREHENSION" };

  it("accepts a plain script, an audio spec, or a shared audio item group", () => {
    expect(validateListeningStimulus({ ...listening, passage: "S1: Hello.\nS2: Hi there." })).toBeNull();
    expect(validateListeningStimulus({ ...listening, passage: AUDIO_SPEC })).toBeNull();
    expect(validateListeningStimulus({ ...listening, passage: null, itemGroupId: "group-1" })).toBeNull();
  });

  it("refuses nothing to play, or a picture instead of audio", () => {
    expect(validateListeningStimulus({ ...listening, passage: "" })).toMatch(/needs something to listen to/);
    expect(validateListeningStimulus({ ...listening, passage: null })).toMatch(/needs something to listen to/);
    expect(validateListeningStimulus({ ...listening, passage: IMAGE_SPEC })).toMatch(/must be an audio script/);
    expect(validateListeningStimulus({ category: "LISTENING", type: "MULTIPLE_CHOICE", passage: null })).toMatch(/needs something/);
  });

  it("leaves every other kind of question alone", () => {
    expect(validateListeningStimulus({ category: "GRAMMAR", type: "MULTIPLE_CHOICE", passage: null })).toBeNull();
    expect(validateListeningStimulus({ category: "SPEAKING", type: "SHORT_ANSWER", passage: IMAGE_SPEC })).toBeNull();
  });

  it("bulk import rejects an unplayable listening question (dry run, nothing saved)", async () => {
    const base = { category: "LISTENING", difficulty: "BEGINNER", type: "LISTENING_COMPREHENSION", options: ["A", "B"], correctAnswer: "A", timeLimitSeconds: 60 };
    const { results } = await processQuestionBatch(
      [
        { ...base, prompt: `Unplayable listening ${Date.now()}: where are they going?` },
        { ...base, prompt: `Playable listening ${Date.now()}: where are they going?`, passage: "S1: Shall we take the bus?\nS2: Yes, to the station." },
      ],
      { insert: false }
    );
    expect(results[0]).toMatchObject({ status: "error", error: expect.stringMatching(/needs something to listen to/) });
    expect(results[1].status).not.toBe("error");
  });
});
