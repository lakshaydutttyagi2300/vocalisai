// Types for content.mjs so TypeScript tests can import it (allowJs is off).

/** [category, difficulty, questionCount] */
export type LibrarySection = [string, string, number];

export interface LibraryPart {
  name: string;
  sections: LibrarySection[];
  speaking?: { prep: number; response: number };
}

export interface LibraryPaper {
  name: string;
  minutes: number;
  navigation: string;
  review: boolean;
  instructions: string | null;
  parts: LibraryPart[];
}

export interface LibraryExam {
  slug: string;
  name: string;
  scale: string;
  description: string;
  papers: LibraryPaper[];
}

export interface LibraryFamily {
  slug: string;
  name: string;
  description: string;
  exams: LibraryExam[];
}

export const EXAM_LIBRARY: LibraryFamily[];
export const GENERAL_ENGLISH_ASSESSMENT: { name: string; sections: LibrarySection[] };
