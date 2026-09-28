// The exam library: exam TYPES (ExamFamily) -> exams (ExamVariant, one
// template each) -> timed papers -> parts -> sections that draw fresh
// questions from the bank by category and difficulty. Loaded by
// prisma/seed-exam-library.mjs; admins add or change exams in /admin/exams
// and /admin/templates without touching this file.
//
// Every exam is genuinely different: its own skills, levels, question
// counts, papers and time limit. The library spans 10 to 135 minutes.
//
// section: [category, difficulty, questionCount]
// part.speaking: { prep, response } seconds for spoken answers.

const B = "BEGINNER";
const I = "INTERMEDIATE";
const A = "ADVANCED";
const E = "EXPERT";

const paper = (name, minutes, parts, { navigation = "FREE_WITHIN_SECTION", review = true, instructions = null } = {}) => ({
  name,
  minutes,
  navigation,
  review,
  instructions,
  parts,
});
const part = (name, sections, extra = {}) => ({ name, sections, ...extra });
const speaking = (prep, response) => ({ speaking: { prep, response } });

export const EXAM_LIBRARY = [
  {
    slug: "BUSINESS_ENGLISH",
    name: "Business English",
    description: "English for the workplace: emails, meetings, reports and professional vocabulary.",
    exams: [
      {
        slug: "WORKPLACE_ESSENTIALS_B1",
        name: "Workplace Essentials (B1)",
        scale: "CEFR",
        description: "Everyday workplace English for entry-level roles: grammar, vocabulary, a short reading and a workplace message.",
        papers: [
          paper("Language in Use", 15, [part("Grammar", [["GRAMMAR", I, 8]]), part("Vocabulary", [["VOCABULARY", I, 7]])]),
          paper("Reading and Writing", 15, [part("Reading", [["READING_COMPREHENSION", I, 3]]), part("Workplace message", [["WRITING", I, 1]])]),
        ],
      },
      {
        slug: "PROFESSIONAL_C1",
        name: "Professional (C1)",
        scale: "CEFR",
        description: "Demanding business English for managers and client-facing professionals, with two extended writing tasks.",
        papers: [
          paper("Language in Use", 25, [part("Grammar", [["GRAMMAR", A, 10]]), part("Vocabulary", [["VOCABULARY", A, 10]])]),
          paper("Reading", 25, [part("Business texts", [["READING_COMPREHENSION", A, 5]])]),
          paper("Writing", 40, [part("Reports and emails", [["WRITING", A, 2]])], { navigation: "FREE_WITHIN_SECTION" }),
        ],
      },
    ],
  },
  {
    slug: "CUSTOMER_SERVICE_ENGLISH",
    name: "Customer Service English",
    description: "Listening, voice and customer handling for support, contact-centre and BPO roles.",
    exams: [
      {
        slug: "CONTACT_CENTRE_SCREENING",
        name: "Contact Centre Screening",
        scale: "PASS_MERIT_DISTINCTION",
        description: "A short screening like a first-round BPO test: understand callers, then answer customers out loud.",
        papers: [
          paper("Listening", 8, [part("Customer calls", [["LISTENING", I, 4]])]),
          paper("Customer calls", 12, [part("Respond as the agent", [["CUSTOMER_SERVICE", I, 3]], speaking(15, 60))], { navigation: "LOCKED_SEQUENTIAL", review: false }),
        ],
      },
      {
        slug: "ADVANCED_SERVICE_SKILLS",
        name: "Advanced Service Skills",
        scale: "PASS_MERIT_DISTINCTION",
        description: "Harder calls, escalations and workplace judgement for experienced agents and team leads.",
        papers: [
          paper("Listening", 15, [part("Difficult calls", [["LISTENING", A, 6]])]),
          paper("Workplace judgement", 15, [part("Scenarios", [["SITUATIONAL_JUDGEMENT", A, 8]])]),
          paper(
            "Spoken calls",
            30,
            [part("Customers", [["CUSTOMER_SERVICE", A, 4]], speaking(20, 90)), part("Supervisor", [["SUPERVISOR", A, 2]], speaking(20, 90))],
            { navigation: "LOCKED_SEQUENTIAL", review: false }
          ),
        ],
      },
    ],
  },
  {
    slug: "SPEAKING_TEST",
    name: "Speaking Test",
    description: "Spoken English only: reading aloud, pronunciation, fluency and free speaking.",
    exams: [
      {
        slug: "QUICK_SPEAKING_CHECK",
        name: "Quick Speaking Check",
        scale: "CEFR",
        description: "Ten minutes to hear how you sound: one passage to read aloud, two pronunciation items and two short answers.",
        papers: [
          paper(
            "Speaking",
            10,
            [part("Read aloud", [["READING", B, 1]], speaking(20, 60)), part("Pronunciation", [["PRONUNCIATION", B, 2]], speaking(10, 30)), part("Short answers", [["SPEAKING", B, 2]], speaking(15, 60))],
            { navigation: "LOCKED_SEQUENTIAL", review: false }
          ),
        ],
      },
      {
        slug: "FULL_SPEAKING_ASSESSMENT",
        name: "Full Speaking Assessment",
        scale: "CEFR",
        description: "A complete spoken assessment in four parts, finishing with longer open answers at advanced level.",
        papers: [
          paper("Read aloud", 6, [part("Passages", [["READING", I, 2]], speaking(20, 75))], { navigation: "LOCKED_SEQUENTIAL", review: false }),
          paper("Pronunciation", 6, [part("Words and sentences", [["PRONUNCIATION", I, 3]], speaking(10, 40))], { navigation: "LOCKED_SEQUENTIAL", review: false }),
          paper("Fluency", 8, [part("Speak without stopping", [["FLUENCY", I, 2]], speaking(20, 90))], { navigation: "LOCKED_SEQUENTIAL", review: false }),
          paper("Open speaking", 10, [part("Longer answers", [["SPEAKING", A, 3]], speaking(30, 90))], { navigation: "LOCKED_SEQUENTIAL", review: false }),
        ],
      },
    ],
  },
  {
    slug: "LISTENING_TEST",
    name: "Listening Test",
    description: "Understanding spoken English: conversations, announcements, calls and talks.",
    exams: [
      {
        slug: "LISTENING_FOUNDATIONS",
        name: "Listening Foundations",
        scale: "CEFR",
        description: "Everyday conversations and announcements, from beginner to intermediate.",
        papers: [paper("Listening", 20, [part("Everyday situations", [["LISTENING", B, 5]]), part("Conversations", [["LISTENING", I, 5]])])],
      },
      {
        slug: "ADVANCED_LISTENING",
        name: "Advanced Listening",
        scale: "CEFR",
        description: "Longer and faster recordings at intermediate, advanced and expert level.",
        papers: [
          paper("Listening", 45, [part("Part 1", [["LISTENING", I, 6]]), part("Part 2", [["LISTENING", A, 6]]), part("Part 3", [["LISTENING", E, 6]])], {
            navigation: "LOCKED_SEQUENTIAL",
            review: false,
          }),
        ],
      },
    ],
  },
  {
    slug: "READING_TEST",
    name: "Reading Test",
    description: "Reading comprehension and reasoning about written texts.",
    exams: [
      {
        slug: "READING_SKILLS",
        name: "Reading Skills",
        scale: "CEFR",
        description: "Short texts with comprehension questions, plus true/false/cannot-say reasoning.",
        papers: [paper("Reading", 30, [part("Comprehension", [["READING_COMPREHENSION", I, 6]]), part("Reasoning about texts", [["VERBAL_REASONING", I, 4]])])],
      },
      {
        slug: "ADVANCED_READING",
        name: "Advanced Reading",
        scale: "CEFR",
        description: "Dense academic and professional passages at advanced and expert level.",
        papers: [paper("Reading", 60, [part("Advanced texts", [["READING_COMPREHENSION", A, 8]]), part("Expert texts", [["READING_COMPREHENSION", E, 6]])])],
      },
    ],
  },
  {
    slug: "WRITING_TEST",
    name: "Writing Test",
    description: "Written English: messages, reports and extended responses.",
    exams: [
      {
        slug: "WRITING_ESSENTIALS",
        name: "Writing Essentials",
        scale: "CEFR",
        description: "Two practical writing tasks at intermediate level.",
        papers: [paper("Writing", 45, [part("Tasks", [["WRITING", I, 2]])])],
      },
      {
        slug: "EXTENDED_WRITING",
        name: "Extended Writing",
        scale: "CEFR",
        description: "Two advanced tasks and one expert-level extended response.",
        papers: [paper("Advanced tasks", 40, [part("Tasks", [["WRITING", A, 2]])]), paper("Extended response", 50, [part("Essay", [["WRITING", E, 1]])])],
      },
    ],
  },
  {
    slug: "GRAMMAR_TEST",
    name: "Grammar Test",
    description: "Grammar accuracy: tenses, agreement, articles, prepositions, clauses and more.",
    exams: [
      {
        slug: "GRAMMAR_CHECK_BEGINNER",
        name: "Grammar Check - Beginner",
        scale: "CEFR",
        description: "Fifteen beginner questions in fifteen minutes.",
        papers: [paper("Grammar", 15, [part("Questions", [["GRAMMAR", B, 15]])])],
      },
      {
        slug: "GRAMMAR_TEST_INTERMEDIATE",
        name: "Grammar Test - Intermediate",
        scale: "CEFR",
        description: "Twenty intermediate questions covering the grammar most workplaces expect.",
        papers: [paper("Grammar", 20, [part("Questions", [["GRAMMAR", I, 20]])])],
      },
      {
        slug: "GRAMMAR_MASTERY_ADVANCED",
        name: "Grammar Mastery - Advanced",
        scale: "CEFR",
        description: "Advanced and expert grammar, including error spotting and sentence correction.",
        papers: [paper("Grammar", 30, [part("Advanced", [["GRAMMAR", A, 15]]), part("Expert", [["GRAMMAR", E, 10]])])],
      },
    ],
  },
  {
    slug: "VOCABULARY_TEST",
    name: "Vocabulary Test",
    description: "Word knowledge: meaning in context, synonyms, collocations and professional terms.",
    exams: [
      {
        slug: "EVERYDAY_VOCABULARY",
        name: "Everyday Vocabulary",
        scale: "CEFR",
        description: "Fifteen beginner questions on common words and their meanings.",
        papers: [paper("Vocabulary", 15, [part("Questions", [["VOCABULARY", B, 15]])])],
      },
      {
        slug: "PROFESSIONAL_VOCABULARY",
        name: "Professional Vocabulary",
        scale: "CEFR",
        description: "Advanced and expert vocabulary for professional and academic English.",
        papers: [paper("Vocabulary", 30, [part("Advanced", [["VOCABULARY", A, 15]]), part("Expert", [["VOCABULARY", E, 10]])])],
      },
    ],
  },
  {
    slug: "INTERVIEW_ENGLISH",
    name: "Interview English",
    description: "Answering interview questions clearly and professionally, in writing and out loud.",
    exams: [
      {
        slug: "INTERVIEW_READINESS",
        name: "Interview Readiness",
        scale: "PASS_MERIT_DISTINCTION",
        description: "Workplace judgement questions, then typed answers to common interview questions.",
        papers: [paper("Workplace judgement", 10, [part("Scenarios", [["SITUATIONAL_JUDGEMENT", I, 5]])]), paper("Interview answers", 20, [part("Questions", [["INTERVIEW", I, 4]])])],
      },
      {
        slug: "SPOKEN_INTERVIEW",
        name: "Spoken Interview Practice",
        scale: "PASS_MERIT_DISTINCTION",
        description: "Harder interview questions: typed answers, then spoken answers and a fluency round.",
        papers: [
          paper("Written answers", 15, [part("Questions", [["INTERVIEW", A, 3]])]),
          paper("Spoken answers", 20, [part("Questions", [["SPEAKING", A, 4]], speaking(30, 90))], { navigation: "LOCKED_SEQUENTIAL", review: false }),
          paper("Fluency", 10, [part("Speak without stopping", [["FLUENCY", A, 2]], speaking(20, 90))], { navigation: "LOCKED_SEQUENTIAL", review: false }),
        ],
      },
    ],
  },
  {
    slug: "ACADEMIC_ENGLISH",
    name: "Academic English",
    description: "University-level English across listening, reading, writing and speaking.",
    exams: [
      {
        slug: "ACADEMIC_FOUNDATION",
        name: "Academic Foundation",
        scale: "CEFR",
        description: "An hour-long academic test at intermediate level, good preparation before the full test.",
        papers: [
          paper("Listening", 15, [part("Lectures and talks", [["LISTENING", I, 6]])], { navigation: "LOCKED_SEQUENTIAL", review: false }),
          paper("Reading", 20, [part("Academic texts", [["READING_COMPREHENSION", I, 6]])]),
          paper("Writing", 25, [part("Short essay", [["WRITING", I, 1]])]),
        ],
      },
      {
        slug: "ACADEMIC_ENGLISH_TEST",
        name: "Academic English Test",
        scale: "CEFR",
        description: "The full two-hour academic test at advanced level: four skills, four timed papers.",
        papers: [
          paper("Listening", 30, [part("Lectures and discussions", [["LISTENING", A, 8]])], { navigation: "LOCKED_SEQUENTIAL", review: false }),
          paper("Reading", 40, [part("Academic texts", [["READING_COMPREHENSION", A, 8]])]),
          paper("Writing", 40, [part("Essays", [["WRITING", A, 2]])]),
          paper("Speaking", 10, [part("Academic topics", [["SPEAKING", A, 3]], speaking(30, 90))], { navigation: "LOCKED_SEQUENTIAL", review: false }),
        ],
      },
    ],
  },
  {
    slug: "PLACEMENT_TEST",
    name: "Placement Test",
    description: "Find your level: questions rise from beginner to expert.",
    exams: [
      {
        slug: "QUICK_PLACEMENT_CHECK",
        name: "Quick Placement Check",
        scale: "CEFR",
        description: "Twenty grammar and vocabulary questions across all four levels.",
        papers: [
          paper("Placement", 20, [
            part("Grammar", [["GRAMMAR", B, 3], ["GRAMMAR", I, 3], ["GRAMMAR", A, 3], ["GRAMMAR", E, 3]]),
            part("Vocabulary", [["VOCABULARY", B, 2], ["VOCABULARY", I, 2], ["VOCABULARY", A, 2], ["VOCABULARY", E, 2]]),
          ]),
        ],
      },
      {
        slug: "ENGLISH_PLACEMENT_TEST",
        name: "English Placement Test",
        scale: "CEFR",
        description: "A full hour: language, reading and listening at every level, to place you accurately.",
        papers: [
          paper("Language", 30, [
            part("Grammar", [["GRAMMAR", B, 5], ["GRAMMAR", I, 5], ["GRAMMAR", A, 5], ["GRAMMAR", E, 5]]),
            part("Vocabulary", [["VOCABULARY", B, 3], ["VOCABULARY", I, 3], ["VOCABULARY", A, 3]]),
          ]),
          paper("Reading and Listening", 30, [
            part("Reading", [["READING_COMPREHENSION", B, 2], ["READING_COMPREHENSION", I, 2], ["READING_COMPREHENSION", A, 2]]),
            part("Listening", [["LISTENING", B, 2], ["LISTENING", I, 2], ["LISTENING", A, 2]]),
          ]),
        ],
      },
    ],
  },
  {
    slug: "APTITUDE",
    name: "Aptitude",
    description: "Numerical, logical and verbal reasoning, as used in recruitment and placement tests.",
    exams: [
      {
        slug: "APTITUDE_SCREENING",
        name: "Aptitude Screening",
        scale: "PERCENTILE",
        description: "A 30-minute screening test: numbers, logic and verbal reasoning at intermediate level.",
        papers: [
          paper("Numerical reasoning", 12, [part("Questions", [["NUMERICAL_APTITUDE", I, 10]])], { navigation: "FREE_WITHIN_SECTION" }),
          paper("Logical reasoning", 10, [part("Questions", [["LOGICAL_REASONING", I, 10]])]),
          paper("Verbal reasoning", 8, [part("Questions", [["VERBAL_REASONING", I, 8]])]),
        ],
      },
      {
        slug: "COMPREHENSIVE_APTITUDE_BATTERY",
        name: "Comprehensive Aptitude Battery",
        scale: "PERCENTILE",
        description: "A full graduate-level battery over two hours: advanced numerical, logical, verbal and judgement papers.",
        papers: [
          paper("Numerical reasoning", 45, [part("Questions", [["NUMERICAL_APTITUDE", A, 20]])]),
          paper("Logical reasoning", 40, [part("Questions", [["LOGICAL_REASONING", A, 20]])]),
          paper("Verbal reasoning", 30, [part("Questions", [["VERBAL_REASONING", A, 15]])]),
          paper("Situational judgement", 20, [part("Scenarios", [["SITUATIONAL_JUDGEMENT", A, 10]])]),
        ],
      },
    ],
  },
];

// The General English goal track's assessment, made clearly different from
// the BPO / Workplace Communication one: language skills rather than
// customer handling (it used to share 8 of its 9 sections).
export const GENERAL_ENGLISH_ASSESSMENT = {
  name: "General English Communication Assessment",
  sections: [
    ["GRAMMAR", I, 4],
    ["VOCABULARY", I, 4],
    ["READING_COMPREHENSION", I, 3],
    ["LISTENING", I, 3],
    ["WRITING", I, 1],
    ["READING", I, 1],
    ["SPEAKING", I, 2],
  ],
};
