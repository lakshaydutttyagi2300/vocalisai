// Phase 4 expansion of the question bank.
//
// 1. Fixes a Phase 3 mislabel: the master spec defines "Reading" as
//    reading passages ALOUD (a voice/pronunciation skill), but Phase 3
//    built it as a silent-read comprehension quiz. Those existing rows are
//    renamed to READING_COMPREHENSION (a legitimately useful, separate,
//    zero-voice exercise) rather than deleted.
// 2. Adds the missing SITUATIONAL_JUDGEMENT category.
// 3. Adds real seed content for the voice-required categories (Reading
//    read-aloud, Pronunciation, Speaking, Customer-Service Roleplay) so the
//    question bank is ready the moment Phase 5 unlocks recording. The
//    Customer-Service scenarios deliberately cover the same 9 scenario
//    types the master spec lists for Phase 11.
// 4. Backfills scoringCriteria on existing multiple-choice rows that didn't
//    have one yet, so the field is genuinely populated bank-wide, not just
//    present-but-empty in the schema.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function mc({ difficulty, prompt, options, correctAnswer, explanation, timeLimitSeconds = 30 }) {
  return {
    difficulty,
    type: "MULTIPLE_CHOICE",
    prompt,
    passage: null,
    options: JSON.stringify(options),
    correctAnswer,
    expectedAnswer: null,
    explanation,
    scoringCriteria: "Single correct option; full credit only for the exact correct choice.",
    timeLimitSeconds,
  };
}

const SITUATIONAL_JUDGEMENT = [
  mc({
    difficulty: "BEGINNER",
    prompt: "A customer thanks you at the end of the call. What should you do?",
    options: [
      "Say you're welcome and ask if there's anything else you can help with",
      "Hang up immediately",
      "Ask them to leave a good review",
      "Transfer the call",
    ],
    correctAnswer: "Say you're welcome and ask if there's anything else you can help with",
    explanation: "Always check for further needs before ending a call professionally.",
  }),
  mc({
    difficulty: "BEGINNER",
    prompt: "You don't know the answer to a customer's question. What's the best first step?",
    options: [
      "Guess an answer",
      "Tell the customer you'll check and get back to them",
      "Say you don't know and end the call",
      "Transfer without explanation",
    ],
    correctAnswer: "Tell the customer you'll check and get back to them",
    explanation: "Honesty plus a clear next step builds more trust than guessing.",
  }),
  mc({
    difficulty: "INTERMEDIATE",
    prompt: "A polite customer's issue is outside your authority to resolve. What should you do?",
    options: [
      "Tell them nothing can be done",
      "Explain you'll escalate to someone who can help, and set expectations",
      "Ignore the request",
      "Offer a refund without approval",
    ],
    correctAnswer: "Explain you'll escalate to someone who can help, and set expectations",
    explanation: "Escalating with clear expectations is more professional than a flat refusal or overstepping authority.",
  }),
  mc({
    difficulty: "INTERMEDIATE",
    prompt: "You realize you gave a customer incorrect information earlier in the call. What should you do?",
    options: [
      "Say nothing and hope they don't notice",
      "Correct yourself honestly and apologize",
      "Blame the system",
      "End the call quickly",
    ],
    correctAnswer: "Correct yourself honestly and apologize",
    explanation: "Owning a mistake immediately prevents bigger problems later and preserves trust.",
  }),
  mc({
    difficulty: "ADVANCED",
    prompt:
      "A customer's account shows suspicious activity while they're requesting a sensitive change. What should you do?",
    options: [
      "Proceed with the change immediately",
      "Follow the verification procedure before proceeding",
      "Deny the request without explanation",
      "Ask a coworker to handle it instead",
    ],
    correctAnswer: "Follow the verification procedure before proceeding",
    explanation: "Security procedures exist specifically for situations like this - skipping them is a real risk.",
  }),
  mc({
    difficulty: "ADVANCED",
    prompt: "You're handling three chats at once and one customer becomes impatient. What's the best approach?",
    options: [
      "Ignore the impatient customer",
      "Acknowledge the wait and give a time estimate",
      "Close their chat",
      "Rush all responses without care",
    ],
    correctAnswer: "Acknowledge the wait and give a time estimate",
    explanation: "A brief acknowledgement with a concrete estimate reduces frustration far more than silence.",
  }),
  mc({
    difficulty: "EXPERT",
    prompt:
      "A long-standing customer requests an exception to policy you're not authorized to grant, and becomes upset when told no. What's the best approach?",
    options: [
      "Grant the exception anyway to keep them happy",
      "Firmly refuse and end the call",
      "Explain the policy, acknowledge their loyalty, and offer to escalate for a possible exception",
      "Transfer immediately without explanation",
    ],
    correctAnswer: "Explain the policy, acknowledge their loyalty, and offer to escalate for a possible exception",
    explanation: "This respects both the policy and the relationship, without overstepping your own authority.",
  }),
  mc({
    difficulty: "EXPERT",
    prompt: "You notice a colleague repeatedly giving customers incorrect billing information. What should you do?",
    options: [
      "Say nothing, it's not your job",
      "Publicly correct them in front of a customer",
      "Raise it privately with them or your supervisor",
      "Complain to other coworkers",
    ],
    correctAnswer: "Raise it privately with them or your supervisor",
    explanation: "Privately raising a recurring accuracy issue protects customers without undermining a colleague publicly.",
  }),
];

const READING_ALOUD = [
  {
    difficulty: "BEGINNER",
    passage: "Thank you for calling. My name is Priya. How can I help you today?",
    timeLimitSeconds: 30,
  },
  {
    difficulty: "INTERMEDIATE",
    passage:
      "I understand your frustration with the delay, and I want to help you resolve this as quickly as possible.",
    timeLimitSeconds: 35,
  },
  {
    difficulty: "ADVANCED",
    passage:
      "Before we proceed, I need to verify a few account details for security purposes. Could you confirm your registered email address?",
    timeLimitSeconds: 40,
  },
  {
    difficulty: "EXPERT",
    passage:
      "I sincerely apologize for the repeated inconvenience. I have escalated your case with priority handling, and you will receive a comprehensive resolution within twenty-four hours.",
    timeLimitSeconds: 45,
  },
];

const PRONUNCIATION = [
  { difficulty: "BEGINNER", text: "Thank you", note: "the 'th' sound, not 'tank you'" },
  { difficulty: "BEGINNER", text: "Schedule", note: "the 'sch' sound and first-syllable stress" },
  { difficulty: "INTERMEDIATE", text: "Warranty", note: "a clear 'w' sound, not 'v', and correct stress" },
  { difficulty: "INTERMEDIATE", text: "Particularly", note: "all syllables pronounced clearly, not shortened" },
  {
    difficulty: "ADVANCED",
    text: "I specifically asked for a refund, not a replacement.",
    note: "'specifically' and overall sentence rhythm",
  },
  {
    difficulty: "ADVANCED",
    text: "Could you please verify your billing address?",
    note: "the 'v' sound in 'verify' and natural rhythm",
  },
  {
    difficulty: "EXPERT",
    text: "I sincerely apologize for the inconvenience this has caused you.",
    note: "stress on 'apologize', clarity of 'inconvenience'",
  },
  {
    difficulty: "EXPERT",
    text: "Your request has been escalated to a specialist team for further review.",
    note: "'escalated' and 'specialist' pronounced clearly",
  },
];

const SPEAKING = [
  { difficulty: "BEGINNER", prompt: "Describe your daily routine in a few sentences." },
  { difficulty: "BEGINNER", prompt: "What do you like to do in your free time?" },
  { difficulty: "INTERMEDIATE", prompt: "Describe a time you helped someone solve a problem." },
  { difficulty: "INTERMEDIATE", prompt: "How would you explain your job to someone who has never heard of it?" },
  { difficulty: "ADVANCED", prompt: "Describe a challenging situation at work or school and how you handled it." },
  { difficulty: "ADVANCED", prompt: "What does good customer service mean to you? Explain with an example." },
  { difficulty: "EXPERT", prompt: "Persuade a customer to try a new product they are hesitant about, in under a minute." },
  {
    difficulty: "EXPERT",
    prompt:
      "Explain a complex process (e.g. how the internet works) in simple terms, as if to a customer with no technical background.",
  },
];

// Matches the 9 scenario types the master spec lists for Phase 11.
const CUSTOMER_SERVICE = [
  {
    difficulty: "BEGINNER",
    passage: "Hi, I'd like a refund for the shoes I bought last week, they don't fit.",
    scenarioType: "refund request",
  },
  {
    difficulty: "BEGINNER",
    passage: "My package was supposed to arrive two days ago and it's still not here.",
    scenarioType: "delayed delivery",
  },
  {
    difficulty: "BEGINNER",
    passage: "Does this jacket come in a size large, and what colors are available?",
    scenarioType: "product enquiry",
  },
  {
    difficulty: "BEGINNER",
    passage: "I don't understand this bill at all, there are so many charges I don't recognize.",
    scenarioType: "confused customer",
  },
  {
    difficulty: "INTERMEDIATE",
    passage: "This is the third time I'm calling about the same issue! I'm extremely frustrated and I want this fixed NOW!",
    scenarioType: "angry customer",
  },
  {
    difficulty: "INTERMEDIATE",
    passage: "I was charged twice for my last order. Can you check this?",
    scenarioType: "billing issue",
  },
  {
    difficulty: "INTERMEDIATE",
    passage: "The product I received is completely different from what was shown on the website. I'm very disappointed.",
    scenarioType: "complaint",
  },
  {
    difficulty: "ADVANCED",
    passage: "The app keeps crashing every time I try to upload a photo, and I've already tried reinstalling it.",
    scenarioType: "technical problem",
  },
  {
    difficulty: "EXPERT",
    passage: "I've spoken to three different agents about this and no one has resolved it. I want to speak to a manager right now.",
    scenarioType: "escalation",
  },
];

async function renameReadingToComprehension() {
  const result = await db.practiceQuestion.updateMany({
    where: { category: "READING" },
    data: { category: "READING_COMPREHENSION" },
  });
  console.log(`Renamed ${result.count} existing READING rows to READING_COMPREHENSION.`);
}

async function backfillScoringCriteria() {
  const result = await db.practiceQuestion.updateMany({
    where: { type: "MULTIPLE_CHOICE", scoringCriteria: null },
    data: { scoringCriteria: "Single correct option; full credit only for the exact correct choice." },
  });
  const result2 = await db.practiceQuestion.updateMany({
    where: { type: "READING_COMPREHENSION", scoringCriteria: null },
    data: { scoringCriteria: "Single correct option; full credit only for the exact correct choice." },
  });
  const result3 = await db.practiceQuestion.updateMany({
    where: { type: "LISTENING_COMPREHENSION", scoringCriteria: null },
    data: { scoringCriteria: "Single correct option; full credit only for the exact correct choice." },
  });
  console.log(`Backfilled scoringCriteria on ${result.count + result2.count + result3.count} rows.`);
}

async function seedNewCategories() {
  const alreadySeeded = await db.practiceQuestion.count({ where: { category: "SITUATIONAL_JUDGEMENT" } });
  if (alreadySeeded > 0) {
    console.log("Phase 4 categories already seeded, skipping inserts.");
    return;
  }

  const rows = [];

  for (const q of SITUATIONAL_JUDGEMENT) rows.push({ ...q, category: "SITUATIONAL_JUDGEMENT" });

  for (const r of READING_ALOUD) {
    rows.push({
      category: "READING",
      difficulty: r.difficulty,
      type: "SHORT_ANSWER",
      prompt: "Read the following passage aloud, clearly and at a natural pace.",
      passage: r.passage,
      options: null,
      correctAnswer: null,
      expectedAnswer: r.passage,
      explanation: null,
      scoringCriteria: "Assess clarity, pace and pronunciation accuracy once voice recording and AI analysis (Phase 5/8) are live.",
      timeLimitSeconds: r.timeLimitSeconds,
    });
  }

  for (const p of PRONUNCIATION) {
    rows.push({
      category: "PRONUNCIATION",
      difficulty: p.difficulty,
      type: "SHORT_ANSWER",
      prompt: `Say the following clearly: "${p.text}"`,
      passage: p.text,
      options: null,
      correctAnswer: null,
      expectedAnswer: p.text,
      explanation: null,
      scoringCriteria: `Check pronunciation of: ${p.note}.`,
      timeLimitSeconds: 20,
    });
  }

  for (const s of SPEAKING) {
    rows.push({
      category: "SPEAKING",
      difficulty: s.difficulty,
      type: "SHORT_ANSWER",
      prompt: s.prompt,
      passage: null,
      options: null,
      correctAnswer: null,
      expectedAnswer: null,
      explanation: null,
      scoringCriteria: "Assess fluency, coherence, vocabulary range and confidence once voice analysis (Phase 8) is live. No fixed answer.",
      timeLimitSeconds: 60,
    });
  }

  for (const c of CUSTOMER_SERVICE) {
    rows.push({
      category: "CUSTOMER_SERVICE",
      difficulty: c.difficulty,
      type: "SHORT_ANSWER",
      prompt: "Respond to this customer as the agent.",
      passage: c.passage,
      options: null,
      correctAnswer: null,
      expectedAnswer: null,
      explanation: null,
      scoringCriteria: `Scenario type: ${c.scenarioType}. Look for empathy, ownership, and a concrete resolution step - not just an apology.`,
      timeLimitSeconds: 90,
    });
  }

  await db.practiceQuestion.createMany({ data: rows });
  console.log(`Seeded ${rows.length} Phase 4 questions.`);
}

async function main() {
  await renameReadingToComprehension();
  await backfillScoringCriteria();
  await seedNewCategories();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
