// The ONE place a question's `passage` field is interpreted for candidates.
//
// `passage` historically holds either plain text (a reading passage, a
// sentence to read aloud, a customer's opening line) or - for imported
// question-bank content - a JSON production spec such as
//   {"audio":{"script":[{"speaker":"S1","text":"..."}],"voices":{...},
//    "speechRate":0.85,"maxPlays":2,"generationStatus":"not_generated",...}}
//   {"image":{"prompt":"<illustrator brief>","altText":"...","keyElements":[...],...}}
// Those specs are production notes, not candidate content, and must NEVER
// be shown as-is. Every candidate-facing route converts `passage` to a
// Stimulus with parseStimulus(), and only candidateStimulus()'s output ever
// leaves the server - internal fields (voices, speechRate, ttsNotes,
// generationStatus, audioAssetKey, the illustrator prompt, ...) are dropped
// here, and anything JSON-shaped that isn't a recognised spec renders as
// nothing at all rather than as raw JSON.
//
// Admin screens keep reading/writing the raw column unchanged.

import { audioScriptHash } from "@/lib/audio-script-hash";

export interface AudioTurn {
  speaker: string;
  text: string;
}

export type Stimulus =
  | { kind: "none" }
  | { kind: "text"; text: string }
  // A listening recording, spoken in the browser from its script. The
  // script text has to reach the browser to be spoken, but the UI never
  // displays it (same as plain-text listening passages always worked).
  // audioUrl: the generated recording (prisma/generate-question-audio.mjs),
  // served by /api/questions/[id]/audio - null when none is available yet
  // (or it no longer matches the script), in which case the browser speaks
  // `turns` instead. transcript: only when the spec explicitly allows it
  // (transcriptVisibleToCandidate: true), with neutral speaker labels.
  | {
      kind: "audio";
      turns: AudioTurn[];
      rate: number;
      pauseMs: number;
      playLimit: number | null;
      audioUrl: string | null;
      transcript: { label: string; text: string }[] | null;
    }
  // A picture task whose image hasn't been produced yet: the candidate gets
  // a written scene description instead of the illustrator's brief.
  | { kind: "image"; description: string; features: string[] };

const NONE: Stimulus = { kind: "none" };

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function turnsOf(audio: Record<string, unknown>): AudioTurn[] {
  const script = Array.isArray(audio.script) ? audio.script : [];
  return script
    .map((t) => (t && typeof t === "object" ? (t as Record<string, unknown>) : null))
    .filter((t): t is Record<string, unknown> => !!t && isStr(t.text))
    .map((t) => ({ speaker: isStr(t.speaker) ? t.speaker.trim().slice(0, 20) : "S1", text: (t.text as string).trim() }));
}

// Keys the generator writes (question-audio/<uuid>.wav|mp3) - anything else
// is ignored, so a spec can never point the audio route at another file
// (e.g. a candidate's private recording).
const AUDIO_ASSET_KEY = /^question-audio\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(wav|mp3)$/;

// The storage key of an up-to-date generated recording for this spec, or
// null (not generated, failed, invalid key, or the script changed since).
function freshAssetKey(audio: Record<string, unknown>, turns: AudioTurn[]): string | null {
  if (audio.generationStatus !== "generated") return null;
  if (typeof audio.audioAssetKey !== "string" || !AUDIO_ASSET_KEY.test(audio.audioAssetKey)) return null;
  if (audio.audioScriptHash !== audioScriptHash(turns, audio.speechRate as number | null | undefined)) return null;
  return audio.audioAssetKey;
}

function audioFromSpec(audio: Record<string, unknown>, questionId: string | null): Stimulus | null {
  const turns = turnsOf(audio);
  if (turns.length === 0) return null;
  const rate = typeof audio.speechRate === "number" && Number.isFinite(audio.speechRate) ? clamp(audio.speechRate, 0.5, 1.5) : 0.95;
  const pauseMs =
    typeof audio.pauseBetweenTurnsMs === "number" && Number.isFinite(audio.pauseBetweenTurnsMs) ? clamp(Math.round(audio.pauseBetweenTurnsMs), 0, 3000) : 400;
  const playLimit = typeof audio.maxPlays === "number" && Number.isInteger(audio.maxPlays) && audio.maxPlays >= 1 ? Math.min(audio.maxPlays, 10) : null;
  const audioUrl = questionId && freshAssetKey(audio, turns) ? `/api/questions/${encodeURIComponent(questionId)}/audio` : null;
  // Speaker ids (S1, S2, ...) stay internal: a visible transcript uses
  // "Speaker 1", "Speaker 2" in order of appearance.
  const order = [...new Set(turns.map((t) => t.speaker))];
  const transcript = audio.transcriptVisibleToCandidate === true ? turns.map((t) => ({ label: `Speaker ${order.indexOf(t.speaker) + 1}`, text: t.text })) : null;
  return { kind: "audio", turns, rate, pauseMs, playLimit, audioUrl, transcript };
}

// Server-only: the storage key the audio route may stream for a question's
// passage, or null. Never sent to the browser.
export function generatedAudioKey(passage: string | null | undefined): string | null {
  if (!isStr(passage) || !looksLikeJson(passage)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(passage);
  } catch {
    return null;
  }
  const audio = (parsed as { audio?: unknown } | null)?.audio;
  if (!audio || typeof audio !== "object") return null;
  const a = audio as Record<string, unknown>;
  return freshAssetKey(a, turnsOf(a));
}

function imageFromSpec(image: Record<string, unknown>): Stimulus | null {
  const description = isStr(image.altText) ? image.altText.trim() : null;
  if (!description) return null; // the illustrator brief (`prompt`) is never shown
  const features = Array.isArray(image.keyElements) ? image.keyElements.filter(isStr).map((s) => s.trim()).slice(0, 12) : [];
  return { kind: "image", description, features };
}

// Recognises a JSON stimulus spec. Returns null when `raw` isn't a
// recognised spec (including malformed JSON).
export function parseStimulusSpec(raw: string, questionId: string | null = null): Stimulus | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;
  if (obj.audio && typeof obj.audio === "object") return audioFromSpec(obj.audio as Record<string, unknown>, questionId);
  if (obj.image && typeof obj.image === "object") return imageFromSpec(obj.image as Record<string, unknown>);
  return null;
}

export function looksLikeJson(raw: string): boolean {
  const t = raw.trim();
  return t.startsWith("{") || t.startsWith("[");
}

export function isListeningQuestion(q: { type?: string | null; category?: string | null }): boolean {
  return q.type === "LISTENING_COMPREHENSION" || q.category === "LISTENING";
}

// A plain-text dialogue script: EVERY non-empty line is "S1: ..." (or
// "Speaker 1: ..."). The labels are speaker ids, not words to read out - a
// dialogue is split into turns so each speaker gets their own voice and the
// label itself is never spoken or shown. Any other text returns null.
// MUST match prisma/question-audio/speaker-labels.mjs (see its tests).
const DIALOGUE_LINE = /^\s*(S\s?\d{1,2}|Speaker\s*\d{1,2})\s*:\s*(\S.*)$/i;

export function parseDialogueText(text: string): AudioTurn[] | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  const turns: AudioTurn[] = [];
  for (const line of lines) {
    const m = line.match(DIALOGUE_LINE);
    if (!m) return null;
    turns.push({ speaker: `S${m[1].replace(/\D/g, "")}`, text: m[2].trim() });
  }
  return turns;
}

// "S2" (internal) -> "Speaker 2" (by order of appearance), for display.
function speakerLabels(turns: AudioTurn[]): { label: string; text: string }[] {
  const order = [...new Set(turns.map((t) => t.speaker))];
  return turns.map((t) => ({ label: `Speaker ${order.indexOf(t.speaker) + 1}`, text: t.text }));
}

export function parseStimulus(passage: string | null | undefined, q: { id?: string | null; type?: string | null; category?: string | null } = {}): Stimulus {
  if (!isStr(passage)) return NONE;
  if (looksLikeJson(passage)) return parseStimulusSpec(passage, q.id ?? null) ?? NONE; // never raw JSON
  const dialogue = parseDialogueText(passage);
  // Plain text: a listening passage is heard, never read (a dialogue as
  // separate voices, its labels never spoken); anything else is shown - a
  // written dialogue with neutral "Speaker 1:" labels instead of S1/S2.
  if (isListeningQuestion(q)) {
    return {
      kind: "audio",
      turns: dialogue ?? [{ speaker: "S1", text: passage.trim() }],
      rate: 0.95,
      pauseMs: 400,
      playLimit: null,
      audioUrl: null,
      transcript: null,
    };
  }
  if (dialogue) return { kind: "text", text: speakerLabels(dialogue).map((t) => `${t.label}: ${t.text}`).join("\n") };
  return { kind: "text", text: passage };
}

// Question text (wording, options, answer, explanation) must never refer to
// the internal speaker ids - candidates only ever hear voices, or see
// "Speaker 1/2". Used by admin import/edit for listening questions, so new
// content can't reintroduce "What is S2's view?". Error message or null.
const SPEAKER_ID = /\bS\s?\d{1,2}\b/;
export function validateSpeakerReferences(q: {
  category?: string | null;
  type?: string | null;
  prompt?: string | null;
  options?: string[] | string | null;
  correctAnswer?: string | null;
  explanation?: string | null;
}): string | null {
  if (!isListeningQuestion(q)) return null;
  const options = Array.isArray(q.options) ? q.options.join(" ") : (q.options ?? "");
  for (const [field, value] of [["Prompt", q.prompt], ["Options", options], ["Correct answer", q.correctAnswer], ["Explanation", q.explanation]] as const) {
    const m = typeof value === "string" ? value.match(SPEAKER_ID) : null;
    if (m) {
      return `${field} mentions the internal speaker label "${m[0]}". Candidates never see those labels - write "the first speaker", "the second speaker", etc. instead.`;
    }
  }
  return null;
}

// What may be sent to a candidate's browser: the stimulus plus a
// `passage` that is ONLY ever plain display text (null otherwise), so any
// older client code that still reads `passage` can't show JSON or a
// listening transcript.
export function candidateStimulus(passage: string | null | undefined, q: { id?: string | null; type?: string | null; category?: string | null } = {}) {
  const stimulus = parseStimulus(passage, q);
  return { stimulus, passage: stimulus.kind === "text" ? stimulus.text : null };
}

// Plain text to use server-side where a passage feeds a prompt (e.g. an AI
// conversation's opening line). Null when there's no usable text.
export function stimulusText(passage: string | null | undefined): string | null {
  const s = parseStimulus(passage);
  if (s.kind === "text") return s.text;
  if (s.kind === "image") return s.description;
  if (s.kind === "audio") return s.turns.map((t) => t.text).join(" ");
  return null;
}

// Admin-import check for future content: a passage that looks like JSON
// must be a spec this renderer understands - otherwise candidates would
// get an empty stimulus. Returns an error message, or null if acceptable.
export function validatePassageStimulus(passage: string | null | undefined): string | null {
  if (!isStr(passage) || !looksLikeJson(passage)) return null;
  return parseStimulusSpec(passage)
    ? null
    : 'Passage looks like JSON but isn\'t a recognised stimulus. Use plain text, {"audio":{"script":[{"speaker":"S1","text":"..."}]}} or {"image":{"altText":"..."}}.';
}
