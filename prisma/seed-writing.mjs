// IA restructuring Stage 4: Writing category. Deliberately small - just
// sentence rewriting, short responses and professional messages, not every
// writing sub-skill imaginable. Reuses the exact same open-ended SHORT_ANSWER
// pattern already used by INTERVIEW (no correctAnswer, stored with
// isCorrect/score left null - see src/app/api/practice/attempts/route.ts) -
// no new question type or scoring path needed.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const WRITING_QUESTIONS = [
  {
    difficulty: "BEGINNER",
    prompt: "Rewrite this sentence correctly: \"She don't like coffee in the morning.\"",
  },
  {
    difficulty: "BEGINNER",
    prompt: "Write two or three sentences describing what you did yesterday.",
  },
  {
    difficulty: "INTERMEDIATE",
    prompt: "Rewrite this sentence to sound more polite: \"Send me the file now.\"",
  },
  {
    difficulty: "INTERMEDIATE",
    prompt: "Write a short message asking a colleague to reschedule a meeting to next week.",
  },
  {
    difficulty: "ADVANCED",
    prompt: "Write a short paragraph explaining why deadlines matter on a team project.",
  },
  {
    difficulty: "ADVANCED",
    prompt: "Write a professional email letting a customer know their order will be delayed by two days.",
  },
  {
    difficulty: "EXPERT",
    prompt: "Write a short paragraph persuading your manager to approve a new tool for the team, addressing one likely objection.",
  },
  {
    difficulty: "EXPERT",
    prompt:
      "Rewrite this paragraph to be clearer and more concise: \"So basically what happened was that the system kind of went down for a while and we weren't really sure why but then it came back up and everything seemed to be okay after that.\"",
  },
];

async function main() {
  const existing = await db.practiceQuestion.count({ where: { category: "WRITING" } });
  if (existing > 0) {
    console.log("Skipping: WRITING already seeded.");
    return;
  }

  const rows = WRITING_QUESTIONS.map((q) => ({
    category: "WRITING",
    difficulty: q.difficulty,
    type: "SHORT_ANSWER",
    prompt: q.prompt,
    passage: null,
    options: null,
    correctAnswer: null,
    explanation: null,
    scoringCriteria: "Assess grammar, clarity, tone and structure appropriate to the task. No fixed answer.",
    timeLimitSeconds: 180,
  }));

  await db.practiceQuestion.createMany({ data: rows });
  console.log(`Seeded ${rows.length} WRITING questions.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
