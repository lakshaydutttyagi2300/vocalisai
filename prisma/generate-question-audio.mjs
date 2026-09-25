// Generates real audio for every question-bank listening question whose
// passage is an audio spec ({"audio":{"script":[...], ...}}) that has no
// up-to-date audio yet (generationStatus != "generated", no audioAssetKey,
// or the script changed since - see audioScriptHash).
//
// For each one: speaks the script with a DIFFERENT voice per speaker (S1,
// S2, ... in order of appearance), at the spec's speechRate with its
// pauseBetweenTurnsMs, saves the WAV to storage under question-audio/, and
// writes back into the SAME spec: generationStatus "generated",
// audioAssetKey, audioScriptHash, generatedAt. Every other field (voices,
// maxPlays, ttsNotes, transcriptVisibleToCandidate, ...) is kept as-is, so
// admin editing keeps working on the same data. A failure is recorded as
// generationStatus "failed" + generationError; candidates then still hear
// the script through the browser's voices, never an error or raw data.
//
//   npm run generate:question-audio                  # dev database
//   npm run generate:question-audio -- --dry-run     # list what would be generated
//   npm run generate:question-audio -- --limit 5
//   npm run generate:question-audio -- --production  # REQUIRED for the live database
//
// Needs Windows (its built-in voices). Refuses unknown databases.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertDevDatabase } from "./exam-demo/seed.mjs";
import { canGenerateAssets, generateListeningWav, uploadAsset } from "./exam-demo/assets.mjs";
import { audioScriptHash } from "./question-audio/script-hash.mjs";

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const limitArg = args.indexOf("--limit");
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;

const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: flag("--production") });
console.log(`Database: ${host}${flag("--production") ? "  (PRODUCTION)" : ""}`);

const db = new PrismaClient();

function turnsOf(audio) {
  return (Array.isArray(audio.script) ? audio.script : [])
    .filter((t) => t && typeof t.text === "string" && t.text.trim())
    .map((t) => ({ speaker: typeof t.speaker === "string" && t.speaker.trim() ? t.speaker.trim().slice(0, 20) : "S1", text: t.text.trim() }));
}

function needsAudio(audio) {
  const turns = turnsOf(audio);
  if (turns.length === 0) return false; // nothing to speak - left alone
  const fresh = audio.generationStatus === "generated" && typeof audio.audioAssetKey === "string" && audio.audioScriptHash === audioScriptHash(turns, audio.speechRate);
  return !fresh;
}

async function main() {
  if (!flag("--dry-run") && !canGenerateAssets()) {
    throw new Error("Audio generation needs Windows (its built-in voices). Nothing was changed.");
  }

  const candidates = await db.practiceQuestion.findMany({
    where: { passage: { contains: '"audio"' } },
    select: { id: true, category: true, difficulty: true, prompt: true, passage: true },
    orderBy: { createdAt: "asc" },
  });

  const todo = [];
  for (const q of candidates) {
    let spec;
    try {
      spec = JSON.parse(q.passage);
    } catch {
      continue;
    }
    if (!spec?.audio || typeof spec.audio !== "object") continue;
    if (needsAudio(spec.audio) || flag("--force")) todo.push({ q, spec });
  }
  console.log(`${candidates.length} audio-spec question(s) found, ${todo.length} need audio.`);
  if (flag("--dry-run")) {
    for (const { q } of todo.slice(0, limit)) console.log(`  would generate: ${q.category}/${q.difficulty} ${q.prompt.slice(0, 60)}`);
    return;
  }

  let ok = 0;
  let failed = 0;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "question-audio-"));
  try {
    for (const [i, { q, spec }] of todo.slice(0, limit).entries()) {
      const audio = spec.audio;
      const turns = turnsOf(audio);
      try {
        const buf = await generateListeningWav(
          turns.map((t) => [t.speaker, t.text]),
          path.join(dir, `${q.id}.wav`),
          { speechRate: typeof audio.speechRate === "number" ? audio.speechRate : 0.9, pauseMs: typeof audio.pauseBetweenTurnsMs === "number" ? audio.pauseBetweenTurnsMs : 400 }
        );
        const key = await uploadAsset(buf, "wav", "audio/wav", "question-audio");
        const next = {
          ...spec,
          audio: {
            ...audio,
            generationStatus: "generated",
            audioAssetKey: key,
            audioScriptHash: audioScriptHash(turns, audio.speechRate),
            generatedAt: new Date().toISOString(),
            generationError: null,
          },
        };
        await db.practiceQuestion.update({ where: { id: q.id }, data: { passage: JSON.stringify(next) } });
        ok++;
        console.log(`  [${i + 1}/${Math.min(todo.length, limit)}] generated ${Math.round(buf.length / 1024)} KB - ${q.prompt.slice(0, 50)}`);
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message.split("\n")[0].slice(0, 200) : String(err);
        const next = { ...spec, audio: { ...audio, generationStatus: "failed", generationError: message } };
        await db.practiceQuestion.update({ where: { id: q.id }, data: { passage: JSON.stringify(next) } }).catch(() => {});
        console.log(`  [${i + 1}] FAILED (${message}) - ${q.prompt.slice(0, 50)}`);
      }
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
  console.log(`Done: ${ok} generated, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
