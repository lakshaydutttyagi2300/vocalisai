// The starting exam catalogue (structure only - no questions). Loaded by
// prisma/seed-catalogue.mjs; after that, admins edit everything in
// /admin/catalogue. Re-running the seed adds missing rows and never
// overwrites what an admin has changed.

// Shared subjects. `legacy` bridges to an existing question bank
// (PracticeQuestion.category), so those subjects have questions today.
export const SUBJECTS = [
  { slug: "quantitative-aptitude", name: "Quantitative Aptitude", legacy: "NUMERICAL_APTITUDE", skills: ["Number System", "Simplification & Approximation", "Percentage", "Ratio & Proportion", "Average", "Profit & Loss", "Simple & Compound Interest", "Time & Work", "Time, Speed & Distance", "Mensuration", "Data Interpretation", "Algebra", "Geometry", "Trigonometry", "Number Series", "Quadratic Equations", "Probability", "Permutation & Combination"] },
  { slug: "reasoning", name: "Reasoning Ability", legacy: "LOGICAL_REASONING", skills: ["Syllogism", "Seating Arrangement", "Puzzles", "Blood Relations", "Direction Sense", "Coding-Decoding", "Series", "Analogy", "Classification", "Inequality", "Order & Ranking", "Input-Output", "Statement & Conclusion", "Data Sufficiency", "Non-verbal Reasoning"] },
  { slug: "verbal-ability", name: "Verbal Ability", legacy: "VERBAL_REASONING", skills: ["Para Jumbles", "Sentence Completion", "Critical Reasoning", "Fact, Inference & Judgement", "Odd Sentence Out"] },
  { slug: "english-grammar", name: "English Grammar", legacy: "GRAMMAR", skills: ["Error Spotting", "Sentence Improvement", "Fill in the Blanks", "Tenses", "Subject-Verb Agreement", "Articles & Prepositions", "Active & Passive Voice", "Direct & Indirect Speech"] },
  { slug: "vocabulary", name: "Vocabulary", legacy: "VOCABULARY", skills: ["Synonyms & Antonyms", "Idioms & Phrases", "One-word Substitution", "Spelling", "Cloze Test"] },
  { slug: "reading-comprehension", name: "Reading Comprehension", legacy: "READING_COMPREHENSION", skills: ["Main Idea", "Inference", "Vocabulary in Context", "Tone & Purpose"] },
  { slug: "situational-judgement", name: "Situational Judgement", legacy: "SITUATIONAL_JUDGEMENT", skills: ["Workplace Scenarios", "Customer Scenarios", "Ethics & Integrity"] },
  { slug: "general-awareness", name: "General Awareness", skills: ["Current Affairs", "History", "Geography", "Indian Polity", "Economy", "General Science", "Static GK", "Sports & Awards"] },
  { slug: "banking-awareness", name: "Banking & Financial Awareness", skills: ["Banking Terms", "RBI & Monetary Policy", "Financial Institutions", "Government Schemes", "Budget & Economy"] },
  { slug: "computer-knowledge", name: "Computer Knowledge", skills: ["Computer Fundamentals", "MS Office", "Internet & Networking", "Cyber Security", "Database Basics"] },
  { slug: "general-science", name: "General Science", skills: ["Physics", "Chemistry", "Biology"] },
  { slug: "general-studies", name: "General Studies", skills: ["Ancient & Medieval History", "Modern History", "Art & Culture", "Geography", "Polity & Governance", "Economy", "Environment & Ecology", "Science & Technology", "Current Affairs"] },
  { slug: "csat", name: "CSAT (Aptitude)", skills: ["Comprehension", "Logical Reasoning", "Basic Numeracy", "Decision Making"] },
  { slug: "child-pedagogy", name: "Child Development & Pedagogy", skills: ["Child Development", "Inclusive Education", "Learning & Pedagogy", "Assessment"] },
  { slug: "teaching-aptitude", name: "Teaching & Research Aptitude", skills: ["Teaching Aptitude", "Research Aptitude", "Communication", "Higher Education System", "ICT"] },
  { slug: "environmental-studies", name: "Environmental Studies", skills: ["Family & Friends", "Food & Shelter", "Water & Travel", "Things We Make"] },
  { slug: "mathematics", name: "Mathematics", skills: ["Arithmetic", "Algebra", "Geometry", "Calculus", "Statistics", "Coordinate Geometry"] },
  { slug: "physics", name: "Physics", skills: ["Mechanics", "Thermodynamics", "Electromagnetism", "Optics", "Modern Physics"] },
  { slug: "chemistry", name: "Chemistry", skills: ["Physical Chemistry", "Organic Chemistry", "Inorganic Chemistry"] },
  { slug: "biology", name: "Biology", skills: ["Botany", "Zoology", "Human Physiology", "Genetics", "Ecology"] },
  { slug: "legal-reasoning", name: "Legal Reasoning", skills: ["Legal Principles", "Constitution", "Contracts & Torts", "Criminal Law"] },
  { slug: "data-interpretation", name: "Data Interpretation & Logical Reasoning", skills: ["Tables", "Bar & Line Charts", "Pie Charts", "Caselets", "Arrangements", "Games & Tournaments"] },
  { slug: "programming-logic", name: "Programming Logic", skills: ["Pseudocode", "Data Structures", "Algorithms", "OOP Concepts", "Output Prediction"] },
  { slug: "technical-mcq", name: "Technical Fundamentals", skills: ["Operating Systems", "DBMS & SQL", "Computer Networks", "Software Engineering"] },
  { slug: "accounting", name: "Accounting", skills: ["Accounting Principles", "Journal & Ledger", "Final Accounts", "Depreciation"] },
  { slug: "business-laws", name: "Business Laws", skills: ["Contract Act", "Sale of Goods Act", "Partnership Act", "Companies Act"] },
  { slug: "business-economics", name: "Business Economics", skills: ["Demand & Supply", "Production & Cost", "Markets", "National Income"] },
  { slug: "financial-markets", name: "Financial Markets", skills: ["Securities Markets", "Mutual Funds", "Derivatives", "Regulations"] },
  { slug: "insurance", name: "Insurance Principles", skills: ["Life Insurance", "General Insurance", "Regulations & Ethics"] },
  { slug: "banking-operations", name: "Banking Operations", skills: ["Principles & Practices of Banking", "Accounting & Finance for Bankers", "Retail Banking", "Risk Management"] },
];

const ENGLISH = ["english-grammar", "vocabulary", "reading-comprehension"];
const BANK = ["reasoning", "quantitative-aptitude", ...ENGLISH];

// Exams per category: [slug, name, subjects, { popular, keywords, minutes, per }].
// `per` = questions per subject in the full mock (default 10).
export const CATEGORIES = [
  {
    slug: "government-competitive", name: "Government & Competitive Exams",
    description: "Central government recruitment beyond banking, SSC and railways.",
    exams: [
      ["lic-aao", "LIC AAO", ["reasoning", "quantitative-aptitude", ...ENGLISH, "general-awareness", "banking-awareness"], { keywords: "insurance lic assistant administrative officer" }],
      ["lic-ado", "LIC ADO", ["reasoning", "quantitative-aptitude", ...ENGLISH, "general-awareness", "insurance"], { keywords: "development officer insurance" }],
      ["epfo-ssa", "EPFO Social Security Assistant", ["reasoning", "quantitative-aptitude", ...ENGLISH, "general-awareness", "computer-knowledge"], { keywords: "epfo ssa" }],
      ["fci-manager", "FCI Manager", ["reasoning", "quantitative-aptitude", ...ENGLISH, "general-awareness"], { keywords: "food corporation of india" }],
      ["niacl-ao", "NIACL AO", ["reasoning", "quantitative-aptitude", ...ENGLISH, "general-awareness"], { keywords: "new india assurance insurance" }],
    ],
  },
  {
    slug: "banking", name: "Banking Exams",
    description: "PO, clerk and officer exams of public-sector banks and the RBI.",
    exams: [
      ["sbi-po", "SBI PO", [...BANK, "general-awareness", "banking-awareness", "computer-knowledge"], { popular: true, keywords: "state bank probationary officer" }],
      ["sbi-clerk", "SBI Clerk", [...BANK, "general-awareness", "banking-awareness"], { keywords: "junior associate state bank" }],
      ["ibps-po", "IBPS PO", [...BANK, "general-awareness", "banking-awareness", "computer-knowledge"], { popular: true, keywords: "probationary officer" }],
      ["ibps-clerk", "IBPS Clerk", [...BANK, "general-awareness", "banking-awareness", "computer-knowledge"], { popular: true }],
      ["ibps-rrb-po", "IBPS RRB PO (Officer Scale I)", [...BANK, "general-awareness", "computer-knowledge"], { keywords: "regional rural bank" }],
      ["ibps-rrb-clerk", "IBPS RRB Clerk (Office Assistant)", [...BANK, "general-awareness", "computer-knowledge"], { keywords: "regional rural bank office assistant" }],
      ["ibps-so", "IBPS SO", [...BANK, "general-awareness", "computer-knowledge"], { keywords: "specialist officer it officer" }],
      ["rbi-grade-b", "RBI Grade B", [...BANK, "general-awareness", "business-economics"], { keywords: "reserve bank officer" }],
      ["rbi-assistant", "RBI Assistant", [...BANK, "general-awareness", "computer-knowledge"], { keywords: "reserve bank" }],
      ["nabard-grade-a", "NABARD Grade A", [...BANK, "general-awareness", "business-economics"], { keywords: "agriculture rural development" }],
    ],
  },
  {
    slug: "ssc", name: "SSC Exams",
    description: "Staff Selection Commission exams for central government posts.",
    exams: [
      ["ssc-cgl", "SSC CGL", ["reasoning", "quantitative-aptitude", ...ENGLISH, "general-awareness"], { popular: true, keywords: "combined graduate level", per: 25, minutes: 60 }],
      ["ssc-chsl", "SSC CHSL", ["reasoning", "quantitative-aptitude", ...ENGLISH, "general-awareness"], { popular: true, keywords: "10+2 ldc deo", per: 25, minutes: 60 }],
      ["ssc-mts", "SSC MTS", ["reasoning", "quantitative-aptitude", ...ENGLISH, "general-awareness"], { keywords: "multi tasking staff havaldar" }],
      ["ssc-cpo", "SSC CPO", ["reasoning", "quantitative-aptitude", ...ENGLISH, "general-awareness"], { keywords: "sub inspector delhi police capf" }],
      ["ssc-gd", "SSC GD Constable", ["reasoning", "quantitative-aptitude", ...ENGLISH, "general-awareness"], { keywords: "general duty constable" }],
      ["ssc-stenographer", "SSC Stenographer", ["reasoning", ...ENGLISH, "general-awareness"], { keywords: "steno grade c d" }],
      ["ssc-selection-post", "SSC Selection Post", ["reasoning", "quantitative-aptitude", ...ENGLISH, "general-awareness"] ],
    ],
  },
  {
    slug: "railway", name: "Railway Exams",
    description: "Railway Recruitment Board exams.",
    exams: [
      ["rrb-ntpc", "RRB NTPC", ["quantitative-aptitude", "reasoning", "general-awareness", "general-science"], { popular: true, keywords: "non technical popular categories" }],
      ["rrb-group-d", "RRB Group D", ["quantitative-aptitude", "reasoning", "general-science", "general-awareness"], { keywords: "level 1 track maintainer" }],
      ["rrb-alp", "RRB ALP", ["quantitative-aptitude", "reasoning", "general-science", "general-awareness"], { keywords: "assistant loco pilot" }],
      ["rrb-je", "RRB JE", ["quantitative-aptitude", "reasoning", "general-science", "general-awareness"], { keywords: "junior engineer" }],
      ["rpf-constable", "RPF Constable & SI", ["quantitative-aptitude", "reasoning", "general-awareness"], { keywords: "railway protection force" }],
    ],
  },
  {
    slug: "upsc-civil-services", name: "UPSC & Civil Services",
    description: "Union Public Service Commission exams.",
    exams: [
      ["upsc-cse-prelims", "UPSC CSE Prelims", ["general-studies", "csat"], { popular: true, keywords: "ias ips civil services preliminary", per: 20, minutes: 120 }],
      ["upsc-capf", "UPSC CAPF (AC)", ["general-studies", "reasoning", "quantitative-aptitude"], { keywords: "assistant commandant" }],
      ["upsc-epfo", "UPSC EPFO (EO/AO, APFC)", ["general-studies", ...ENGLISH, "quantitative-aptitude"], { keywords: "enforcement officer" }],
    ],
  },
  {
    slug: "state-government", name: "State Government Exams",
    description: "State public service commission and state staff selection exams.",
    exams: [
      ["uppsc", "UPPSC PCS", ["general-studies", "csat"], { keywords: "uttar pradesh" }],
      ["bpsc", "BPSC CCE", ["general-studies"], { keywords: "bihar" }],
      ["mpsc", "MPSC Rajyaseva", ["general-studies", "csat"], { keywords: "maharashtra" }],
      ["rpsc-ras", "RPSC RAS", ["general-studies"], { keywords: "rajasthan" }],
      ["tnpsc-group-4", "TNPSC Group 4", ["general-studies", "quantitative-aptitude", "reasoning"], { keywords: "tamil nadu" }],
      ["upsssc-pet", "UPSSSC PET", ["general-awareness", "reasoning", "quantitative-aptitude", ...ENGLISH], { keywords: "uttar pradesh preliminary eligibility" }],
      ["hssc-cet", "HSSC CET", ["general-awareness", "reasoning", "quantitative-aptitude", ...ENGLISH], { keywords: "haryana common eligibility" }],
    ],
  },
  {
    slug: "police-defence", name: "Police & Defence Exams",
    description: "Armed forces entry and police recruitment exams.",
    exams: [
      ["nda", "NDA", ["mathematics", ...ENGLISH, "general-studies"], { popular: true, keywords: "national defence academy" }],
      ["cds", "CDS", [...ENGLISH, "general-studies", "mathematics"], { keywords: "combined defence services" }],
      ["afcat", "AFCAT", [...ENGLISH, "general-awareness", "quantitative-aptitude", "reasoning"], { keywords: "air force" }],
      ["agniveer", "Agniveer (Army, Navy, Air Force)", ["general-awareness", "general-science", "mathematics", "reasoning"], { keywords: "agnipath" }],
      ["delhi-police-constable", "Delhi Police Constable", ["reasoning", "general-awareness", "quantitative-aptitude", "computer-knowledge"] ],
      ["up-police-constable", "UP Police Constable", ["general-awareness", "reasoning", "quantitative-aptitude", ...ENGLISH], { keywords: "uttar pradesh" }],
    ],
  },
  {
    slug: "teaching", name: "Teaching & Education Exams",
    description: "Teacher eligibility and recruitment exams.",
    exams: [
      ["ctet", "CTET", ["child-pedagogy", "mathematics", "environmental-studies", ...ENGLISH], { popular: true, keywords: "central teacher eligibility test" }],
      ["state-tet", "State TETs (UPTET, REET, HTET)", ["child-pedagogy", "mathematics", "environmental-studies", ...ENGLISH], { keywords: "uptet reet htet mahatet" }],
      ["kvs", "KVS PRT, TGT & PGT", ["child-pedagogy", "general-awareness", "reasoning", ...ENGLISH], { keywords: "kendriya vidyalaya" }],
      ["dsssb", "DSSSB Teachers", ["child-pedagogy", "general-awareness", "reasoning", "quantitative-aptitude", ...ENGLISH], { keywords: "delhi" }],
      ["ugc-net-paper-1", "UGC NET Paper 1", ["teaching-aptitude", "reading-comprehension", "reasoning", "data-interpretation"], { keywords: "jrf lecturer" }],
    ],
  },
  {
    slug: "university-entrance", name: "University & Entrance Exams",
    description: "Undergraduate, postgraduate, MBA, law, engineering and medical entrance.",
    exams: [
      ["cuet-ug", "CUET UG", [...ENGLISH, "general-awareness", "quantitative-aptitude", "reasoning"], { popular: true, keywords: "common university entrance test" }],
      ["cat", "CAT", ["verbal-ability", "reading-comprehension", "data-interpretation", "quantitative-aptitude"], { popular: true, keywords: "iim mba", per: 22, minutes: 120 }],
      ["xat", "XAT", ["verbal-ability", "reading-comprehension", "data-interpretation", "quantitative-aptitude", "general-awareness"], { keywords: "xlri mba" }],
      ["clat", "CLAT", ["legal-reasoning", ...ENGLISH, "general-awareness", "reasoning", "quantitative-aptitude"], { keywords: "law nlu" }],
      ["ipmat", "IPMAT", ["quantitative-aptitude", "verbal-ability", "reading-comprehension"], { keywords: "iim indore integrated" }],
      ["jee-main", "JEE Main", ["physics", "chemistry", "mathematics"], { keywords: "engineering iit nit" }],
      ["neet-ug", "NEET UG", ["physics", "chemistry", "biology"], { keywords: "medical mbbs" }],
      ["gate", "GATE (General Aptitude)", ["verbal-ability", "quantitative-aptitude", "reasoning"], { keywords: "engineering postgraduate" }],
    ],
  },
  {
    slug: "campus-placement", name: "Campus Placement",
    description: "Recruitment tests of IT services and product companies.",
    exams: [
      ["tcs-nqt", "TCS NQT", ["quantitative-aptitude", "reasoning", "verbal-ability", "english-grammar", "programming-logic"], { popular: true, keywords: "tcs national qualifier test" }],
      ["infosys", "Infosys", ["quantitative-aptitude", "reasoning", "verbal-ability", "english-grammar", "programming-logic"], { keywords: "infosys specialist programmer system engineer" }],
      ["wipro", "Wipro (NLTH, Elite)", ["quantitative-aptitude", "reasoning", "verbal-ability", "programming-logic"] ],
      ["accenture", "Accenture", ["quantitative-aptitude", "reasoning", "verbal-ability", "technical-mcq", "programming-logic"] ],
      ["cognizant", "Cognizant (GenC)", ["quantitative-aptitude", "reasoning", "verbal-ability", "programming-logic"] ],
      ["capgemini", "Capgemini", ["quantitative-aptitude", "reasoning", "verbal-ability", "technical-mcq"] ],
      ["amcat", "AMCAT", ["quantitative-aptitude", "reasoning", "english-grammar", "vocabulary", "reading-comprehension", "technical-mcq"], { keywords: "aspiring minds" }],
      ["elitmus", "eLitmus (pH Test)", ["quantitative-aptitude", "reasoning", "verbal-ability"] ],
    ],
  },
  {
    slug: "aptitude-reasoning", name: "Aptitude & Reasoning",
    description: "Stand-alone practice for numbers, logic and judgement.",
    exams: [
      ["general-aptitude", "General Aptitude", ["quantitative-aptitude", "reasoning", "verbal-ability", "data-interpretation"], { popular: true, keywords: "aptitude quant logical" }],
      ["situational-judgement-test", "Situational Judgement Test", ["situational-judgement"], { keywords: "sjt psychometric" }],
    ],
  },
  {
    slug: "english-communication", name: "English & Communication",
    description: "Grammar, vocabulary and comprehension for every exam and job.",
    exams: [
      ["english-grammar-usage", "English Grammar & Usage", ["english-grammar"], { popular: true }],
      ["vocabulary-builder", "Vocabulary Builder", ["vocabulary"] ],
      ["reading-skills", "Reading Comprehension", ["reading-comprehension"] ],
      ["english-for-competitive-exams", "English for Competitive Exams", [...ENGLISH, "verbal-ability"], { keywords: "bank ssc english section" }],
    ],
  },
  {
    slug: "professional-certification", name: "Professional & Certification Exams",
    description: "Finance, accounting, insurance and banking certifications.",
    exams: [
      ["ca-foundation", "CA Foundation", ["accounting", "business-laws", "quantitative-aptitude", "business-economics"], { keywords: "chartered accountant icai" }],
      ["cma-foundation", "CMA Foundation", ["accounting", "business-laws", "business-economics"], { keywords: "cost management accountant" }],
      ["cseet", "CSEET", ["business-laws", "business-economics", "reading-comprehension", "general-awareness"], { keywords: "company secretary" }],
      ["nism", "NISM Certifications", ["financial-markets"], { keywords: "sebi securities mutual fund" }],
      ["irdai-agent", "IRDAI Insurance Agent", ["insurance"], { keywords: "insurance agent" }],
      ["jaiib", "JAIIB", ["banking-operations"], { keywords: "iibf bank employees" }],
      ["caiib", "CAIIB", ["banking-operations"], { keywords: "iibf" }],
    ],
  },
];

export function slugify(name) {
  return name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
