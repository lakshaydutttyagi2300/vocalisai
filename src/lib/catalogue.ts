// The browse structure: Category -> Exam -> Subject -> Level
// (docs/CATALOGUE.md). No imports on purpose: usable from server and browser
// code.
//
// A subject is an existing practice mode (its `slug` in practice-taxonomy.ts),
// so every subject opens a real question bank that is already split into the
// four levels. A question's category and exam come from this mapping: a
// grammar question serves every exam that lists grammar. `upcoming` names
// subjects we don't have questions for yet; they are shown as "Coming soon",
// never as something the candidate can start. `mockFamilies` are exam-library
// family slugs (prisma/exam-library/content.mjs, IELTS_STYLE from exam-demo)
// whose timed mock exams belong to this exam.
//
// To add an exam: add an entry below. To add a subject: add its questions and
// practice mode first (practice-taxonomy.ts), then list its slug here.

export interface CatalogueExam {
  id: string;
  name: string;
  summary: string;
  subjects: string[];
  upcoming?: string[];
  mockFamilies?: string[];
  /** Extra words the search should match (other names people use). */
  keywords?: string[];
}

export interface CatalogueCategory {
  id: string;
  name: string;
  summary: string;
  exams: CatalogueExam[];
}

export const CATALOGUE: CatalogueCategory[] = [
  {
    id: "government-competitive",
    name: "Government & Competitive Exams",
    summary: "The English, quantitative and reasoning sections of government job exams.",
    exams: [
      {
        id: "ssc-style",
        name: "SSC-style exams (CGL, CHSL)",
        summary: "English comprehension, quantitative aptitude and general intelligence.",
        subjects: ["grammar", "vocabulary", "reading-comprehension", "numerical-aptitude", "logical-reasoning"],
        upcoming: ["General Awareness"],
        keywords: ["ssc", "cgl", "chsl", "staff selection"],
      },
      {
        id: "banking-style",
        name: "Banking-style exams (PO, Clerk)",
        summary: "English language, quantitative aptitude and reasoning, as in bank recruitment tests.",
        subjects: ["grammar", "vocabulary", "reading-comprehension", "numerical-aptitude", "logical-reasoning", "verbal-reasoning"],
        upcoming: ["Banking Awareness", "Computer Knowledge"],
        keywords: ["bank", "ibps", "sbi", "po", "clerk", "rbi"],
      },
      {
        id: "railway-style",
        name: "Railway-style exams (NTPC, Group D)",
        summary: "Mathematics and general intelligence and reasoning.",
        subjects: ["numerical-aptitude", "logical-reasoning"],
        upcoming: ["General Science", "General Awareness"],
        keywords: ["railway", "rrb", "ntpc", "group d"],
      },
      {
        id: "defence-style",
        name: "Defence-style exams (English & reasoning)",
        summary: "The English and reasoning papers of defence officer entry tests.",
        subjects: ["grammar", "vocabulary", "reading-comprehension", "verbal-reasoning", "numerical-aptitude"],
        upcoming: ["General Knowledge"],
        keywords: ["defence", "defense", "cds", "afcat", "nda"],
      },
    ],
  },
  {
    id: "university-entrance",
    name: "University & Entrance Exams",
    summary: "English tests for study abroad, university admission and MBA entrance.",
    exams: [
      {
        id: "ielts-style",
        name: "IELTS-style",
        summary: "Listening, reading, writing and speaking in the IELTS format.",
        subjects: ["listening", "reading-comprehension", "writing", "speaking"],
        mockFamilies: ["IELTS_STYLE"],
        keywords: ["ielts", "study abroad", "band"],
      },
      {
        id: "pte-style",
        name: "PTE-style",
        summary: "Computer-based speaking, writing, reading and listening tasks.",
        subjects: ["speaking", "reading", "listening", "writing"],
        mockFamilies: ["PTE_STYLE"],
        keywords: ["pte", "pearson"],
      },
      {
        id: "toefl-style",
        name: "TOEFL-style",
        summary: "Academic reading, listening, speaking and writing.",
        subjects: ["reading-comprehension", "listening", "speaking", "writing"],
        keywords: ["toefl"],
      },
      {
        id: "cambridge-style",
        name: "Cambridge-style (B1, B2)",
        summary: "Reading and use of English, writing, listening and speaking at B1 and B2.",
        subjects: ["grammar", "vocabulary", "reading-comprehension", "writing", "listening", "speaking"],
        mockFamilies: ["CAMBRIDGE_STYLE"],
        keywords: ["cambridge", "b1 preliminary", "b2 first", "pet", "fce"],
      },
      {
        id: "academic-english",
        name: "Academic English",
        summary: "University reading, essays, lectures and presentations.",
        subjects: ["reading-comprehension", "writing", "listening", "speaking"],
        mockFamilies: ["ACADEMIC_ENGLISH"],
        keywords: ["university", "admission", "essay", "academic"],
      },
    ],
  },
  {
    id: "campus-career",
    name: "Campus & Career",
    summary: "Placement tests, job interviews and pre-employment screening.",
    exams: [
      {
        id: "campus-placement",
        name: "Campus placement tests",
        summary: "The aptitude and English rounds of on-campus recruitment.",
        subjects: ["numerical-aptitude", "logical-reasoning", "verbal-reasoning", "grammar", "reading-comprehension"],
        mockFamilies: ["APTITUDE"],
        keywords: ["placement", "campus", "fresher", "tcs", "infosys", "wipro", "accenture"],
      },
      {
        id: "job-interviews",
        name: "Job interviews",
        summary: "HR and behavioural interviews, answered out loud, with a live AI interviewer.",
        subjects: ["interview", "speaking"],
        mockFamilies: ["INTERVIEW_ENGLISH"],
        keywords: ["interview", "hr", "star", "behavioural", "mnc"],
      },
      {
        id: "pre-employment",
        name: "Pre-employment screening",
        summary: "Situational judgement, verbal reasoning and English checks used by employers.",
        subjects: ["situational-judgement", "verbal-reasoning", "grammar"],
        mockFamilies: ["EMPLOYMENT"],
        keywords: ["screening", "recruitment", "sjt"],
      },
    ],
  },
  {
    id: "english-communication",
    name: "English & Communication",
    summary: "Grammar, vocabulary, speaking, listening, reading and writing.",
    exams: [
      {
        id: "grammar-vocabulary",
        name: "Grammar & vocabulary",
        summary: "Accurate, natural English from basic tenses to advanced structures.",
        subjects: ["grammar", "vocabulary"],
        mockFamilies: ["GRAMMAR_TEST", "VOCABULARY_TEST"],
      },
      {
        id: "speaking-pronunciation",
        name: "Speaking & pronunciation",
        summary: "Clear, fluent speech, with AI analysis of every recording.",
        subjects: ["speaking", "pronunciation", "fluency", "reading"],
        mockFamilies: ["SPEAKING_TEST"],
        keywords: ["accent", "fluency", "read aloud"],
      },
      {
        id: "listening-reading",
        name: "Listening & reading",
        summary: "Understanding speech and text, from everyday to academic.",
        subjects: ["listening", "reading-comprehension"],
        mockFamilies: ["LISTENING_TEST", "READING_TEST"],
      },
      {
        id: "writing",
        name: "Writing",
        summary: "Messages, emails, reports and essays.",
        subjects: ["writing"],
        mockFamilies: ["WRITING_TEST"],
        keywords: ["email", "essay"],
      },
      {
        id: "everyday-conversation",
        name: "Everyday conversation",
        summary: "Casual spoken English with a friendly AI partner.",
        subjects: ["conversation-partner", "speaking"],
        keywords: ["confidence", "spoken english", "chat"],
      },
      {
        id: "placement-level",
        name: "Placement & level tests (CEFR)",
        summary: "Find your level, from A1 to C2.",
        subjects: ["grammar", "vocabulary", "reading-comprehension", "listening"],
        mockFamilies: ["PLACEMENT_TEST"],
        keywords: ["cefr", "level test", "a1", "b2", "c1"],
      },
    ],
  },
  {
    id: "professional-skills",
    name: "Professional Skills",
    summary: "Voice and accent, customer handling and workplace communication.",
    exams: [
      {
        id: "bpo-call-centre",
        name: "BPO & call-centre assessments",
        summary: "Voice and accent rounds, listening, customer calls and judgement.",
        subjects: ["reading", "listening", "speaking", "customer-service", "situational-judgement"],
        mockFamilies: ["CUSTOMER_SERVICE_ENGLISH"],
        keywords: ["bpo", "call centre", "call center", "voice and accent", "versant", "customer support"],
      },
      {
        id: "workplace-communication",
        name: "Workplace communication",
        summary: "Explaining situations to a supervisor, emails and clear spoken updates.",
        subjects: ["supervisor", "writing", "speaking"],
        keywords: ["office", "manager", "meetings"],
      },
      {
        id: "customer-service",
        name: "Customer service",
        summary: "Refunds, complaints and escalations, handled out loud.",
        subjects: ["customer-service", "situational-judgement"],
        keywords: ["support", "complaints", "sales"],
      },
    ],
  },
  {
    id: "technology-it",
    name: "Technology & IT",
    summary: "Communication and reasoning for tech roles. Technical subjects are on the way.",
    exams: [
      {
        id: "tech-interviews",
        name: "Tech job interviews (communication round)",
        summary: "Explaining your work and answering HR questions clearly, plus logical reasoning.",
        subjects: ["interview", "speaking", "logical-reasoning"],
        keywords: ["software", "developer", "it jobs", "engineer"],
      },
      {
        id: "tech-fundamentals",
        name: "Computer & IT fundamentals",
        summary: "Computer awareness, programming basics and networking.",
        subjects: [],
        upcoming: ["Computer Awareness", "Programming Basics", "Networking Basics"],
        keywords: ["computer", "coding", "programming", "networking"],
      },
    ],
  },
  {
    id: "business-management",
    name: "Business & Management",
    summary: "Business English and MBA entrance verbal and quantitative skills.",
    exams: [
      {
        id: "business-english",
        name: "Business English (B1, C1)",
        summary: "Workplace grammar, vocabulary, emails and spoken communication.",
        subjects: ["grammar", "vocabulary", "writing", "speaking", "supervisor"],
        mockFamilies: ["BUSINESS_ENGLISH"],
        keywords: ["bec", "corporate", "business"],
      },
      {
        id: "mba-entrance",
        name: "MBA entrance-style (verbal & quant)",
        summary: "Reading comprehension, verbal and logical reasoning and quantitative aptitude.",
        subjects: ["reading-comprehension", "verbal-reasoning", "logical-reasoning", "numerical-aptitude"],
        upcoming: ["Data Interpretation sets"],
        keywords: ["mba", "cat", "gmat", "mat", "xat"],
      },
      {
        id: "business-fundamentals",
        name: "Business fundamentals",
        summary: "Marketing, finance and management basics.",
        subjects: [],
        upcoming: ["Marketing Basics", "Finance Basics", "Management Basics"],
      },
    ],
  },
  {
    id: "reasoning-aptitude",
    name: "Reasoning & Aptitude",
    summary: "Quantitative aptitude, logical and verbal reasoning and situational judgement.",
    exams: [
      {
        id: "aptitude-tests",
        name: "Aptitude tests",
        summary: "Numbers, logic and language, as in most recruitment tests.",
        subjects: ["numerical-aptitude", "logical-reasoning", "verbal-reasoning"],
        mockFamilies: ["APTITUDE"],
        keywords: ["quant", "maths", "reasoning", "puzzles"],
      },
      {
        id: "situational-judgement",
        name: "Situational judgement tests",
        summary: "Choosing the best response to realistic workplace situations.",
        subjects: ["situational-judgement"],
        keywords: ["sjt", "psychometric"],
      },
    ],
  },
  {
    id: "subject-practice",
    name: "Subject Practice",
    summary: "School and college subjects. English and arithmetic are ready; more are on the way.",
    exams: [
      {
        id: "english-language",
        name: "English language",
        summary: "Grammar, vocabulary, comprehension and writing.",
        subjects: ["grammar", "vocabulary", "reading-comprehension", "writing"],
      },
      {
        id: "mathematics",
        name: "Mathematics",
        summary: "Arithmetic today: percentages, ratios, averages, time and work.",
        subjects: ["numerical-aptitude"],
        upcoming: ["Algebra", "Geometry"],
        keywords: ["maths", "math", "arithmetic"],
      },
      {
        id: "science-gk",
        name: "Science & general knowledge",
        summary: "General science, history, geography and current affairs.",
        subjects: [],
        upcoming: ["General Science", "History & Geography", "Current Affairs"],
        keywords: ["gk", "general knowledge", "science"],
      },
    ],
  },
  {
    id: "specialised-exams",
    name: "Specialised Exams",
    summary: "English for visas and specific professions.",
    exams: [
      {
        id: "visa-settlement",
        name: "Visa & settlement English (SELT-style)",
        summary: "Speaking and listening at A1 to B2 for UK visa applications.",
        subjects: ["speaking", "listening", "reading-comprehension", "writing"],
        mockFamilies: ["SELT_STYLE"],
        keywords: ["selt", "visa", "uk", "life skills", "settlement"],
      },
      {
        id: "healthcare-english",
        name: "Healthcare English",
        summary: "English for nurses and doctors working abroad.",
        subjects: [],
        upcoming: ["Patient Communication", "Case Notes Writing"],
        keywords: ["oet", "nursing", "doctor", "medical"],
      },
      {
        id: "aviation-hospitality",
        name: "Aviation & hospitality English",
        summary: "English for cabin crew, airport and hotel roles.",
        subjects: [],
        upcoming: ["Passenger & Guest Communication", "Announcements"],
        keywords: ["cabin crew", "airline", "hotel", "tourism"],
      },
    ],
  },
];

export function getCategory(id: string): CatalogueCategory | undefined {
  return CATALOGUE.find((c) => c.id === id);
}

export function getExam(categoryId: string, examId: string): CatalogueExam | undefined {
  return getCategory(categoryId)?.exams.find((e) => e.id === examId);
}

/** An exam the candidate can practise today (at least one subject with questions). */
export function isAvailable(exam: CatalogueExam): boolean {
  return exam.subjects.length > 0;
}

/** Below this many questions at a level, a subject shows "Coming soon" at that level instead of borrowing from another. */
export const MIN_QUESTIONS_PER_LEVEL = 20;
