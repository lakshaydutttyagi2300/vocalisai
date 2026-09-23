// Real workplace/conversational scenarios for the two conversation roles
// that don't already have a question-bank category (CUSTOMER reuses
// CUSTOMER_SERVICE, INTERVIEWER reuses INTERVIEW - both already seeded).

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SUPERVISOR_SCENARIOS = [
  {
    difficulty: "BEGINNER",
    passage: "Your supervisor asks: \"Can you walk me through how that last call went?\"",
  },
  {
    difficulty: "INTERMEDIATE",
    passage:
      "Your supervisor says: \"I noticed the customer on your last call asked for a refund outside our policy window. Talk me through what happened.\"",
  },
  {
    difficulty: "ADVANCED",
    passage:
      "Your supervisor says: \"We missed the SLA on this ticket by six hours. I need to understand why before I report on it.\"",
  },
  {
    difficulty: "EXPERT",
    passage:
      "Your supervisor says: \"A customer escalated a complaint about you directly to management. I want to hear your side before we respond to them.\"",
  },
];

const CONVERSATION_PARTNER_SCENARIOS = [
  { difficulty: "BEGINNER", passage: "Your conversation partner says: \"Hey! How was your weekend?\"" },
  { difficulty: "INTERMEDIATE", passage: "Your conversation partner says: \"What's a show or movie you've watched recently that you'd recommend?\"" },
  { difficulty: "ADVANCED", passage: "Your conversation partner says: \"If you could switch careers for a year, what would you try and why?\"" },
  { difficulty: "EXPERT", passage: "Your conversation partner says: \"What's a belief you've changed your mind about in the last few years?\"" },
];

async function main() {
  const existing = await db.practiceQuestion.count({ where: { category: "SUPERVISOR" } });
  if (existing > 0) {
    console.log("Skipping: SUPERVISOR/CONVERSATION_PARTNER already seeded.");
    return;
  }

  const rows = [];

  for (const s of SUPERVISOR_SCENARIOS) {
    rows.push({
      category: "SUPERVISOR",
      difficulty: s.difficulty,
      type: "SHORT_ANSWER",
      prompt: "Respond to your supervisor.",
      passage: s.passage,
      options: null,
      correctAnswer: null,
      expectedAnswer: null,
      explanation: null,
      scoringCriteria: "Look for clear, honest, professional communication and appropriate ownership - not defensiveness.",
      timeLimitSeconds: 60,
    });
  }

  for (const s of CONVERSATION_PARTNER_SCENARIOS) {
    rows.push({
      category: "CONVERSATION_PARTNER",
      difficulty: s.difficulty,
      type: "SHORT_ANSWER",
      prompt: "Respond naturally.",
      passage: s.passage,
      options: null,
      correctAnswer: null,
      expectedAnswer: null,
      explanation: null,
      scoringCriteria: "Assess fluency, natural phrasing and engagement. No fixed answer.",
      timeLimitSeconds: 60,
    });
  }

  await db.practiceQuestion.createMany({ data: rows });
  console.log(`Seeded ${rows.length} SUPERVISOR/CONVERSATION_PARTNER scenarios.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
