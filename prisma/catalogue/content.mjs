// The exam catalogue's structure (no questions): a private-sector hiring
// preparation platform - company and provider assessments, aptitude and
// reasoning, English and communication, workplace assessments, career
// entrance tests and professional certifications.
//
// Loaded by prisma/seed-catalogue.mjs (fresh databases: creates what's
// missing) and by prisma/catalogue/apply.mjs (existing databases: brings
// them in line with this file, retiring what RETIRED lists). After that,
// admins edit everything in /admin/catalogue.
//
// Company and provider names identify the tests candidates prepare for;
// VocalisAi is not affiliated with them (said on every exam page).

// Shared subjects. `legacy` bridges an existing question bank
// (PracticeQuestion.category), so those subjects have questions today.
export const SUBJECTS = [
  { slug: "quantitative-aptitude", name: "Quantitative Aptitude", legacy: "NUMERICAL_APTITUDE", skills: ["Number System", "Simplification & Approximation", "Percentage", "Ratio & Proportion", "Average", "Profit & Loss", "Simple & Compound Interest", "Time & Work", "Time, Speed & Distance", "Mensuration", "Data Interpretation", "Algebra", "Geometry", "Trigonometry", "Number Series", "Quadratic Equations", "Probability", "Permutation & Combination"] },
  { slug: "reasoning", name: "Logical Reasoning", legacy: "LOGICAL_REASONING", skills: ["Syllogism", "Seating Arrangement", "Puzzles", "Blood Relations", "Direction Sense", "Coding-Decoding", "Series", "Analogy", "Classification", "Inequality", "Order & Ranking", "Input-Output", "Statement & Conclusion", "Data Sufficiency", "Non-verbal Reasoning"] },
  { slug: "analytical-reasoning", name: "Analytical Reasoning", skills: ["Arrangements", "Scheduling", "Grouping & Selection", "Logic Games"] },
  { slug: "abstract-reasoning", name: "Abstract & Inductive Reasoning", skills: ["Pattern Series", "Odd One Out", "Figure Matrices", "Figure Analogies"] },
  { slug: "data-interpretation", name: "Data Interpretation", skills: ["Tables", "Bar & Line Charts", "Pie Charts", "Caselets"] },
  { slug: "critical-thinking", name: "Critical Thinking", skills: ["Assumptions", "Arguments", "Inferences", "Strengthen & Weaken", "Conclusions"] },
  { slug: "verbal-ability", name: "Verbal Ability", legacy: "VERBAL_REASONING", skills: ["Para Jumbles", "Sentence Completion", "Critical Reasoning", "Fact, Inference & Judgement", "Odd Sentence Out"] },
  { slug: "english-grammar", name: "English Grammar", legacy: "GRAMMAR", skills: ["Error Spotting", "Sentence Improvement", "Fill in the Blanks", "Tenses", "Subject-Verb Agreement", "Articles & Prepositions", "Active & Passive Voice", "Direct & Indirect Speech"] },
  { slug: "vocabulary", name: "Vocabulary", legacy: "VOCABULARY", skills: ["Synonyms & Antonyms", "Idioms & Phrases", "One-word Substitution", "Spelling", "Cloze Test"] },
  { slug: "reading-comprehension", name: "Reading Comprehension", legacy: "READING_COMPREHENSION", skills: ["Main Idea", "Inference", "Vocabulary in Context", "Tone & Purpose"] },
  { slug: "listening", name: "Listening", legacy: "LISTENING", skills: ["Main Idea", "Details", "Speaker Attitude"] },
  { slug: "business-communication", name: "Workplace Communication", skills: ["Email & Message Writing", "Tone & Register", "Meetings & Calls"] },
  { slug: "situational-judgement", name: "Situational Judgement", legacy: "SITUATIONAL_JUDGEMENT", skills: ["Workplace Scenarios", "Customer Scenarios", "Ethics & Integrity", "Decision Making", "Professional Behaviour"] },
  { slug: "attention-to-detail", name: "Attention to Detail", skills: ["Error Checking", "Data Comparison", "Proofreading", "Following Instructions"] },
  { slug: "accounting", name: "Accounting", skills: ["Accounting Principles", "Journal & Ledger", "Final Accounts", "Depreciation"] },
  { slug: "business-laws", name: "Business Laws", skills: ["Contract Act", "Sale of Goods Act", "Partnership Act", "Companies Act"] },
  { slug: "business-economics", name: "Business Economics", skills: ["Demand & Supply", "Production & Cost", "Markets", "National Income"] },
  { slug: "financial-markets", name: "Financial Markets", skills: ["Securities Markets", "Mutual Funds", "Derivatives", "Regulations"] },
  { slug: "insurance", name: "Insurance Principles", skills: ["Life Insurance", "General Insurance", "Regulations & Ethics"] },
  { slug: "banking-operations", name: "Banking Operations", skills: ["Principles & Practices of Banking", "Accounting & Finance for Bankers", "Retail Banking", "Risk Management"] },
];

// A section of an exam: its own name for it, and the shared subjects behind it.
const S = (name, ...subjects) => ({ name, subjects });
const ENGLISH = ["english-grammar", "vocabulary", "reading-comprehension"];

const PROVIDERS = "Assessment providers";
const COMPANIES = "Company assessments";

// Categories in display order. Exam fields: slug, name, sections, and
// optionally group (sub-heading), description, keywords (search), popular
// (Featured assessments), minutes (full mock), per (mock questions per subject).
export const CATEGORIES = [
  {
    slug: "company-hiring-assessments",
    name: "Company & Hiring Assessments",
    description: "The aptitude, reasoning and English sections of company recruitment tests and the platforms that run them.",
    exams: [
      { slug: "amcat", name: "AMCAT", group: PROVIDERS, popular: true, keywords: "aspiring minds employability test", sections: [S("Quantitative Ability", "quantitative-aptitude"), S("Logical Ability", "reasoning"), S("English Comprehension", ...ENGLISH)] },
      { slug: "elitmus", name: "eLitmus (pH Test)", group: PROVIDERS, popular: true, keywords: "elitmus ph test", sections: [S("Quantitative Ability", "quantitative-aptitude"), S("Problem Solving", "reasoning", "data-interpretation"), S("Verbal Ability", "verbal-ability", "reading-comprehension", "english-grammar")] },
      { slug: "cocubes", name: "CoCubes", group: PROVIDERS, popular: true, keywords: "aon cocubes", sections: [S("Quantitative Aptitude", "quantitative-aptitude"), S("Logical Reasoning", "reasoning"), S("English", ...ENGLISH)] },
      { slug: "tcs-ion", name: "TCS iON Assessments", group: PROVIDERS, keywords: "tcs ion digital assessment", sections: [S("Numerical Ability", "quantitative-aptitude"), S("Reasoning", "reasoning"), S("Verbal Ability", ...ENGLISH)] },
      { slug: "shl", name: "SHL Assessments", group: PROVIDERS, keywords: "shl talent measurement numerical verbal inductive deductive", sections: [S("Numerical Reasoning", "quantitative-aptitude", "data-interpretation"), S("Verbal Reasoning", "verbal-ability", "reading-comprehension"), S("Inductive Reasoning", "abstract-reasoning"), S("Deductive Reasoning", "critical-thinking")] },
      { slug: "mettl", name: "Mercer | Mettl Assessments", group: PROVIDERS, keywords: "mercer mettl", sections: [S("Aptitude", "quantitative-aptitude", "reasoning"), S("English", ...ENGLISH), S("Behavioural", "situational-judgement")] },
      { slug: "hirepro", name: "HirePro Assessments", group: PROVIDERS, keywords: "hirepro", sections: [S("Quantitative", "quantitative-aptitude"), S("Logical", "reasoning"), S("Verbal", "english-grammar", "vocabulary")] },
      { slug: "tcs-nqt", name: "TCS NQT", group: COMPANIES, popular: true, keywords: "tcs national qualifier test ninja digital", sections: [S("Numerical Ability", "quantitative-aptitude"), S("Reasoning Ability", "reasoning"), S("Verbal Ability", "verbal-ability", ...ENGLISH)] },
      { slug: "infosys", name: "Infosys", group: COMPANIES, popular: true, keywords: "infosys infytq system engineer", sections: [S("Mathematical Ability", "quantitative-aptitude"), S("Logical Reasoning", "reasoning", "data-interpretation"), S("Verbal Ability", "verbal-ability", "english-grammar", "reading-comprehension")] },
      { slug: "accenture", name: "Accenture", group: COMPANIES, popular: true, keywords: "accenture cognitive assessment", sections: [S("English Ability", ...ENGLISH), S("Critical Reasoning & Problem Solving", "reasoning", "critical-thinking", "quantitative-aptitude"), S("Abstract Reasoning", "abstract-reasoning")] },
      { slug: "cognizant", name: "Cognizant (GenC)", group: COMPANIES, popular: true, keywords: "cognizant genc cts", sections: [S("Quantitative Aptitude", "quantitative-aptitude"), S("Logical Reasoning", "reasoning"), S("English", ...ENGLISH)] },
      { slug: "wipro", name: "Wipro (NLTH, Elite)", group: COMPANIES, popular: true, keywords: "wipro nlth elite", sections: [S("Aptitude", "quantitative-aptitude", "reasoning"), S("Verbal", ...ENGLISH)] },
      { slug: "capgemini", name: "Capgemini", group: COMPANIES, popular: true, keywords: "capgemini", sections: [S("English", ...ENGLISH), S("Aptitude", "quantitative-aptitude", "reasoning", "abstract-reasoning"), S("Behavioural", "situational-judgement")] },
      { slug: "deloitte", name: "Deloitte", group: COMPANIES, keywords: "deloitte usi", sections: [S("Aptitude", "quantitative-aptitude", "reasoning", "data-interpretation"), S("Verbal", ...ENGLISH)] },
      { slug: "ey", name: "EY", group: COMPANIES, keywords: "ernst young", sections: [S("Numerical Reasoning", "quantitative-aptitude", "data-interpretation"), S("Verbal Reasoning", "verbal-ability", "reading-comprehension"), S("Situational Judgement", "situational-judgement")] },
      { slug: "kpmg", name: "KPMG", group: COMPANIES, keywords: "kpmg", sections: [S("Numerical Reasoning", "quantitative-aptitude", "data-interpretation"), S("Verbal Reasoning", "verbal-ability", "reading-comprehension"), S("Logical Reasoning", "abstract-reasoning"), S("Situational Judgement", "situational-judgement")] },
      { slug: "pwc", name: "PwC", group: COMPANIES, keywords: "pricewaterhousecoopers", sections: [S("Numerical Reasoning", "quantitative-aptitude", "data-interpretation"), S("Verbal Reasoning", "verbal-ability", "reading-comprehension"), S("Logical Reasoning", "reasoning", "abstract-reasoning"), S("Behavioural", "situational-judgement")] },
      { slug: "tech-mahindra", name: "Tech Mahindra", group: COMPANIES, keywords: "techm tech mahindra", sections: [S("Aptitude", "quantitative-aptitude", "reasoning"), S("English", ...ENGLISH)] },
      { slug: "hcltech", name: "HCLTech", group: COMPANIES, keywords: "hcl technologies", sections: [S("Aptitude", "quantitative-aptitude", "reasoning"), S("English", ...ENGLISH)] },
    ],
  },
  {
    slug: "aptitude-reasoning",
    name: "Aptitude & Reasoning",
    description: "Numbers, logic, patterns and data, as tested in almost every hiring assessment.",
    exams: [
      { slug: "general-aptitude", name: "General Aptitude", popular: true, keywords: "aptitude quant logical", sections: [S(null, "quantitative-aptitude", "reasoning", "verbal-ability", "data-interpretation")] },
      { slug: "analytical-critical-thinking", name: "Analytical Reasoning & Critical Thinking", keywords: "analytical critical thinking arguments", sections: [S(null, "analytical-reasoning", "critical-thinking")] },
      { slug: "abstract-inductive-reasoning", name: "Abstract & Inductive Reasoning", keywords: "abstract inductive non-verbal diagrammatic", sections: [S(null, "abstract-reasoning")] },
      { slug: "data-interpretation-practice", name: "Data Interpretation", keywords: "di charts tables", sections: [S(null, "data-interpretation")] },
    ],
  },
  {
    slug: "english-communication",
    name: "English & Communication",
    description: "Grammar, vocabulary, comprehension, listening and workplace communication.",
    exams: [
      { slug: "english-grammar-usage", name: "English Grammar & Usage", popular: true, sections: [S(null, "english-grammar")] },
      { slug: "vocabulary-builder", name: "Vocabulary Builder", sections: [S(null, "vocabulary")] },
      { slug: "reading-skills", name: "Reading Comprehension", sections: [S(null, "reading-comprehension")] },
      { slug: "listening-skills", name: "Listening", sections: [S(null, "listening")] },
      { slug: "workplace-communication", name: "Workplace Communication", keywords: "email business english", sections: [S(null, "business-communication", "english-grammar")] },
      { slug: "english-for-competitive-exams", name: "English for Hiring Assessments", keywords: "verbal english section", sections: [S(null, ...ENGLISH, "verbal-ability")] },
    ],
  },
  {
    slug: "workplace-assessments",
    name: "Workplace Assessments",
    description: "Judgement, decision making, professional behaviour and attention to detail.",
    exams: [
      { slug: "situational-judgement-test", name: "Situational Judgement Test", popular: true, keywords: "sjt psychometric", sections: [S(null, "situational-judgement")] },
      { slug: "workplace-behaviour", name: "Workplace Behaviour & Decision Making", keywords: "behavioural decision making professional behaviour", sections: [S("Scenarios", "situational-judgement")] },
      { slug: "attention-to-detail-test", name: "Attention to Detail", keywords: "accuracy checking", sections: [S(null, "attention-to-detail")] },
    ],
  },
  {
    slug: "career-entrance",
    name: "Career & Entrance Assessments",
    description: "Management entrance tests run by universities and private bodies.",
    exams: [
      { slug: "cat", name: "CAT", keywords: "iim mba", per: 22, minutes: 120, sections: [S("Verbal Ability & Reading Comprehension", "verbal-ability", "reading-comprehension"), S("Data Interpretation & Logical Reasoning", "data-interpretation", "analytical-reasoning"), S("Quantitative Ability", "quantitative-aptitude")] },
      { slug: "xat", name: "XAT", keywords: "xlri mba", sections: [S("Verbal & Logical Ability", "verbal-ability", "reading-comprehension", "critical-thinking"), S("Decision Making", "situational-judgement"), S("Quantitative Ability & Data Interpretation", "quantitative-aptitude", "data-interpretation")] },
      { slug: "nmat", name: "NMAT", keywords: "nmims gmac", sections: [S("Language Skills", ...ENGLISH), S("Quantitative Skills", "quantitative-aptitude", "data-interpretation"), S("Logical Reasoning", "reasoning")] },
      { slug: "snap", name: "SNAP", keywords: "symbiosis", sections: [S("General English", ...ENGLISH), S("Quantitative, Data Interpretation & Data Sufficiency", "quantitative-aptitude", "data-interpretation"), S("Analytical & Logical Reasoning", "reasoning", "analytical-reasoning")] },
      { slug: "mat", name: "MAT", keywords: "aima management aptitude test", sections: [S("Language Comprehension", ...ENGLISH), S("Mathematical Skills", "quantitative-aptitude"), S("Data Analysis & Sufficiency", "data-interpretation"), S("Intelligence & Critical Reasoning", "reasoning", "critical-thinking")] },
      { slug: "ipmat", name: "IPMAT", keywords: "iim indore integrated", sections: [S("Quantitative Ability", "quantitative-aptitude"), S("Verbal Ability", "verbal-ability", "reading-comprehension")] },
    ],
  },
  {
    slug: "professional-certification",
    name: "Professional & Certification Exams",
    description: "Finance, accounting, insurance and banking certifications.",
    exams: [
      { slug: "ca-foundation", name: "CA Foundation", keywords: "chartered accountant icai", sections: [S(null, "accounting", "business-laws", "quantitative-aptitude", "business-economics")] },
      { slug: "cma-foundation", name: "CMA Foundation", keywords: "cost management accountant", sections: [S(null, "accounting", "business-laws", "business-economics")] },
      { slug: "cseet", name: "CSEET", keywords: "company secretary", sections: [S(null, "business-laws", "business-economics", "reading-comprehension")] },
      { slug: "nism", name: "NISM Certifications", keywords: "securities mutual fund", sections: [S(null, "financial-markets")] },
      { slug: "irdai-agent", name: "Insurance Agent Exam", keywords: "irdai insurance agent", sections: [S(null, "insurance")] },
      { slug: "jaiib", name: "JAIIB", keywords: "iibf bank employees", sections: [S(null, "banking-operations")] },
      { slug: "caiib", name: "CAIIB", keywords: "iibf", sections: [S(null, "banking-operations")] },
    ],
  },
];


// Taken out of the candidate catalogue on 1 Oct 2026 (government recruitment
// exams and entrance tests run by government bodies). apply.mjs switches
// them off - never deletes them - so test history keeps its names.
export const RETIRED = {
  categories: ["government-competitive", "banking", "ssc", "railway", "upsc-civil-services", "state-government", "police-defence", "teaching", "university-entrance", "campus-placement"],
  subjects: ["general-awareness", "banking-awareness", "computer-knowledge", "general-science", "general-studies", "csat", "child-pedagogy", "teaching-aptitude", "environmental-studies", "mathematics", "physics", "chemistry", "biology", "legal-reasoning", "programming-logic", "technical-mcq"],
};

export function slugify(name) {
  return name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Every (exam, subject) link with its section name and order. */
export function examLinks(exam) {
  return exam.sections.flatMap((section) => section.subjects.map((subject) => ({ subject, sectionName: section.name ?? null }))).map((l, i) => ({ ...l, sortOrder: i }));
}

export function mockMinutes(exam) {
  return exam.minutes ?? Math.ceil(examLinks(exam).length * (exam.per ?? 10) * 0.75);
}
