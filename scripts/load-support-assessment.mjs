// Creates the Customer Support (BPO) English Assessment - its exam version,
// timed sections and template - and loads its question sets ("forms") from
// a private content file with their audio. The content and answer keys are
// never in this public repo: keep them in the git-ignored private/ folder.
//
//   node scripts/load-support-assessment.mjs <content.json> <audio dir>                 # dry run, dev database
//   node scripts/load-support-assessment.mjs <content.json> <audio dir> --save
//   DATABASE_URL=... node scripts/load-support-assessment.mjs ... --save --production   # the live database
//
// Additive and re-runnable: the exam is created once, and a form whose
// questions are already loaded is skipped. Audio files are uploaded once and
// their storage keys remembered in <audio dir>/uploaded.json.

import "dotenv/config";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { assertDevDatabase } from "../prisma/exam-demo/seed.mjs";
import { uploadAsset } from "../prisma/exam-demo/assets.mjs";
import { audioScriptHash } from "../prisma/question-audio/script-hash.mjs";

const FAMILY = { slug: "CUSTOMER_SERVICE_ENGLISH", name: "Customer Service English" };
const VARIANT = {
  slug: "CUSTOMER_SUPPORT_BPO",
  name: "Customer Support (BPO) English",
  scoreScale: "PASS_MERIT_DISTINCTION",
  description:
    "A short, demanding test for call-centre and customer support jobs: US and UK calls, repeating, dictation, grammar, retelling, fast answers and two customer role-play calls. Score out of 100.",
};
const TEMPLATE_NAME = "Customer Support English Assessment";
const DIFFICULTY = "ADVANCED";

// Papers in the order a candidate meets them (getting harder), each with its
// parts: [part name, instructions, category, question count, prep, response, kind].
const PAPERS = [
  { name: "Listening: US and UK calls", seconds: 600, nav: "FREE_WITHIN_SECTION", review: true,
    instructions: "Listen to two short customer calls, one with American and one with British speakers. You can play each call twice. Answer five questions about each.",
    parts: [["US accent call", "An American agent and customer.", "LISTENING", 5, null, null, "us"], ["UK accent call", "A British agent and customer.", "LISTENING", 5, null, null, "uk"]] },
  { name: "Listen and repeat", seconds: 240, nav: "LOCKED_SEQUENTIAL", review: false,
    instructions: "Play each sentence once, then repeat it exactly. The sentences get longer.",
    parts: [["Listen and repeat", "Play the sentence, then press Start and repeat it word for word.", "PRONUNCIATION", 5, 3, 15, "repeat"]] },
  { name: "Dictation", seconds: 300, nav: "LOCKED_SEQUENTIAL", review: false,
    instructions: "Type each sentence exactly as you hear it. Write numbers, dates and codes as digits (for example 14th, 0193, BK4729). You can play each sentence twice.",
    parts: [["Dictation", null, "LISTENING", 5, null, null, "dictation"]] },
  { name: "Customer calls", seconds: 540, nav: "FREE_WITHIN_SECTION", review: true,
    instructions: "Three customers call with a problem. For each call: what happened, what does the customer want, and what should the agent do? You can play each call twice.",
    parts: [["Customer calls", null, "LISTENING", 9, null, null, "calls"]] },
  { name: "Grammar and vocabulary", seconds: 360, nav: "FREE_WITHIN_SECTION", review: true,
    instructions: "Ten questions on the English used with customers and at work.",
    parts: [["Grammar and vocabulary", null, "GRAMMAR", 10, null, null, "grammar"]] },
  { name: "Listen and retell", seconds: 300, nav: "LOCKED_SEQUENTIAL", review: false,
    instructions: "Play each short story once, then retell it in your own words. Include who, what happened, what was done and the result.",
    parts: [["Listen and retell", null, "SPEAKING", 2, 10, 60, "retell"]] },
  { name: "Fast speaking", seconds: 240, nav: "LOCKED_SEQUENTIAL", review: false,
    instructions: "Three quick questions. Answer clearly and keep going until the time is up.",
    parts: [["Fast speaking", null, "FLUENCY", 3, 10, 40, "fast"]] },
  { name: "Customer role-play", seconds: 480, nav: "LOCKED_SEQUENTIAL", review: false,
    instructions: "Two calls. You are the agent; read the brief, play what the customer says, then reply. Each call has three turns.",
    parts: [["Call 1: an angry customer", null, "CUSTOMER_SERVICE", 3, 5, 40, "angry"], ["Call 2: a confused customer", null, "CUSTOMER_SERVICE", 3, 5, 40, "confused"]] },
];

const args = process.argv.slice(2);
const [contentPath, audioDir] = args.filter((a) => !a.startsWith("--"));
const save = args.includes("--save");
const production = args.includes("--production");
if (!contentPath || !audioDir) throw new Error("Usage: node scripts/load-support-assessment.mjs <content.json> <audio dir> [--save] [--production]");
const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: production });
console.log(`Database: ${host}${production ? " (PRODUCTION)" : ""} · ${save ? "SAVE" : "dry run"}`);

const content = JSON.parse(readFileSync(contentPath, "utf8"));
const accentOf = (voice) => (voice.startsWith("b") ? "UK" : "US");
const uploadedPath = join(audioDir, "uploaded.json");
const uploaded = existsSync(uploadedPath) ? JSON.parse(readFileSync(uploadedPath, "utf8")) : {};

/** Storage key of a clip's MP3, uploading it the first time. */
async function clipKey(clipId, prefix) {
  const file = join(audioDir, `${clipId}.mp3`);
  if (!existsSync(file)) throw new Error(`Missing audio ${file} - run make-audio.mjs first`);
  const buffer = readFileSync(file);
  const hash = createHash("sha256").update(buffer).digest("hex");
  const known = uploaded[clipId];
  if (known?.hash === hash && known.key.startsWith(`${prefix}/`)) return known.key;
  if (!save) return `${prefix}/(not uploaded in a dry run)`;
  const key = await uploadAsset(buffer, "mp3", "audio/mpeg", prefix);
  uploaded[clipId] = { hash, key };
  writeFileSync(uploadedPath, JSON.stringify(uploaded, null, 1));
  return key;
}

/** A question's own audio: the spec the candidate side plays (question-stimulus.ts). */
async function audioSpec(clipId, turns, maxPlays) {
  const script = turns.map((t, i) => ({ speaker: turns.length > 1 ? `S${i + 1}` : "S1", text: t.text }));
  return JSON.stringify({
    audio: {
      script,
      speechRate: 1,
      pauseBetweenTurnsMs: 450,
      maxPlays,
      accent: accentOf(turns[0].voice),
      transcriptVisibleToCandidate: false,
      generationStatus: "generated",
      audioAssetKey: await clipKey(clipId, "question-audio"),
      audioScriptHash: audioScriptHash(script, 1),
    },
  });
}

const db = new PrismaClient();
try {
  // 1. The exam: family, version, papers and parts, template.
  const family = await db.examFamily.findUnique({ where: { slug: FAMILY.slug } });
  let variant = family ? await db.examVariant.findFirst({ where: { familyId: family.id, slug: VARIANT.slug }, include: { papers: { include: { parts: true } } } }) : null;
  console.log(`exam: ${variant ? "exists" : "will be created"}`);
  if (!variant && save) {
    const fam = family ?? (await db.examFamily.create({ data: { ...FAMILY, description: "English for customer service and contact-centre work." } }));
    variant = await db.examVariant.create({
      data: {
        familyId: fam.id,
        ...VARIANT,
        papers: {
          create: PAPERS.map((p, i) => ({
            order: i + 1,
            name: p.name,
            durationSeconds: p.seconds,
            navigationMode: p.nav,
            allowReview: p.review,
            instructions: p.instructions,
            parts: { create: p.parts.map(([name, instructions, , , prep, response], j) => ({ order: j + 1, name, instructions, prepSeconds: prep, responseSeconds: response })) },
          })),
        },
      },
      include: { papers: { include: { parts: true } } },
    });
    await db.mockTestTemplate.create({
      data: {
        name: TEMPLATE_NAME,
        examVariantId: variant.id,
        sections: {
          create: PAPERS.flatMap((p, i) =>
            p.parts.map(([, , category, count], j) => ({
              order: i * 10 + j + 1,
              category,
              difficulty: DIFFICULTY,
              questionCount: count,
              examPartId: variant.papers.find((x) => x.order === i + 1).parts.find((x) => x.order === j + 1).id,
            }))
          ),
        },
      },
    });
  }
  const partId = (kind) => {
    if (!variant) return null;
    for (const [i, p] of PAPERS.entries()) {
      const j = p.parts.findIndex((x) => x[6] === kind);
      if (j >= 0) return variant.papers.find((x) => x.order === i + 1).parts.find((x) => x.order === j + 1).id;
    }
    throw new Error(kind);
  };

  // 2. The question sets.
  for (const f of content.forms) {
    const formTag = `support-form:${f.name}`;
    if (await db.practiceQuestion.count({ where: { tags: { has: formTag } } })) {
      console.log(`form ${f.name}: already loaded, skipped`);
      continue;
    }
    const groups = []; // { group, questions[] }
    const q = (kind, category, type, fields) => ({ category, difficulty: DIFFICULTY, type, timeLimitSeconds: 90, source: "SEEDED", tags: [`support:${kind}`, formTag], ...fields });
    const mcq = (kind, x) => q(kind, kind === "grammar" ? "GRAMMAR" : "LISTENING", "MULTIPLE_CHOICE", { prompt: x.prompt, options: JSON.stringify(x.options), correctAnswer: x.answer });
    const clipGroup = async (part, clipId, title, script, questions) => ({
      part,
      group: { type: "AUDIO", title, assetKey: await clipKey(`${f.name}-${clipId}`, "item-groups"), playLimit: 2, transcript: script.map((t) => t.text).join("\n") },
      questions,
    });
    const set = (part, title, text, questions) => ({ part, group: { type: "AUDIO", title, text }, questions });

    groups.push(await clipGroup("us", "us-call", f.usCall.title, f.usCall.script, f.usCall.questions.map((x) => mcq("us-listening", x))));
    groups.push(await clipGroup("uk", "uk-call", f.ukCall.title, f.ukCall.script, f.ukCall.questions.map((x) => mcq("uk-listening", x))));
    for (const [i, call] of f.calls.entries()) groups.push(await clipGroup("calls", `call-${i + 1}`, call.title, call.script, call.questions.map((x) => mcq(x.kind, x))));
    groups.push(set("repeat", null, null, await Promise.all(f.repeat.map(async (r, i) => q("repeat", "PRONUNCIATION", "TIMED_SPEAKING", { prompt: "Repeat the sentence exactly as you heard it.", passage: await audioSpec(`${f.name}-repeat-${i + 1}`, [r], 1), expectedAnswer: r.text })))));
    groups.push(set("dictation", null, null, await Promise.all(f.dictation.map(async (d, i) => q("dictation", "LISTENING", "DICTATION", { prompt: "Type the sentence exactly as you hear it.", passage: await audioSpec(`${f.name}-dictation-${i + 1}`, [{ voice: d.voice, text: d.say }], 2), correctAnswer: d.text })))));
    groups.push(set("retell", null, null, await Promise.all(f.retell.map(async (r, i) => q("retell", "SPEAKING", "TIMED_SPEAKING", { prompt: "Retell the story in your own words.", passage: await audioSpec(`${f.name}-retell-${i + 1}`, [r], 1), expectedAnswer: r.keyPoints })))));
    groups.push(set("fast", null, null, f.fast.map((x) => q("fast-speaking", "FLUENCY", "TIMED_SPEAKING", { prompt: x.prompt, expectedAnswer: x.covers }))));
    for (const [i, rp] of f.roleplay.entries()) {
      groups.push(set(i === 0 ? "angry" : "confused", rp.title, rp.brief, await Promise.all(rp.turns.map(async (t, j) => q("roleplay", "CUSTOMER_SERVICE", "TIMED_SPEAKING", { prompt: "Reply to the customer.", passage: await audioSpec(`${f.name}-roleplay-${i + 1}-${j + 1}`, [{ voice: rp.voice, text: t.line }], 2), expectedAnswer: t.good })))));
    }
    const grammar = f.grammar.map((x) => ({ part: "grammar", question: mcq("grammar", x) }));
    const count = groups.reduce((n, g) => n + g.questions.length, 0) + grammar.length;
    console.log(`form ${f.name}: ${count} questions in ${groups.length} groups + ${grammar.length} single`);
    if (!save) continue;

    await db.$transaction(async (tx) => {
      for (const g of groups) {
        const group = await tx.itemGroup.create({ data: g.group });
        await tx.practiceQuestion.createMany({ data: g.questions.map((x, i) => ({ ...x, itemGroupId: group.id, orderInGroup: i + 1, examPartId: partId(g.part) })) });
      }
      await tx.practiceQuestion.createMany({ data: grammar.map((g) => ({ ...g.question, examPartId: partId(g.part) })) });
    }, { maxWait: 10_000, timeout: 120_000 }); // a dozen round trips to a remote database
    console.log(`form ${f.name}: saved`);
  }
} finally {
  await db.$disconnect();
}
