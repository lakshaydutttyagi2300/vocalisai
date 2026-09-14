// FLUENCY was defined as a practice mode since Phase 3 but never actually
// seeded with content - caught while auditing question-bank coverage during
// Phase 4. Fluency drills emphasize smooth, continuous delivery (no long
// pauses/fillers) rather than open topics (that's Speaking) or a fixed
// script (that's Reading).

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const FLUENCY = [
  {
    difficulty: "BEGINNER",
    prompt: "Without pausing, say three sentences about what you did this morning.",
    timeLimitSeconds: 30,
  },
  {
    difficulty: "BEGINNER",
    prompt: "Count out loud from one to twenty as smoothly and quickly as you can, without stopping.",
    timeLimitSeconds: 20,
  },
  {
    difficulty: "INTERMEDIATE",
    prompt: "Describe your favorite meal, speaking continuously for 30 seconds without long pauses.",
    timeLimitSeconds: 45,
  },
  {
    difficulty: "INTERMEDIATE",
    prompt: "Explain the steps to make a cup of tea, speaking smoothly from start to finish.",
    timeLimitSeconds: 45,
  },
  {
    difficulty: "ADVANCED",
    prompt:
      "Speak continuously for 45 seconds about a movie or show you watched recently, without saying 'um' or 'like'.",
    timeLimitSeconds: 60,
  },
  {
    difficulty: "ADVANCED",
    prompt: "Describe your ideal weekend from start to finish without hesitating between sentences.",
    timeLimitSeconds: 60,
  },
  {
    difficulty: "EXPERT",
    prompt:
      "Speak for one full minute about why customer service matters, keeping a steady pace with no long pauses or filler words.",
    timeLimitSeconds: 75,
  },
  {
    difficulty: "EXPERT",
    prompt:
      "Give smooth, continuous directions from your home to the nearest market, as if guiding someone who has never been there.",
    timeLimitSeconds: 75,
  },
];

async function main() {
  const existing = await db.practiceQuestion.count({ where: { category: "FLUENCY" } });
  if (existing > 0) {
    console.log(`Skipping: ${existing} FLUENCY questions already exist.`);
    return;
  }

  const rows = FLUENCY.map((f) => ({
    category: "FLUENCY",
    difficulty: f.difficulty,
    type: "SHORT_ANSWER",
    prompt: f.prompt,
    passage: null,
    options: null,
    correctAnswer: null,
    expectedAnswer: null,
    explanation: null,
    scoringCriteria: "Assess hesitations, filler words, repetitions and pace once voice analysis (Phase 8) is live. No fixed answer.",
    timeLimitSeconds: f.timeLimitSeconds,
  }));

  await db.practiceQuestion.createMany({ data: rows });
  console.log(`Seeded ${rows.length} FLUENCY questions.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
