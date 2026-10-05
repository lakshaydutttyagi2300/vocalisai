// Every app page hero in one place: its words, buttons, layout and media.
// The pictures themselves live in src/config/mediaLibrary.ts, where each scene
// has exactly one placement on the whole site. Product demos (type "demo") are
// drawn in the browser by src/components/ui/HeroDemo.tsx. Pages built from a
// template (each company test, skill area and practice mode) show a preview of
// their own content instead of a photo (src/components/ui/ContentPreview.tsx).

import { placed, PLACEMENTS, type PlacementKey, type SceneName } from "@/config/mediaLibrary";

export type HeroDemoName = "dashboard" | "companyTests" | "examRoom";

export type HeroMediaItem =
  | { type: "video" | "image"; src: string; alt: string; scene: SceneName }
  | { type: "demo"; demo: HeroDemoName; alt: string };

export interface HeroConfig {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta?: { label: string; href: string };
  secondary?: { label: string; href: string };
  variant: "full-bleed" | "split";
  size: "lg" | "md" | "sm";
  media: HeroMediaItem[];
}

const demo = (name: HeroDemoName, alt: string): HeroMediaItem => ({ type: "demo", demo: name, alt });

export type HeroKey =
  | "dashboard"
  | "practice"
  | "explore"
  | "exploreSkills"
  | "mockTests"
  | "mockHistory"
  | "speechAnalysis"
  | "progress"
  | "performance"
  | "coach"
  | "goal"
  | "goalChoose"
  | "skills"
  | "bookmarks"
  | "testHistory"
  | "account"
  | "billing";

export const HEROES: Record<HeroKey, HeroConfig> = {
  dashboard: {
    eyebrow: "Your dashboard",
    title: "Welcome back",
    subtitle: "Pick up where you left off: your goal, your next step and how you're doing.",
    cta: { label: "Continue practice", href: "/practice" },
    secondary: { label: "Open my plan", href: "/goal" },
    variant: "full-bleed",
    size: "lg",
    media: [...placed("app.dashboard"), demo("dashboard", "Example of a daily practice plan")],
  },
  practice: {
    eyebrow: "Practice library",
    title: "Practise one skill at a time",
    subtitle: "Grammar, speaking, aptitude, interviews and workplace communication, from Beginner to Expert.",
    cta: { label: "Quick practice", href: "/practice/quick" },
    secondary: { label: "Explore exams", href: "/explore" },
    variant: "split",
    size: "md",
    media: placed("app.practice"),
  },
  explore: {
    eyebrow: "Explore",
    title: "Prepare for company assessments, interviews and workplace skills",
    subtitle: "Start from the test you're facing, or from the skill you want to improve. Both lead to the same questions, at Beginner to Expert level.",
    variant: "full-bleed",
    size: "lg",
    media: placed("app.explore"),
  },
  exploreSkills: {
    eyebrow: "Practice by skill",
    title: "Work on the skill, whichever test you face",
    subtitle: "Quantitative aptitude, reasoning, English and workplace judgement, one skill at a time.",
    variant: "split",
    size: "md",
    media: placed("app.exploreSkills"),
  },
  mockTests: {
    eyebrow: "Proctored mock exams",
    title: "Prepare for your assessment",
    subtitle: "Timed sections, a fixed question order and a camera check, just like the real test.",
    variant: "full-bleed",
    size: "md",
    media: [...placed("app.mockTests"), demo("examRoom", "Example of a timed exam section")],
  },
  mockHistory: {
    eyebrow: "Mock exams",
    title: "Your results",
    subtitle: "Every mock exam you've taken, with its score and report.",
    variant: "split",
    size: "sm",
    media: placed("app.mockHistory"),
  },
  speechAnalysis: {
    eyebrow: "Speech analysis",
    title: "Hear how you really sound",
    subtitle: "Every recording rated on pronunciation, fluency, grammar, vocabulary, pace and delivery.",
    cta: { label: "Record your answer", href: "/practice/speaking" },
    variant: "full-bleed",
    size: "md",
    media: placed("app.speechAnalysis"),
  },
  progress: {
    eyebrow: "Progress",
    title: "Steady progress, measured",
    subtitle: "Your real history across mock tests and practice. Nothing here is estimated or inferred.",
    variant: "split",
    size: "md",
    media: placed("app.progress"),
  },
  performance: {
    eyebrow: "Performance",
    title: "Accuracy and speed, skill by skill",
    subtitle: "How you're doing in each subject, skill and level of your practice tests.",
    variant: "split",
    size: "sm",
    media: placed("app.performance"),
  },
  coach: {
    eyebrow: "AI coach",
    title: "Advice from your own results",
    subtitle: "Ask about your performance and get practical next steps based on your real practice history.",
    variant: "split",
    size: "md",
    media: placed("app.coach"),
  },
  goal: {
    eyebrow: "My goal",
    title: "Your plan",
    subtitle: "The skills that matter for your goal, in the order to practise them.",
    variant: "split",
    size: "sm",
    media: placed("app.goal"),
  },
  goalChoose: {
    eyebrow: "Your goal",
    title: "What are you preparing for?",
    subtitle: "Pick your goal and we'll build your plan around it.",
    variant: "split",
    size: "sm",
    media: placed("app.goalChoose"),
  },
  skills: {
    eyebrow: "My skills",
    title: "Your strengths and weak spots",
    subtitle: "A rating for every skill, worked out from every answer you give, with quick drills for the weak ones.",
    variant: "split",
    size: "sm",
    media: placed("app.skills"),
  },
  bookmarks: {
    eyebrow: "Bookmarks",
    title: "Questions you saved",
    subtitle: "Revise the questions you bookmarked, or practise them as a test.",
    variant: "split",
    size: "sm",
    media: placed("app.bookmarks"),
  },
  testHistory: {
    eyebrow: "Your tests",
    title: "Test history",
    subtitle: "Every exam practice test, with its score and a full review.",
    variant: "split",
    size: "sm",
    media: placed("app.testHistory"),
  },
  account: {
    eyebrow: "Account",
    title: "Your profile",
    subtitle: "Your details, your password and how VocalisAi looks for you.",
    variant: "split",
    size: "sm",
    media: placed("app.account"),
  },
  billing: {
    eyebrow: "Account",
    title: "Plan & billing",
    subtitle: "Your plan and what you've used this period.",
    variant: "split",
    size: "sm",
    media: placed("app.billing"),
  },
};

/** A catalogue category's hero media: its own scenes (the company category adds a product demo). */
export function categoryMedia(slug: string): HeroMediaItem[] {
  const key = `app.category.${slug}` as PlacementKey;
  const own: HeroMediaItem[] = key in PLACEMENTS ? placed(key) : [];
  return slug === "company-hiring-assessments" ? [...own, demo("companyTests", "Example list of company tests")] : own;
}
