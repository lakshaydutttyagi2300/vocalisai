// Fingerprint of a listening script (speakers + words + speed), stored on
// the question when its audio file is generated. If an admin later edits
// the dialogue, the fingerprint no longer matches and the stale file is
// ignored (the browser speaks the new script instead) - a question can
// never play audio that doesn't match its words.
//
// MUST stay identical to prisma/question-audio/script-hash.mjs, which the
// offline generator uses (checked by tests/unit/question-audio.test.ts).

export function audioScriptHash(turns: { speaker: string; text: string }[], speechRate: number | null | undefined): string {
  const input = JSON.stringify({ t: turns.map((t) => [t.speaker, t.text]), r: typeof speechRate === "number" ? speechRate : null });
  // FNV-1a, 32-bit - a change detector, not a security measure.
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
