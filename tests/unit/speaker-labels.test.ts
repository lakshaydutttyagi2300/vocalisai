import { describe, it, expect } from "vitest";
import { candidateStimulus, parseDialogueText, validateSpeakerReferences } from "@/lib/question-stimulus";
import {
  dialogueToSpec,
  parseDialogueText as scriptParseDialogue,
  rewriteSpeakerRefs,
  speakingOrderOf,
} from "../../prisma/question-audio/speaker-labels.mjs";

// Internal speaker ids (S1, S2, ...) must never reach a candidate: not
// spoken by the player, not in a transcript, not in question wording.

const DIALOGUE = "S1: Are you ready to order?\nS2: Yes. I'll have the vegetable curry, please.\nS1: It's medium.\nS2: Mild, please.";
const listening = { id: "q1", type: "LISTENING_COMPREHENSION", category: "LISTENING" };

describe("plain-text S1:/S2: dialogues", () => {
  it("are split into turns per speaker - the labels are never part of what is spoken", () => {
    const s = candidateStimulus(DIALOGUE, listening).stimulus;
    expect(s).toMatchObject({
      kind: "audio",
      turns: [
        { speaker: "S1", text: "Are you ready to order?" },
        { speaker: "S2", text: "Yes. I'll have the vegetable curry, please." },
        { speaker: "S1", text: "It's medium." },
        { speaker: "S2", text: "Mild, please." },
      ],
    });
    for (const t of (s as { turns: { text: string }[] }).turns) expect(t.text).not.toMatch(/\bS\d\b|:/);
  });

  it("accepts 'Speaker 1:' and 'S 2:' labels, and leaves ordinary text alone", () => {
    expect(parseDialogueText("Speaker 1: Hi.\nspeaker 2: Hello.")).toEqual([
      { speaker: "S1", text: "Hi." },
      { speaker: "S2", text: "Hello." },
    ]);
    expect(parseDialogueText("S 1: Hi.\nS 2: Hello.")).toEqual([
      { speaker: "S1", text: "Hi." },
      { speaker: "S2", text: "Hello." },
    ]);
    expect(parseDialogueText("The train leaves at nine.")).toBeNull();
    expect(parseDialogueText("S1: Hi.\nNote: this line is not a turn.")).toBeNull(); // not a pure dialogue
    expect(candidateStimulus("The train leaves at nine.", listening).stimulus).toMatchObject({ turns: [{ speaker: "S1", text: "The train leaves at nine." }] });
  });

  it("a written (non-listening) dialogue is shown with Speaker 1/2, never S1/S2", () => {
    const out = candidateStimulus(DIALOGUE, { category: "READING_COMPREHENSION", type: "READING_COMPREHENSION" });
    expect(out.passage).toBe("Speaker 1: Are you ready to order?\nSpeaker 2: Yes. I'll have the vegetable curry, please.\nSpeaker 1: It's medium.\nSpeaker 2: Mild, please.");
    expect(out.passage).not.toMatch(/\bS\d\b/);
  });

  it("the website and the repair script read dialogues identically", () => {
    for (const text of [DIALOGUE, "Speaker 1: Hi.\nSpeaker 2: Hello.", "S1: a\nS3: b\nS2: c", "Plain text.", "S1: Hi.\nNote: x", ""]) {
      expect(scriptParseDialogue(text)).toEqual(parseDialogueText(text));
    }
  });

  it("converts to a standard audio spec with the bank's per-level settings", () => {
    const spec = dialogueToSpec(parseDialogueText(DIALOGUE)!, "BEGINNER").audio;
    expect(spec).toMatchObject({ maxPlays: 2, speechRate: 0.9, generationStatus: "not_generated", audioAssetKey: null, transcriptVisibleToCandidate: false });
    expect(dialogueToSpec(parseDialogueText(DIALOGUE)!, "EXPERT").audio).toMatchObject({ maxPlays: 1, speechRate: 1.05 });
    expect(Object.keys(spec.voices as object)).toEqual(["S1", "S2"]);
    // ...and the converted spec renders like any other: turns, no labels.
    const rendered = candidateStimulus(JSON.stringify({ audio: spec }), listening).stimulus as { kind: string; playLimit: number; turns: { speaker: string; text: string }[] };
    expect(rendered).toMatchObject({ kind: "audio", playLimit: 2 });
    expect(rendered.turns).toEqual(parseDialogueText(DIALOGUE));
  });
});

describe("speaker labels in question wording", () => {
  it("rewrites S2 / S2's by SPEAKING ORDER, with a capital at a sentence start", () => {
    expect(rewriteSpeakerRefs("What is S2's main argument?", ["S1", "S2"]).text).toBe("What is the second speaker's main argument?");
    expect(rewriteSpeakerRefs("How does S2 describe burnout?", ["S1", "S2"]).text).toBe("How does the second speaker describe burnout?");
    expect(rewriteSpeakerRefs("S2 accepts some results but wants a longer trial.", ["S1", "S2"]).text).toBe("The second speaker accepts some results but wants a longer trial.");
    expect(rewriteSpeakerRefs("What is S3's attitude? S3 feels cautious.", ["S1", "S2", "S3"]).text).toBe("What is the third speaker's attitude? The third speaker feels cautious.");
    expect(rewriteSpeakerRefs("S1 disagrees with S2.", ["S2", "S1"]).text).toBe("The second speaker disagrees with the first speaker."); // order, not number
    expect(rewriteSpeakerRefs("No labels here.", ["S1"]).text).toBe("No labels here.");
  });

  it("refuses to guess when a label isn't in the dialogue", () => {
    const r = rewriteSpeakerRefs("What does S4 think?", ["S1", "S2"]);
    expect(r.unknown).toEqual(["S4"]);
    expect(r.text).toBe("What does S4 think?");
  });

  it("finds the speaking order from either passage format", () => {
    expect(speakingOrderOf(DIALOGUE)).toEqual(["S1", "S2"]);
    expect(speakingOrderOf(JSON.stringify({ audio: { script: [{ speaker: "S2", text: "a" }, { speaker: "S1", text: "b" }] } }))).toEqual(["S2", "S1"]);
    expect(speakingOrderOf("plain")).toEqual([]);
  });

  it("admin import/edit refuses S1/S2 in a listening question's wording, options, answer or explanation", () => {
    const base = { category: "LISTENING", type: "LISTENING_COMPREHENSION", prompt: "What is the second speaker's view?", options: ["Yes", "No"], correctAnswer: "Yes", explanation: "The second speaker agrees." };
    expect(validateSpeakerReferences(base)).toBeNull();
    expect(validateSpeakerReferences({ ...base, prompt: "What is S2's view?" })).toMatch(/Prompt mentions the internal speaker label "S2"/);
    expect(validateSpeakerReferences({ ...base, options: ["S1 agrees", "No"] })).toMatch(/Options/);
    expect(validateSpeakerReferences({ ...base, options: JSON.stringify(["S1 agrees", "No"]) })).toMatch(/Options/);
    expect(validateSpeakerReferences({ ...base, explanation: "S3 feels cautious." })).toMatch(/Explanation.*"S3"/);
    // Only listening questions - other content is untouched by this rule.
    expect(validateSpeakerReferences({ ...base, category: "GRAMMAR", type: "MULTIPLE_CHOICE", prompt: "Which form is S1?" })).toBeNull();
  });
});
