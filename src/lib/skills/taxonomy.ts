// The master skill taxonomy (blueprint rev. 2, 26 Sep 2026): 12 categories
// -> subcategories -> skills. Single source of truth; the Skill table is
// seeded from this (prisma/seed-skills.mjs reads the compiled JSON built by
// tests, see skillRows()). Questions belong to skills - exams, drills, mocks
// and Goal Tracks are recipes over skills.
//
// IDs: CAT (category), CAT.SUB (subcategory), CAT.SUB.SKILL (skill).
// Coding/programming is out of scope; personality tests are not in the
// scored bank. Categories not in V1_ENABLED_CATEGORIES stay hidden in the UI
// unless the skills_all_categories feature flag is turned on.

export interface SkillNode {
  code: string;
  name: string;
  children?: SkillNode[];
}

const s = (code: string, name: string): SkillNode => ({ code, name });
const sub = (code: string, name: string, skills: SkillNode[]): SkillNode => ({ code, name, children: skills });

export const TAXONOMY: SkillNode[] = [
  {
    code: "ENG",
    name: "English Language Proficiency",
    children: [
      sub("GRM", "Grammar", [
        s("TENSES", "Tenses"),
        s("SVA", "Subject-verb agreement"),
        s("ARTICLES", "Articles"),
        s("PREPOSITIONS", "Prepositions"),
        s("MODALS", "Modals"),
        s("CONDITIONALS", "Conditionals"),
        s("VOICE", "Active and passive voice"),
        s("REPORTED", "Direct and indirect speech"),
        s("CLAUSES", "Clauses and relative pronouns"),
        s("CORRECTION", "Sentence correction and error spotting"),
      ]),
      sub("VOC", "Vocabulary", [
        s("SYNANT", "Synonyms and antonyms"),
        s("CONTEXT", "Word in context"),
        s("COLLOCATIONS", "Collocations"),
        s("PHRASAL", "Phrasal verbs"),
        s("IDIOMS", "Idioms"),
        s("ONEWORD", "One-word substitution"),
        s("BUSINESS", "Business and domain vocabulary"),
        s("SPELLING", "Spelling and commonly confused words"),
      ]),
      sub("RDG", "Reading", [
        s("MAIN", "Main idea"),
        s("DETAIL", "Detail retrieval"),
        s("INFERENCE", "Inference"),
        s("VOCAB", "Vocabulary in context"),
        s("TONE", "Author tone and purpose"),
        s("SKIM", "Skimming and scanning under time"),
        s("CLOZE", "Cloze"),
      ]),
      sub("LST", "Listening", [
        s("GIST", "Gist"),
        s("DETAIL", "Specific detail"),
        s("NUMBERS", "Numbers, names and spellings"),
        s("INTENT", "Speaker intent and attitude"),
        s("NOTES", "Note completion"),
        s("ACCENTS", "Accents (IN/US/UK/AU)"),
      ]),
      sub("WRT", "Writing", [
        s("SENTENCE", "Sentence construction"),
        s("COHERENCE", "Paragraph coherence"),
        s("PUNCTUATION", "Punctuation"),
        s("SUMMARY", "Summarising"),
        s("REGISTER", "Formal vs informal register"),
        s("ESSAY", "Essay and opinion"),
      ]),
      sub("MED", "Mediation", [
        s("EXPLAIN", "Summarise or explain for another person"),
        s("PARAPHRASE", "Paraphrase"),
        s("SIMPLIFY", "Simplify"),
      ]),
    ],
  },
  {
    code: "SPK",
    name: "Spoken Communication, Voice & Accent",
    children: [
      sub("PRN", "Pronunciation", [
        s("SOUNDS", "Individual sounds (v/w, th, z)"),
        s("WORDSTRESS", "Word stress"),
        s("SENTSTRESS", "Sentence stress"),
        s("MINPAIRS", "Minimal pairs"),
        s("ENDINGS", "Ending sounds (-ed, -s)"),
        s("READALOUD", "Read aloud"),
      ]),
      sub("FLU", "Fluency", [s("RATE", "Rate of speech"), s("PAUSES", "Pauses"), s("FILLERS", "Fillers"), s("SELFCORR", "Self-correction")]),
      sub("PRS", "Prosody", [s("INTONATION", "Intonation"), s("RHYTHM", "Rhythm"), s("CHUNKING", "Chunking"), s("TONE", "Tone")]),
      sub("SNM", "Sentence Mastery", [s("REPEAT", "Repeat sentence"), s("BUILDS", "Sentence builds"), s("GRAMMAR", "Spoken grammar accuracy")]),
      sub("SPN", "Spontaneous Speaking", [
        s("SHORT", "Short answer"),
        s("DESCRIBE", "Picture or topic description"),
        s("OPINION", "Opinion"),
        s("RETELL", "Retell"),
        s("JAM", "Just-a-minute"),
      ]),
      sub("INT", "Interactive Speaking", [s("ROLEPLAY", "Role-play"), s("TURNS", "Turn-taking"), s("CLARIFY", "Asking for clarification")]),
      sub("PRE", "Presentation", [s("STRUCTURE", "Structure"), s("CLARITY", "Clarity"), s("CONFIDENCE", "Confidence"), s("FILLERCTL", "Filler control")]),
    ],
  },
  {
    code: "QNT",
    name: "Quantitative Aptitude & Mathematics",
    children: [
      sub("ARI", "Arithmetic", [
        s("NUMSYS", "Number system"),
        s("LCMHCF", "LCM and HCF"),
        s("DIVISIBILITY", "Divisibility"),
        s("FRACTIONS", "Fractions and decimals"),
        s("SIMPLIFY", "Simplification"),
        s("INDICES", "Surds and indices"),
      ]),
      sub("COM", "Commercial Maths", [
        s("PERCENT", "Percentages"),
        s("PROFITLOSS", "Profit and loss"),
        s("DISCOUNT", "Discount"),
        s("INTEREST", "Simple and compound interest"),
        s("RATIO", "Ratio and proportion"),
        s("PARTNERSHIP", "Partnership"),
        s("AVERAGES", "Averages"),
        s("MIXTURES", "Mixtures and alligation"),
      ]),
      sub("TIM", "Time-based", [
        s("WORK", "Time and work"),
        s("PIPES", "Pipes and cisterns"),
        s("TSD", "Time, speed and distance"),
        s("BOATS", "Boats and streams"),
        s("TRAINS", "Trains"),
      ]),
      sub("ALG", "Algebra", [s("LINEAR", "Linear equations"), s("QUADRATIC", "Quadratic equations"), s("INEQUALITIES", "Inequalities"), s("PROGRESSIONS", "Progressions (AP/GP)"), s("FUNCTIONS", "Functions")]),
      sub("GEO", "Geometry & Mensuration", [s("AREA2D", "2D area"), s("VOLUME3D", "3D area and volume"), s("TRIANGLES", "Triangles"), s("CIRCLES", "Circles"), s("COORD", "Coordinate basics")]),
      sub("PRB", "Counting & Probability", [s("PERMCOMB", "Permutations and combinations"), s("PROBABILITY", "Probability"), s("STATS", "Basic statistics")]),
      sub("MEN", "Mental Maths", [s("SPEED", "Speed calculation"), s("APPROX", "Approximation"), s("ESTIMATE", "Estimation")]),
    ],
  },
  {
    code: "REA",
    name: "Logical & Analytical Reasoning",
    children: [
      sub("SER", "Series", [s("NUM", "Number series"), s("LETTER", "Letter series"), s("ALNUM", "Alphanumeric series"), s("MISSING", "Missing term"), s("ODD", "Odd one out")]),
      sub("COD", "Coding-Decoding", [s("CODING", "Coding-decoding")]),
      sub("REL", "Relations", [s("BLOOD", "Blood relations"), s("DIRECTION", "Direction sense"), s("RANKING", "Ranking and ordering")]),
      sub("ARR", "Arrangements", [s("LINEAR", "Linear seating"), s("CIRCULAR", "Circular seating"), s("PUZZLES", "Floor and box puzzles"), s("SCHEDULING", "Scheduling")]),
      sub("DED", "Deductive", [s("SYL", "Syllogisms"), s("CONCLUSIONS", "Statements and conclusions"), s("ASSUMPTIONS", "Statements and assumptions"), s("CAUSE", "Cause and effect")]),
      sub("IND", "Inductive", [s("RULES", "Rule finding"), s("ANALOGIES", "Analogies"), s("CLASSIFY", "Classification")]),
      sub("ANA", "Analytical", [
        s("SUFFICIENCY", "Data sufficiency"),
        s("MACHINE", "Input-output"),
        s("CLOCKS", "Clocks and calendars"),
        s("CUBES", "Cubes and dice"),
        s("VENN", "Venn diagrams"),
      ]),
    ],
  },
  {
    code: "VRB",
    name: "Verbal Reasoning & Critical Thinking",
    children: [
      sub("PAS", "Passage reasoning", [s("TFCS", "True / False / Cannot Say")]),
      sub("PJM", "Para-jumbles & sentence ordering", [s("ORDER", "Sentence ordering")]),
      sub("SCP", "Sentence completion", [s("COMPLETE", "Sentence completion")]),
      sub("CRT", "Critical reasoning", [s("STRENGTHEN", "Strengthen / weaken"), s("ASSUMPTION", "Assumption"), s("INFERENCE", "Inference"), s("FLAW", "Flaw")]),
      sub("ARG", "Fact vs opinion & argument evaluation", [s("FACTOPINION", "Fact vs opinion"), s("EVALUATE", "Argument evaluation")]),
    ],
  },
  {
    code: "COG",
    name: "Cognitive & Abstract Ability",
    children: [
      sub("ABS", "Abstract / non-verbal", [s("FIGSERIES", "Figure series"), s("MATRICES", "Matrices"), s("MIRROR", "Mirror and water images"), s("EMBEDDED", "Embedded figures")]),
      sub("SPA", "Spatial", [s("FOLDING", "Paper folding"), s("ROTATION", "Rotation"), s("CUBES", "Cubes")]),
      sub("MEM", "Memory", [s("PASSAGE", "Passage recall"), s("SPAN", "Number and word span"), s("AUDIO", "Audio recall")]),
      sub("ATT", "Attention & Accuracy", [s("CHECKING", "Checking and comparison"), s("ERRORS", "Error detection in records"), s("DATAENTRY", "Data-entry accuracy")]),
      sub("SPD", "Processing speed", [s("SPEED", "Processing speed")]),
    ],
  },
  {
    code: "DIN",
    name: "Data Interpretation",
    children: [
      sub("TAB", "Tables", [s("TABLES", "Tables")]),
      sub("BAR", "Bar charts", [s("BARS", "Bar charts")]),
      sub("LIN", "Line charts", [s("LINES", "Line charts")]),
      sub("PIE", "Pie charts", [s("PIES", "Pie charts")]),
      sub("CAS", "Caselets", [s("CASELETS", "Caselets (paragraph data)")]),
      sub("MIX", "Mixed graphs", [s("MIXED", "Mixed graphs")]),
      sub("MET", "Business metrics", [s("METRICS", "Business metrics (AHT, CSAT, conversion, growth %)")]),
    ],
  },
  {
    code: "BIZ",
    name: "Workplace & Business Communication",
    children: [
      sub("EML", "Email", [s("REQUEST", "Request"), s("COMPLAINT", "Complaint response"), s("FOLLOWUP", "Follow-up"), s("APOLOGY", "Apology"), s("ESCALATION", "Escalation")]),
      sub("CHT", "Chat & messaging", [s("TONE", "Tone"), s("BREVITY", "Brevity"), s("SPEEDGRAMMAR", "Grammar under speed")]),
      sub("BWR", "Business writing", [s("SUMMARIES", "Summaries"), s("REPORTS", "Reports"), s("NOTES", "Meeting notes and minutes")]),
      sub("MTG", "Meetings & calls", [s("CLARIFY", "Clarifying"), s("SUMMARISE", "Summarising"), s("STANDUP", "Stand-up updates")]),
      sub("ETQ", "Etiquette", [s("POLITENESS", "Politeness strategies"), s("CROSSCULTURE", "Cross-cultural communication")]),
    ],
  },
  {
    code: "CSV",
    name: "Customer Service & Support",
    children: [
      sub("CAL", "Call handling", [s("OPENCLOSE", "Opening and closing"), s("HOLDTRANSFER", "Hold and transfer"), s("VERIFY", "Verification")]),
      sub("EMP", "Empathy & rapport", [s("EMPATHY", "Empathy and rapport")]),
      sub("PRB", "Active listening & probing", [s("PROBING", "Active listening and probing")]),
      sub("DES", "De-escalation & complaints", [s("DEESCALATE", "De-escalation and complaints")]),
      sub("TRB", "Problem solving & troubleshooting", [s("TROUBLESHOOT", "Problem solving and troubleshooting")]),
      sub("SAL", "Sales & upsell", [s("OBJECTIONS", "Objection handling and upsell")]),
      sub("NVC", "Chat/email support", [s("NONVOICE", "Non-voice support")]),
      sub("CMP", "Process & compliance", [s("PRIVACY", "Data privacy"), s("SCRIPTING", "Scripting adherence")]),
    ],
  },
  {
    code: "SJT",
    name: "Situational Judgement & Workplace Behaviour",
    children: [
      sub("TEAM", "Teamwork", [s("TEAMWORK", "Teamwork")]),
      sub("PRIO", "Prioritisation & time management", [s("PRIORITISE", "Prioritisation and time management")]),
      sub("ETH", "Ethics & integrity", [s("INTEGRITY", "Ethics and integrity")]),
      sub("OWN", "Ownership & accountability", [s("OWNERSHIP", "Ownership and accountability")]),
      sub("CONF", "Handling conflict", [s("CONFLICT", "Handling conflict with peers or manager")]),
      sub("CUST", "Customer-first decisions", [s("CUSTFIRST", "Customer-first decisions")]),
      sub("ADAPT", "Adaptability", [s("ADAPTABILITY", "Adaptability")]),
    ],
  },
  {
    code: "INV",
    name: "Interview & Career Readiness",
    children: [
      sub("INT", "Self-introduction", [s("SELFINTRO", "Self-introduction")]),
      sub("HRQ", "HR questions", [s("HR", "HR questions")]),
      sub("STR", "Behavioural / STAR", [s("STAR", "Behavioural (STAR)")]),
      sub("SIT", "Situational interview", [s("SITUATIONAL", "Situational interview")]),
      sub("GD", "Group discussion", [s("DISCUSSION", "Group discussion")]),
      sub("CLS", "Salary & closing questions", [s("CLOSING", "Salary and closing questions")]),
      sub("ETQ", "Body language & virtual interview etiquette", [s("ETIQUETTE", "Body language and virtual interview etiquette")]),
      sub("CV", "Résumé / profile writing", [s("RESUME", "Résumé and profile writing")]),
    ],
  },
  {
    code: "DGT",
    name: "Workplace Digital Skills",
    children: [
      sub("TYP", "Typing", [s("WPM", "Speed (WPM)"), s("ACCURACY", "Accuracy"), s("DICTATION", "Dictation typing")]),
      sub("BAS", "Computer & email basics", [s("SHORTCUTS", "Shortcuts"), s("FILES", "Files"), s("EMAIL", "Email handling")]),
      sub("OFF", "Office tools", [s("SHEETS", "Excel / Sheets basics"), s("DOCS", "Word / Docs basics")]),
      sub("SAF", "Online safety", [s("PHISHING", "Phishing"), s("PASSWORDS", "Passwords"), s("PRIVACY", "Data privacy")]),
      sub("CRM", "Support tools", [s("TICKETING", "Ticketing and CRM concepts")]),
    ],
  },
];

// v1 launch scope: owner-approved ENG/SPK/INV/CSV/VRB, plus SJT (241+
// questions already exist) and REA/QNT (added by the owner, 26 Sep 2026).
export const V1_ENABLED_CATEGORIES = ["ENG", "SPK", "QNT", "REA", "VRB", "CSV", "SJT", "INV"] as const;

// Feature flag that reveals every category (default OFF).
export const ALL_CATEGORIES_FLAG = "skills_all_categories";

// Short, candidate-facing category names (the full blueprint names above
// are kept for admin and reporting).
export const CATEGORY_SHORT_NAMES: Record<string, string> = {
  ENG: "English",
  SPK: "Speaking & Accent",
  QNT: "Numerical Aptitude",
  REA: "Logical Reasoning",
  VRB: "Verbal Reasoning",
  COG: "Cognitive Ability",
  DIN: "Data Interpretation",
  BIZ: "Business Communication",
  CSV: "Customer Service",
  SJT: "Workplace Judgement",
  INV: "Interview Readiness",
  DGT: "Digital Skills",
};

/** The name to show a candidate: short for categories, the node's own name otherwise. */
export function displayName(node: { id: string; name: string }): string {
  return CATEGORY_SHORT_NAMES[node.id] ?? node.name;
}

export interface SkillRow {
  id: string;
  code: string;
  name: string;
  depth: 1 | 2 | 3; // 1 category, 2 subcategory, 3 skill
  parentId: string | null;
  categoryCode: string;
  sortOrder: number;
  enabled: boolean;
}

// Flattens the tree into Skill rows (stable order, parent before child).
export function skillRows(tree: SkillNode[] = TAXONOMY): SkillRow[] {
  const rows: SkillRow[] = [];
  tree.forEach((cat, ci) => {
    const enabled = (V1_ENABLED_CATEGORIES as readonly string[]).includes(cat.code);
    rows.push({ id: cat.code, code: cat.code, name: cat.name, depth: 1, parentId: null, categoryCode: cat.code, sortOrder: ci + 1, enabled });
    (cat.children ?? []).forEach((sb, si) => {
      const subId = `${cat.code}.${sb.code}`;
      rows.push({ id: subId, code: sb.code, name: sb.name, depth: 2, parentId: cat.code, categoryCode: cat.code, sortOrder: si + 1, enabled });
      (sb.children ?? []).forEach((sk, ki) => {
        rows.push({ id: `${subId}.${sk.code}`, code: sk.code, name: sk.name, depth: 3, parentId: subId, categoryCode: cat.code, sortOrder: ki + 1, enabled });
      });
    });
  });
  return rows;
}

// L1-L6 ladder (anchored to CEFR for language skills).
export const LEVELS = [
  { level: 1, name: "Foundation", cefr: "Pre-A1/A1" },
  { level: 2, name: "Beginner", cefr: "A2" },
  { level: 3, name: "Intermediate", cefr: "B1" },
  { level: 4, name: "Upper-Intermediate", cefr: "B2" },
  { level: 5, name: "Advanced", cefr: "C1" },
  { level: 6, name: "Expert", cefr: "C2" },
] as const;
