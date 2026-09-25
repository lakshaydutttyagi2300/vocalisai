// Same fingerprint as src/lib/audio-script-hash.ts (kept identical; see
// tests/unit/question-audio.test.ts). Plain JS so the offline generator can
// use it without a TypeScript build step.

export function audioScriptHash(turns, speechRate) {
  const input = JSON.stringify({ t: turns.map((t) => [t.speaker, t.text]), r: typeof speechRate === "number" ? speechRate : null });
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
