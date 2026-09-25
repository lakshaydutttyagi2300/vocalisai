// Shared flat-row <-> QuestionInput mapping for the bulk file workflow
// (template generation, bank export, and upload parsing). Pure functions,
// safe to import from both server routes and client components - a
// spreadsheet/CSV/TXT row is always a flat record, so this is the one
// place that knows how to flatten a question into columns and read it
// back, keeping the template, the export and the import parser in sync.

export const TEMPLATE_COLUMNS = [
  "Question",
  "Category",
  "Difficulty",
  "Question Type",
  "Options",
  "Correct Answer",
  "Passage",
  "Expected Answer",
  "Explanation",
  "Scoring Criteria",
  "Time Limit Seconds",
  "Active",
  // P1-G, both OPTIONAL - a file without them (every file made before
  // P1-G) imports exactly as it always did.
  "Item Group",
  "Order In Group",
] as const;

export type TemplateColumn = (typeof TEMPLATE_COLUMNS)[number];

// Maps a lowercased, punctuation-stripped header to a canonical column -
// used for auto-detecting columns in an uploaded file that doesn't use
// our exact header text (e.g. "answer" instead of "Correct Answer").
const HEADER_ALIASES: Record<string, TemplateColumn> = {
  question: "Question",
  prompt: "Question",
  questiontext: "Question",
  category: "Category",
  section: "Category",
  subject: "Category",
  difficulty: "Difficulty",
  level: "Difficulty",
  questiontype: "Question Type",
  type: "Question Type",
  options: "Options",
  choices: "Options",
  answeroptions: "Options",
  correctanswer: "Correct Answer",
  answer: "Correct Answer",
  correct: "Correct Answer",
  passage: "Passage",
  readingpassage: "Passage",
  stimulus: "Passage",
  expectedanswer: "Expected Answer",
  referenceanswer: "Expected Answer",
  explanation: "Explanation",
  rationale: "Explanation",
  scoringcriteria: "Scoring Criteria",
  rubric: "Scoring Criteria",
  timelimitseconds: "Time Limit Seconds",
  timelimit: "Time Limit Seconds",
  seconds: "Time Limit Seconds",
  active: "Active",
  isactive: "Active",
  status: "Active",
  itemgroup: "Item Group",
  itemgroupid: "Item Group",
  group: "Item Group",
  groupid: "Item Group",
  orderingroup: "Order In Group",
  grouporder: "Order In Group",
};

export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function guessColumn(header: string): TemplateColumn | null {
  return HEADER_ALIASES[normalizeHeader(header)] ?? null;
}

export const OPTIONS_DELIMITER = "|";

export interface FlatQuestionRow {
  Question?: string;
  Category?: string;
  Difficulty?: string;
  "Question Type"?: string;
  Options?: string;
  "Correct Answer"?: string;
  Passage?: string;
  "Expected Answer"?: string;
  Explanation?: string;
  "Scoring Criteria"?: string;
  "Time Limit Seconds"?: string | number;
  Active?: string | boolean;
  "Item Group"?: string;
  "Order In Group"?: string | number;
}

export interface ImportableQuestion {
  category: string;
  difficulty: string;
  type: string;
  prompt: string;
  passage?: string | null;
  options?: string[] | null;
  correctAnswer?: string | null;
  expectedAnswer?: string | null;
  explanation?: string | null;
  scoringCriteria?: string | null;
  timeLimitSeconds: number;
  isActive?: boolean;
  itemGroupId?: string | null;
  orderInGroup?: number | null;
}

// Friendly spellings for type names. Anything not listed here still works
// in its canonical form ("Gap Fill" -> "GAP_FILL" via normalizeType).
const TYPE_ALIASES: Record<string, string> = {
  multiplechoice: "MULTIPLE_CHOICE",
  mcq: "MULTIPLE_CHOICE",
  readingcomprehension: "READING_COMPREHENSION",
  listeningcomprehension: "LISTENING_COMPREHENSION",
  shortanswer: "SHORT_ANSWER",
  openended: "SHORT_ANSWER",
  // P1-G: the 12 newer types.
  tfng: "TRUE_FALSE_NOT_GIVEN",
  truefalsenotgiven: "TRUE_FALSE_NOT_GIVEN",
  ynng: "YES_NO_NOT_GIVEN",
  yesnonotgiven: "YES_NO_NOT_GIVEN",
  gapfill: "GAP_FILL",
  fillintheblank: "GAP_FILL",
  fillintheblanks: "GAP_FILL",
  multiselect: "MULTI_SELECT",
  multipleselect: "MULTI_SELECT",
  matching: "MATCHING",
  labelling: "LABELLING",
  labeling: "LABELLING",
  ordering: "ORDERING",
  highlightwords: "HIGHLIGHT_WORDS",
  dictation: "DICTATION",
  numericentry: "NUMERIC_ENTRY",
  numeric: "NUMERIC_ENTRY",
  longwriting: "LONG_WRITING",
  essay: "LONG_WRITING",
  timedspeaking: "TIMED_SPEAKING",
};

const DIFFICULTY_ALIASES: Record<string, string> = {
  beginner: "BEGINNER",
  easy: "BEGINNER",
  intermediate: "INTERMEDIATE",
  medium: "INTERMEDIATE",
  advanced: "ADVANCED",
  hard: "ADVANCED",
  expert: "EXPERT",
};

function normalizeType(raw: string): string {
  const key = normalizeHeader(raw);
  return TYPE_ALIASES[key] ?? raw.trim().toUpperCase().replace(/\s+/g, "_");
}

function normalizeDifficulty(raw: string): string {
  const key = normalizeHeader(raw);
  return DIFFICULTY_ALIASES[key] ?? raw.trim().toUpperCase();
}

// Converts one parsed row (keyed by canonical TemplateColumn names, after
// field mapping has been applied) into the shape the import API expects.
// Never throws - returns a best-effort object; validateQuestionFields on
// the server is the real gate, this just avoids obviously-wrong types.
export function rowToQuestion(row: FlatQuestionRow): ImportableQuestion {
  const optionsRaw = (row["Options"] ?? "").toString().trim();
  const options = optionsRaw
    ? optionsRaw.split(OPTIONS_DELIMITER).map((o) => o.trim()).filter(Boolean)
    : null;

  const timeRaw = row["Time Limit Seconds"];
  const timeLimitSeconds = typeof timeRaw === "number" ? timeRaw : parseInt(String(timeRaw ?? "").trim(), 10);

  const activeRaw = row["Active"];
  const activeStr = typeof activeRaw === "boolean" ? String(activeRaw) : (activeRaw ?? "").toString().trim().toLowerCase();
  // Defaults to false (pending review) unless explicitly marked true/yes/1 -
  // matches every other bulk-import path in this app, which lands new
  // batches disabled rather than immediately live for candidates.
  const isActive = ["true", "yes", "1", "active"].includes(activeStr);

  // P1-G optional columns. A missing/blank Item Group leaves the question
  // standalone (itemGroupId null), exactly like every pre-P1-G import.
  const itemGroupId = (row["Item Group"] ?? "").toString().trim() || null;
  const orderRaw = (row["Order In Group"] ?? "").toString().trim();
  const orderParsed = orderRaw ? parseInt(orderRaw, 10) : NaN;

  return {
    category: (row["Category"] ?? "").toString().trim().toUpperCase().replace(/\s+/g, "_"),
    difficulty: normalizeDifficulty((row["Difficulty"] ?? "").toString()),
    type: normalizeType((row["Question Type"] ?? "").toString()),
    prompt: (row["Question"] ?? "").toString().trim(),
    passage: (row["Passage"] ?? "").toString().trim() || null,
    options,
    correctAnswer: (row["Correct Answer"] ?? "").toString().trim() || null,
    expectedAnswer: (row["Expected Answer"] ?? "").toString().trim() || null,
    explanation: (row["Explanation"] ?? "").toString().trim() || null,
    scoringCriteria: (row["Scoring Criteria"] ?? "").toString().trim() || null,
    timeLimitSeconds: Number.isFinite(timeLimitSeconds) ? timeLimitSeconds : NaN,
    isActive,
    itemGroupId,
    orderInGroup: itemGroupId && Number.isFinite(orderParsed) ? orderParsed : null,
  };
}

export function questionToRow(q: ImportableQuestion & { id?: string }): (string | number)[] {
  return [
    q.prompt,
    q.category,
    q.difficulty,
    q.type,
    q.options ? q.options.join(` ${OPTIONS_DELIMITER} `) : "",
    q.correctAnswer ?? "",
    q.passage ?? "",
    q.expectedAnswer ?? "",
    q.explanation ?? "",
    q.scoringCriteria ?? "",
    q.timeLimitSeconds,
    q.isActive ? "TRUE" : "FALSE",
    q.itemGroupId ?? "",
    q.orderInGroup ?? "",
  ];
}

export const SAMPLE_ROWS: ImportableQuestion[] = [
  {
    category: "GRAMMAR",
    difficulty: "BEGINNER",
    type: "MULTIPLE_CHOICE",
    prompt: 'Complete the sentence: "I eat ___ apple every day."',
    passage: null,
    options: ["much", "a", "an", "any"],
    correctAnswer: "an",
    expectedAnswer: null,
    explanation: 'Use "a" before a consonant sound and "an" before a vowel sound.',
    scoringCriteria: null,
    timeLimitSeconds: 25,
    isActive: false,
  },
  {
    category: "READING_COMPREHENSION",
    difficulty: "INTERMEDIATE",
    type: "READING_COMPREHENSION",
    prompt: "When are the children's lessons?",
    passage: "SWIMMING POOL\nOpen every day 7:00-21:00\nChildren's lessons: Saturday 10:00",
    options: ["Sunday at 10:00", "Saturday at 21:00", "Saturday at 10:00", "Every day at 7:00"],
    correctAnswer: "Saturday at 10:00",
    expectedAnswer: null,
    explanation: "The notice says Saturday 10:00.",
    scoringCriteria: null,
    timeLimitSeconds: 60,
    isActive: false,
  },
  {
    category: "WRITING",
    difficulty: "ADVANCED",
    type: "SHORT_ANSWER",
    prompt: "Write a short email to your manager asking for one day of leave next Friday.",
    passage: null,
    options: null,
    correctAnswer: null,
    expectedAnswer: null,
    explanation: null,
    scoringCriteria: "Assess grammar, clarity, tone and structure appropriate to the task. No fixed answer.",
    timeLimitSeconds: 180,
    isActive: false,
  },
  // P1-G: one of the newer types, showing its JSON correct-answer shape.
  // Newer types are only ever served by the new exam runner, never by
  // today's practice screens.
  {
    category: "READING_COMPREHENSION",
    difficulty: "INTERMEDIATE",
    type: "GAP_FILL",
    prompt: "The pool opens at ___ every day.",
    passage: null,
    options: null,
    correctAnswer: JSON.stringify([["7:00", "7", "seven"]]),
    expectedAnswer: null,
    explanation: "The notice says the pool is open every day from 7:00.",
    scoringCriteria: null,
    timeLimitSeconds: 45,
    isActive: false,
  },
];
