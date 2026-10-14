// Natural-sounding listening audio with Kokoro (free, local, Apache-2.0):
// a US and a UK voice of different genders per conversation, chosen the same
// way every time for a question, saved as a small mono MP3. Kokoro and
// ffmpeg are NOT app dependencies: they live in a tools folder on the
// machine that generates audio (node_modules/kokoro-js, ffmpeg-static).

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Two accents x two genders, so the two speakers in a conversation always sound clearly different.
export const KOKORO_VOICES = {
  us: { female: ["af_heart", "af_bella"], male: ["am_michael", "am_fenrir"] },
  uk: { female: ["bf_emma", "bf_isabella"], male: ["bm_george", "bm_fable"] },
};

const RATE = 24000;

/** Speaker -> Kokoro voice for one question: the same every run, contrasting accent and gender. */
export function kokoroVoicesFor(seed, speakers) {
  const h = createHash("sha256").update(seed).digest();
  const [first, second] = h[0] % 2 ? ["us", "uk"] : ["uk", "us"];
  const [g1, g2] = h[1] % 2 ? ["female", "male"] : ["male", "female"];
  const pick = (accent, gender, byte) => KOKORO_VOICES[accent][gender][byte % 2];
  const plan = [pick(first, g1, h[2]), pick(second, g2, h[3]), pick(first, g2, h[4]), pick(second, g1, h[5])];
  return new Map(speakers.map((s, i) => [s, plan[i % plan.length]]));
}

function wav16(samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + i * 2));
  return buf;
}

/** Loads Kokoro once; returns speak(turns, options) -> MP3 buffer. */
export async function createKokoroSpeaker(toolsDir) {
  const kokoroPkg = path.join(toolsDir, "kokoro", "package.json");
  const ffmpeg = path.join(toolsDir, "node_modules", "ffmpeg-static", "ffmpeg.exe");
  if (!existsSync(kokoroPkg) || !existsSync(ffmpeg)) throw new Error(`Kokoro or ffmpeg not found in ${toolsDir}`);
  const req = createRequire(kokoroPkg);
  const { KokoroTTS } = await import(pathToFileURL(req.resolve("kokoro-js")).href);
  const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });

  return async function speak(turns, { seed, speechRate = 0.9, pauseMs = 450, workDir }) {
    const voices = kokoroVoicesFor(seed, [...new Set(turns.map((t) => t.speaker))]);
    const parts = [new Float32Array(Math.round(RATE * 0.3))];
    for (const [i, t] of turns.entries()) {
      if (i > 0) parts.push(new Float32Array(Math.round((RATE * Math.max(0, Math.min(3000, pauseMs))) / 1000)));
      // One sentence at a time: Kokoro silently cuts off very long inputs.
      const sentences = t.text.split(/(?<=[.!?])\s+/).filter(Boolean);
      for (const [k, s] of sentences.entries()) {
        if (k > 0) parts.push(new Float32Array(Math.round(RATE * 0.12)));
        parts.push((await tts.generate(s, { voice: voices.get(t.speaker), speed: Math.max(0.7, Math.min(1.2, speechRate)) })).audio);
      }
    }
    parts.push(new Float32Array(Math.round(RATE * 0.3)));
    const samples = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of parts) {
      samples.set(p, at);
      at += p.length;
    }
    const wav = path.join(workDir, `${seed}.wav`);
    const mp3 = path.join(workDir, `${seed}.mp3`);
    writeFileSync(wav, wav16(samples));
    execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-b:a", "64k", mp3]);
    const out = readFileSync(mp3);
    rmSync(wav);
    rmSync(mp3);
    return { buffer: out, seconds: samples.length / RATE, voices: Object.fromEntries(voices) };
  };
}
