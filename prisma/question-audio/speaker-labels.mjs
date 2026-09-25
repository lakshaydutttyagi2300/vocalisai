// Helpers for repairing question-bank content that exposes internal speaker
// ids (S1, S2, ...). Plain JS so prisma/fix-speaker-labels.mjs can use them
// without a build step; parseDialogueText MUST match the one in
// src/lib/question-stimulus.ts (checked by tests/unit/speaker-labels.test.ts).

const DIALOGUE_LINE = /^\s*(S\s?\d{1,2}|Speaker\s*\d{1,2})\s*:\s*(\S.*)$/i;

export function parseDialogueText(text) {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  const turns = [];
  for (const line of lines) {
    const m = line.match(DIALOGUE_LINE);
    if (!m) return null;
    turns.push({ speaker: `S${m[1].replace(/\D/g, "")}`, text: m[2].trim() });
  }
  return turns;
}

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];

// Rewrites "S2" / "S2's" into "the second speaker" / "the second speaker's",
// where "second" is that id's position in the SPEAKING ORDER (not its
// number), so the wording always matches what the candidate hears.
// Capitalises "The" at the start of a sentence. Returns { text, unknown }:
// unknown lists labels that don't occur in the dialogue (text unchanged for
// those, and the caller should not apply the change).
export function rewriteSpeakerRefs(text, speakingOrder) {
  const unknown = [];
  if (typeof text !== "string" || !text) return { text, unknown };
  const out = text.replace(/\bS\s?(\d{1,2})('s)?\b/g, (match, num, possessive, offset, whole) => {
    const pos = speakingOrder.indexOf(`S${num}`);
    if (pos < 0 || pos >= ORDINALS.length) {
      unknown.push(match);
      return match;
    }
    const before = whole.slice(0, offset);
    const sentenceStart = /^\s*$/.test(before) || /[.!?]\s+$/.test(before) || /["'‘“(]\s*$/.test(before);
    return `${sentenceStart ? "The" : "the"} ${ORDINALS[pos]} speaker${possessive ?? ""}`;
  });
  return { text: out, unknown };
}

// Same delivery settings the question bank's existing audio specs use per
// level (maxPlays / speechRate), so converted questions behave like the rest.
const LEVEL_DEFAULTS = {
  BEGINNER: { maxPlays: 2, speechRate: 0.9 },
  INTERMEDIATE: { maxPlays: 2, speechRate: 1.0 },
  ADVANCED: { maxPlays: 1, speechRate: 1.0 },
  EXPERT: { maxPlays: 1, speechRate: 1.05 },
};

// A plain-text "S1: ... / S2: ..." dialogue as a standard audio spec (then
// given real audio by generate-question-audio.mjs).
export function dialogueToSpec(turns, difficulty) {
  const d = LEVEL_DEFAULTS[difficulty] ?? LEVEL_DEFAULTS.INTERMEDIATE;
  const speakers = [...new Set(turns.map((t) => t.speaker))];
  const voices = Object.fromEntries(speakers.map((s, i) => [s, i === 0 ? "adult, clear, neutral international accent" : "adult, contrasting voice and pitch"]));
  return {
    audio: {
      script: turns,
      voices,
      speechRate: d.speechRate,
      pauseBetweenTurnsMs: 400,
      maxPlays: d.maxPlays,
      ttsNotes: null,
      generationStatus: "not_generated",
      audioAssetKey: null,
      transcriptVisibleToCandidate: false,
      convertedFrom: "plain-text dialogue",
    },
  };
}

export function speakingOrderOf(passage) {
  if (typeof passage !== "string") return [];
  const t = passage.trim();
  if (t.startsWith("{")) {
    try {
      const script = JSON.parse(t)?.audio?.script;
      return Array.isArray(script) ? [...new Set(script.map((s) => s?.speaker).filter(Boolean))] : [];
    } catch {
      return [];
    }
  }
  const turns = parseDialogueText(t);
  return turns ? [...new Set(turns.map((x) => x.speaker))] : [];
}
