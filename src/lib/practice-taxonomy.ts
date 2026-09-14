// Single source of truth for practice categories/difficulties. SQLite can't
// enforce these as a native enum, so every place that reads or writes a
// PracticeQuestion/PracticeAttempt validates against this list instead.

export const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "READING_COMPREHENSION"
  | "LISTENING_COMPREHENSION"
  | "SHORT_ANSWER";

export interface PracticeModeDef {
  slug: string;
  category: string;
  label: string;
  description: string;
  questionType: QuestionType;
  /** Modes that need real audio recording/analysis, not available until Phase 5 (camera/mic) and Phase 8 (AI analysis). */
  requiresVoice: boolean;
}

export const PRACTICE_MODES: PracticeModeDef[] = [
  {
    slug: "grammar",
    category: "GRAMMAR",
    label: "Grammar",
    description: "Subject-verb agreement, tenses, articles and prepositions.",
    questionType: "MULTIPLE_CHOICE",
    requiresVoice: false,
  },
  {
    slug: "vocabulary",
    category: "VOCABULARY",
    label: "Vocabulary",
    description: "Workplace and customer-service vocabulary, meaning and usage.",
    questionType: "MULTIPLE_CHOICE",
    requiresVoice: false,
  },
  {
    slug: "reading-comprehension",
    category: "READING_COMPREHENSION",
    label: "Reading Comprehension",
    description: "Read a short passage silently and answer comprehension questions.",
    questionType: "READING_COMPREHENSION",
    requiresVoice: false,
  },
  {
    slug: "listening",
    category: "LISTENING",
    label: "Listening",
    description: "Listen to a short passage read aloud, then answer questions about it.",
    questionType: "LISTENING_COMPREHENSION",
    requiresVoice: false,
  },
  {
    slug: "situational-judgement",
    category: "SITUATIONAL_JUDGEMENT",
    label: "Situational Judgement",
    description: "Realistic BPO workplace scenarios - choose the best course of action.",
    questionType: "MULTIPLE_CHOICE",
    requiresVoice: false,
  },
  {
    slug: "interview",
    category: "INTERVIEW",
    label: "Interview Questions",
    description: "Practice written responses to common BPO interview questions.",
    questionType: "SHORT_ANSWER",
    requiresVoice: false,
  },
  {
    slug: "reading",
    category: "READING",
    label: "Reading",
    description: "Read passages aloud, scored on pronunciation, pace and clarity.",
    questionType: "SHORT_ANSWER",
    requiresVoice: true,
  },
  {
    slug: "pronunciation",
    category: "PRONUNCIATION",
    label: "Pronunciation",
    description: "Words and sentences that are commonly mispronounced.",
    questionType: "SHORT_ANSWER",
    requiresVoice: true,
  },
  {
    slug: "fluency",
    category: "FLUENCY",
    label: "Fluency",
    description: "Controlled speaking exercises to reduce hesitation and fillers.",
    questionType: "SHORT_ANSWER",
    requiresVoice: true,
  },
  {
    slug: "speaking",
    category: "SPEAKING",
    label: "Speaking",
    description: "Spontaneous spoken responses to open prompts.",
    questionType: "SHORT_ANSWER",
    requiresVoice: true,
  },
  {
    slug: "customer-service",
    category: "CUSTOMER_SERVICE",
    label: "Customer-Service Roleplay",
    description: "Realistic customer situations - refunds, complaints, escalations.",
    questionType: "SHORT_ANSWER",
    requiresVoice: true,
  },
];

export function getModeBySlug(slug: string): PracticeModeDef | undefined {
  return PRACTICE_MODES.find((m) => m.slug === slug);
}

export function getModeByCategory(category: string): PracticeModeDef | undefined {
  return PRACTICE_MODES.find((m) => m.category === category);
}

export function isVoiceCategory(category: string): boolean {
  return getModeByCategory(category)?.requiresVoice ?? false;
}

export function isValidDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}
