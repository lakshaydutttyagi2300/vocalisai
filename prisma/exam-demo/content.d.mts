// Types for content.mjs, so the TypeScript tests can import it (allowJs is off).

export interface DemoQuestion {
  type: string;
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  scoringCriteria?: string;
  timeLimitSeconds: number;
}

export interface DemoChart {
  title: string;
  categories: string[];
  series: { name: string; values: number[] }[];
}

export interface DemoGroup {
  type: string;
  title: string;
  text?: string;
  transcript?: string;
  script?: [string, string][];
  chart?: DemoChart;
  playLimit?: number;
  questions: DemoQuestion[];
}

export interface DemoPart {
  key: string;
  name: string;
  instructions: string;
  prepSeconds?: number;
  responseSeconds?: number;
  questionCount: number;
  groups?: DemoGroup[];
  questions?: DemoQuestion[];
}

export interface DemoPaper {
  key: string;
  name: string;
  category: string;
  durationSeconds: number;
  navigationMode: string;
  allowReview: boolean;
  instructions: string;
  parts: DemoPart[];
}

export const DEMO_FAMILY_SLUG: string;
export const DEMO_VARIANT_SLUG: string;
export const DEMO_VARIANT_NAME: string;
export const DEMO_SCORE_SCALE: string;
export const DEMO_TEMPLATE_NAME: string;
export const DEMO_DIFFICULTY: string;
export const CHART_LIBRARIES: DemoChart;
export const CHART_TRANSPORT: DemoChart;
export const DEMO_PAPERS: DemoPaper[];
