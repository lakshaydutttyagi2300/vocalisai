// Re-voices listening questions with ElevenLabs natural voices, within a
// hard credit budget. Each speaker gets a different voice and accent
// (S1 Indian female, S2 British male, S3 American female, S4 Indian male),
// with a short pause between turns. The finished MP3 is stored under
// question-audio/ and written back into the SAME audio spec the players
// already read (generationStatus/audioAssetKey/audioScriptHash), so nothing
// else changes - and if a question isn't re-voiced, its existing audio
// (or the browser voice) is still used.
//
// Practice-test questions (pinned to an exam part) go first, then the rest.
//
//   npm run generate:listening-voices -- --dry-run                 # cost estimate only
//   npm run generate:listening-voices -- --max-credits 5000        # spend at most 5,000 credits
//   npm run generate:listening-voices -- --limit 10 --production   # REQUIRED for the live DB
//
// Needs ELEVENLABS_API_KEY. Refuses unknown databases.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertDevDatabase } from "./exam-demo/seed.mjs";
import { uploadAsset } from "./exam-demo/assets.mjs";
import { audioScriptHash } from "./question-audio/script-hash.mjs";
import { creditCost, elevenLabsRemainingCredits, elevenLabsSpeech, isElevenLabsConfigured, voiceFor } from "../src/lib/tts/elevenlabs.ts";

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const num = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
const limit = num("--limit", Infinity);
const maxCredits = num("--max-credits", 5000);
const reserve = Number(process.env.ELEVENLABS_RESERVE_CREDITS ?? 1000);

const SPEAKER_VOICES = [
  ["IN", "female"],
  ["UK", "male"],
  ["US", "female"],
  ["IN", "male"],
];

function turnsOf(audio) {
  return (Array.isArray(audio.script) ? audio.script : [])
    .filter((t) => t && typeof t.text === "string" && t.text.trim())
    .map((t) => ({ speaker: typeof t.speaker === "string" && t.speaker.trim() ? t.speaker.trim().slice(0, 20) : "S1", text: t.text.trim() }));
}

export function planListeningVoices(questions) {
  const todo = [];
  for (const q of questions) {
    let spec;
    try {
      spec = JSON.parse(q.passage);
    } catch {
      continue;
    }
    const audio = spec?.audio;
    if (!audio || typeof audio !== "object") continue;
    const turns = turnsOf(audio);
    if (turns.length === 0) continue;
    const upToDate = audio.voiceProvider === "elevenlabs" && audio.generationStatus === "generated" && audio.audioScriptHash === audioScriptHash(turns, audio.speechRate);
    if (upToDate && !flag("--force")) continue;
    const speakers = [...new Set(turns.map((t) => t.speaker))];
    const credits = turns.reduce((s, t) => s + creditCost(t.text), 0);
    todo.push({ q, spec, turns, speakers, credits });
  }
  return todo;
}

async function main() {
  const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: flag("--production") });
  console.log(`Database: ${host}${flag("--production") ? "  (PRODUCTION)" : ""}${flag("--dry-run") ? "  [dry run]" : ""}`);
  if (!flag("--dry-run") && !isElevenLabsConfigured()) throw new Error("ELEVENLABS_API_KEY is not set. Nothing was changed.");

  const db = new PrismaClient();
  try {
    const questions = await db.practiceQuestion.findMany({
      where: { isActive: true, passage: { contains: '"audio"' } },
      select: { id: true, category: true, difficulty: true, prompt: true, passage: true, examPartId: true },
      orderBy: { createdAt: "asc" },
    });
    // Practice-test questions first.
    questions.sort((a, b) => (a.examPartId ? 0 : 1) - (b.examPartId ? 0 : 1));
    const todo = planListeningVoices(questions).slice(0, limit);
    const total = todo.reduce((s, t) => s + t.credits, 0);
    console.log(`${todo.length} listening question(s) to voice, about ${total.toLocaleString("en-IN")} credits in total. Budget for this run: ${maxCredits.toLocaleString("en-IN")}.`);
    if (flag("--dry-run")) {
      for (const t of todo.slice(0, 20)) console.log(`  ~${t.credits} credits  ${t.q.examPartId ? "[practice test] " : ""}${t.q.prompt.slice(0, 60)}`);
      return;
    }

    let spent = 0;
    let done = 0;
    for (const t of todo) {
      if (spent + t.credits > maxCredits) {
        console.log(`Stopping: the next question would go over this run's budget (${maxCredits}).`);
        break;
      }
      const remaining = await elevenLabsRemainingCredits();
      if (remaining !== null && remaining - t.credits < reserve) {
        console.log(`Stopping: only ${remaining} credits left on the account (keeping ${reserve} in reserve).`);
        break;
      }
      try {
        const parts = [];
        for (const turn of t.turns) {
          const [accent, gender] = SPEAKER_VOICES[t.speakers.indexOf(turn.speaker) % SPEAKER_VOICES.length];
          parts.push(await elevenLabsSpeech(`${turn.text} <break time="0.5s" />`, voiceFor(accent, gender)));
        }
        const key = await uploadAsset(Buffer.concat(parts), "mp3", "audio/mpeg", "question-audio");
        const audio = t.spec.audio;
        const next = {
          ...t.spec,
          audio: {
            ...audio,
            generationStatus: "generated",
            audioAssetKey: key,
            audioScriptHash: audioScriptHash(t.turns, audio.speechRate),
            generatedAt: new Date().toISOString(),
            generationError: null,
            voiceProvider: "elevenlabs",
          },
        };
        await db.practiceQuestion.update({ where: { id: t.q.id }, data: { passage: JSON.stringify(next) } });
        spent += t.credits;
        done++;
        console.log(`  voiced (${t.credits} credits): ${t.q.prompt.slice(0, 60)}`);
      } catch (err) {
        console.log(`  FAILED - kept the existing audio: ${err instanceof Error ? err.message.slice(0, 160) : err}`);
      }
    }
    console.log(`Done: ${done} voiced, about ${spent.toLocaleString("en-IN")} credits used.`);
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/generate-listening-voices.mjs")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
