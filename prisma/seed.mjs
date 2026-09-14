// Seeds the practice question bank with real, hand-written content.
// This is intentionally a small starting set that proves the architecture -
// Phase 4 expands this into a large question bank using the exact same
// shape, so nothing here needs to change structurally to scale up.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function mc({ difficulty, prompt, options, correctAnswer, explanation, timeLimitSeconds = 30 }) {
  return {
    category: "GRAMMAR_OR_VOCAB_PLACEHOLDER", // overwritten by caller
    difficulty,
    type: "MULTIPLE_CHOICE",
    prompt,
    options: JSON.stringify(options),
    correctAnswer,
    explanation,
    timeLimitSeconds,
  };
}

const GRAMMAR = [
  mc({
    difficulty: "BEGINNER",
    prompt: "Choose the correct sentence.",
    options: ["She don't like tea.", "She doesn't like tea.", "She not like tea.", "She no like tea."],
    correctAnswer: "She doesn't like tea.",
    explanation: "Third-person singular subjects (she/he/it) take \"doesn't\", not \"don't\".",
  }),
  mc({
    difficulty: "BEGINNER",
    prompt: "Fill the gap: \"I ___ to work every day.\"",
    options: ["go", "goes", "going", "gone"],
    correctAnswer: "go",
    explanation: "With \"I\", use the base form of the verb in the simple present: \"I go\".",
  }),
  mc({
    difficulty: "INTERMEDIATE",
    prompt: "Choose the correctly punctuated sentence.",
    options: [
      "Thank you for calling, how can I help you today?",
      "Thank you for calling. How can I help you today?",
      "Thank you for calling how can I help you today.",
      "Thank you for calling; how can I help you today",
    ],
    correctAnswer: "Thank you for calling. How can I help you today?",
    explanation: "Two independent sentences need a full stop, not a comma (comma splice).",
  }),
  mc({
    difficulty: "INTERMEDIATE",
    prompt: "Choose the correct preposition: \"I will look ___ your order right away.\"",
    options: ["at", "into", "for", "on"],
    correctAnswer: "into",
    explanation: "\"Look into\" means to investigate/check something, which fits checking an order.",
  }),
  mc({
    difficulty: "ADVANCED",
    prompt: "Choose the sentence with correct subject-verb agreement.",
    options: [
      "Neither of the options work for me.",
      "Neither of the options works for me.",
      "Neither of the options working for me.",
      "Neither of the options are working for me right.",
    ],
    correctAnswer: "Neither of the options works for me.",
    explanation: "\"Neither of\" takes a singular verb: \"neither... works\", not \"work\".",
  }),
  mc({
    difficulty: "ADVANCED",
    prompt: "Choose the correctly formed conditional: \"If the payment ___ by Friday, the order will be cancelled.\"",
    options: ["isn't received", "wasn't received", "won't be received", "hasn't received"],
    correctAnswer: "isn't received",
    explanation: "First conditional uses present simple in the if-clause: \"If X isn't received, Y will happen.\"",
  }),
  mc({
    difficulty: "EXPERT",
    prompt: "Which sentence uses the past perfect correctly?",
    options: [
      "By the time I called back, the customer already left.",
      "By the time I called back, the customer had already left.",
      "By the time I called back, the customer has already left.",
      "By the time I called back, the customer was already leaving.",
    ],
    correctAnswer: "By the time I called back, the customer had already left.",
    explanation: "Past perfect (\"had left\") is used for an action completed before another past action (\"called\").",
  }),
  mc({
    difficulty: "EXPERT",
    prompt: "Choose the sentence with the article used correctly.",
    options: [
      "I need to escalate a issue to the manager.",
      "I need to escalate an issue to the manager.",
      "I need to escalate issue to the manager.",
      "I need to escalate the a issue to the manager.",
    ],
    correctAnswer: "I need to escalate an issue to the manager.",
    explanation: "\"Issue\" starts with a vowel sound, so it takes \"an\", not \"a\".",
  }),
];

const VOCABULARY = [
  mc({
    difficulty: "BEGINNER",
    prompt: "What does \"refund\" mean?",
    options: [
      "Sending money back to a customer",
      "Sending a product to a customer",
      "Fixing a broken product",
      "Cancelling a phone call",
    ],
    correctAnswer: "Sending money back to a customer",
    explanation: "A refund is money returned to a customer, usually for a returned or unsatisfactory product.",
  }),
  mc({
    difficulty: "BEGINNER",
    prompt: "Which word best completes: \"Let me ___ your account details.\"",
    options: ["verify", "verifying", "verification", "verifies"],
    correctAnswer: "verify",
    explanation: "After \"let me\", use the base form of the verb: \"let me verify\".",
  }),
  mc({
    difficulty: "INTERMEDIATE",
    prompt: "In customer service, what does \"escalate\" mean?",
    options: [
      "To pass an issue to someone with more authority",
      "To close a ticket immediately",
      "To speak more loudly",
      "To offer a discount",
    ],
    correctAnswer: "To pass an issue to someone with more authority",
    explanation: "Escalating means moving an unresolved issue to a supervisor or specialist team.",
  }),
  mc({
    difficulty: "INTERMEDIATE",
    prompt: "Choose the most professional way to say \"That's not my problem.\"",
    options: [
      "That's not something I can help with.",
      "I don't deal with that.",
      "Not my department, sorry.",
      "That's not my job.",
    ],
    correctAnswer: "That's not something I can help with.",
    explanation: "Professional phrasing avoids blunt refusals and still offers to redirect the customer.",
  }),
  mc({
    difficulty: "ADVANCED",
    prompt: "What does it mean to \"de-escalate\" a call?",
    options: [
      "To calm down a tense or angry situation",
      "To end the call quickly",
      "To transfer the call to another agent",
      "To speak in a lower volume",
    ],
    correctAnswer: "To calm down a tense or angry situation",
    explanation: "De-escalation is a technique used to reduce tension with an upset customer.",
  }),
  mc({
    difficulty: "ADVANCED",
    prompt: "Which word means \"the amount of time before a service or promise expires\"?",
    options: ["deadline", "warranty", "invoice", "compliance"],
    correctAnswer: "warranty",
    explanation: "A warranty is a time-bound guarantee on a product or service.",
  }),
  mc({
    difficulty: "EXPERT",
    prompt: "Which term describes a customer who has stopped using a service, in business language?",
    options: ["churned", "escalated", "onboarded", "flagged"],
    correctAnswer: "churned",
    explanation: "\"Churn\" refers to customers who stop being customers - a common business/CS term.",
  }),
  mc({
    difficulty: "EXPERT",
    prompt: "Choose the best synonym for \"compensation\" in a service-recovery context.",
    options: ["something offered to make up for an inconvenience", "a formal complaint", "a legal contract", "a delivery delay"],
    correctAnswer: "something offered to make up for an inconvenience",
    explanation: "Compensation in service recovery means an offer (refund, credit, discount) to make up for a poor experience.",
  }),
];

const READING_PASSAGES = [
  {
    difficulty: "BEGINNER",
    passage:
      "Our store is open from 9 AM to 8 PM, Monday to Saturday. On Sundays, we open at 10 AM and close at 6 PM. Customers can return items within 30 days with a receipt.",
    questions: [
      {
        prompt: "What time does the store open on Sunday?",
        options: ["9 AM", "10 AM", "8 PM", "6 PM"],
        correctAnswer: "10 AM",
      },
      {
        prompt: "How many days do customers have to return an item?",
        options: ["7 days", "14 days", "30 days", "60 days"],
        correctAnswer: "30 days",
      },
    ],
  },
  {
    difficulty: "INTERMEDIATE",
    passage:
      "If your package has not arrived within the estimated delivery window, please check the tracking link sent to your email first. Most delays are resolved within 2 business days. If the tracking has not updated in over 5 days, contact support with your order number so we can open an investigation with the courier.",
    questions: [
      {
        prompt: "What should a customer check first if a package is delayed?",
        options: ["Call support immediately", "The tracking link", "Cancel the order", "Request a refund"],
        correctAnswer: "The tracking link",
      },
      {
        prompt: "After how many days without a tracking update should the customer contact support?",
        options: ["2 days", "5 days", "10 days", "30 days"],
        correctAnswer: "5 days",
      },
    ],
  },
  {
    difficulty: "ADVANCED",
    passage:
      "Escalation guidelines: An issue should be escalated to a Team Lead when (1) the customer explicitly requests a supervisor, (2) the requested resolution exceeds the agent's authorization limit, or (3) the same issue has recurred three or more times for the same customer. Agents should always attempt de-escalation and document the account before transferring.",
    questions: [
      {
        prompt: "Under these guidelines, when should an agent escalate?",
        options: [
          "Whenever a customer sounds upset",
          "Only if the customer asks for a refund",
          "When the resolution exceeds their authorization limit",
          "Every time a call lasts over 10 minutes",
        ],
        correctAnswer: "When the resolution exceeds their authorization limit",
      },
      {
        prompt: "What should an agent do before transferring a call?",
        options: ["Nothing, transfer immediately", "Document the account", "End the call", "Offer a refund"],
        correctAnswer: "Document the account",
      },
    ],
  },
  {
    difficulty: "EXPERT",
    passage:
      "Service-level agreements (SLAs) define the maximum acceptable response and resolution times for support requests, typically tiered by severity. A Severity 1 (critical) issue - such as a total service outage - usually requires acknowledgement within 15 minutes and a resolution or workaround within 4 hours. Lower-severity issues have progressively longer windows. Consistently missing SLA targets can trigger contractual penalties for the business, which is why triage accuracy at first contact matters as much as resolution speed.",
    questions: [
      {
        prompt: "What is a Severity 1 issue, according to the passage?",
        options: ["A minor billing question", "A total service outage", "A password reset request", "A delivery delay"],
        correctAnswer: "A total service outage",
      },
      {
        prompt: "Why does the passage say triage accuracy matters as much as resolution speed?",
        options: [
          "Because customers prefer fast replies",
          "Because missing SLA targets can trigger contractual penalties",
          "Because agents are rated only on speed",
          "Because triage is required by law",
        ],
        correctAnswer: "Because missing SLA targets can trigger contractual penalties",
      },
    ],
  },
];

const LISTENING_PASSAGES = [
  {
    difficulty: "BEGINNER",
    passage: "Hello, thank you for calling. My name is Alex. How can I help you today?",
    questions: [
      {
        prompt: "What is the speaker's name?",
        options: ["Alex", "Alan", "Alice", "Alexis"],
        correctAnswer: "Alex",
      },
    ],
  },
  {
    difficulty: "INTERMEDIATE",
    passage:
      "I'm sorry for the inconvenience. I can see your order was supposed to arrive yesterday. Let me check the tracking details and get back to you within two minutes.",
    questions: [
      {
        prompt: "When was the order supposed to arrive?",
        options: ["Today", "Yesterday", "Tomorrow", "Next week"],
        correctAnswer: "Yesterday",
      },
    ],
  },
  {
    difficulty: "ADVANCED",
    passage:
      "Before we proceed with the refund, I need to verify a few details for security purposes. Could you confirm the last four digits of the card used, and the billing zip code on file?",
    questions: [
      {
        prompt: "What two things does the speaker ask the customer to confirm?",
        options: [
          "Full card number and PIN",
          "Last four digits of the card and billing zip code",
          "Email address and password",
          "Order number and delivery address",
        ],
        correctAnswer: "Last four digits of the card and billing zip code",
      },
    ],
  },
  {
    difficulty: "EXPERT",
    passage:
      "I understand this is the third time you've had to call about the same billing error, and I apologize for that. I've escalated your case to our billing specialist team with priority handling, and you should receive a call back within 24 hours with a full resolution, not just an update.",
    questions: [
      {
        prompt: "What does the speaker promise will happen within 24 hours?",
        options: [
          "A status update only",
          "A full resolution, not just an update",
          "A refund automatically",
          "Another escalation",
        ],
        correctAnswer: "A full resolution, not just an update",
      },
    ],
  },
];

const INTERVIEW_QUESTIONS = [
  { difficulty: "BEGINNER", prompt: "Why do you want to work in customer service?" },
  { difficulty: "BEGINNER", prompt: "Tell me about yourself in two or three sentences." },
  { difficulty: "INTERMEDIATE", prompt: "Describe a time you dealt with a difficult customer. What did you do?" },
  { difficulty: "INTERMEDIATE", prompt: "How would you handle a customer who is shouting at you on a call?" },
  { difficulty: "ADVANCED", prompt: "How do you prioritize when you have multiple customers waiting at the same time?" },
  { difficulty: "ADVANCED", prompt: "Tell me about a time you had to say no to a customer's request. How did you handle it?" },
  { difficulty: "EXPERT", prompt: "How would you handle a customer who threatens to leave a negative review unless they get a refund they aren't entitled to?" },
  { difficulty: "EXPERT", prompt: "Describe how you would coach a new teammate who keeps escalating calls they should be able to resolve themselves." },
];

async function main() {
  const existing = await db.practiceQuestion.count();
  if (existing > 0) {
    console.log(`Skipping seed: ${existing} questions already exist.`);
    return;
  }

  const rows = [];

  for (const q of GRAMMAR) rows.push({ ...q, category: "GRAMMAR" });
  for (const q of VOCABULARY) rows.push({ ...q, category: "VOCABULARY" });

  for (const passage of READING_PASSAGES) {
    for (const q of passage.questions) {
      rows.push({
        category: "READING",
        difficulty: passage.difficulty,
        type: "READING_COMPREHENSION",
        prompt: q.prompt,
        passage: passage.passage,
        options: JSON.stringify(q.options),
        correctAnswer: q.correctAnswer,
        explanation: null,
        timeLimitSeconds: 90,
      });
    }
  }

  for (const passage of LISTENING_PASSAGES) {
    for (const q of passage.questions) {
      rows.push({
        category: "LISTENING",
        difficulty: passage.difficulty,
        type: "LISTENING_COMPREHENSION",
        prompt: q.prompt,
        passage: passage.passage,
        options: JSON.stringify(q.options),
        correctAnswer: q.correctAnswer,
        explanation: null,
        timeLimitSeconds: 60,
      });
    }
  }

  for (const q of INTERVIEW_QUESTIONS) {
    rows.push({
      category: "INTERVIEW",
      difficulty: q.difficulty,
      type: "SHORT_ANSWER",
      prompt: q.prompt,
      passage: null,
      options: null,
      correctAnswer: null,
      explanation: null,
      timeLimitSeconds: 120,
    });
  }

  await db.practiceQuestion.createMany({ data: rows });
  console.log(`Seeded ${rows.length} practice questions.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
