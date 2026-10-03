// Every page hero in one place: its words, buttons, layout and media.
// Swap media here without touching any component.
//
// Media `src` is a path without extension:
//   video -> <src>-1280.webm / -1280.mp4 (desktop), <src>-640.* (phones),
//            poster <src>.webp (desktop) / <src>-640.webp (phones)
//   image -> <src>.webp (desktop), <src>-800.webp (phones), <src>.jpg (fallback)
// Current files: /public/media/cine (clips) and /public/media/stills (stills),
// all from licensed Pexels footage (docs/MEDIA_SOURCES.md). The shots each
// page would ideally have are listed in MEDIA_TODO.md, with target paths under
// /public/media/heroes/<category>/.

export interface HeroMediaItem {
  type: "video" | "image";
  src: string;
  alt: string;
}

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

const v = (name: string, alt: string): HeroMediaItem => ({ type: "video", src: `/media/cine/${name}`, alt });
const i = (name: string, alt: string): HeroMediaItem => ({ type: "image", src: `/media/stills/${name}`, alt });

// Media sets by theme (2 clips + 1-2 stills each).
export const HERO_MEDIA = {
  speaking: [v("reading-mic", "A woman with headphones reading aloud into a microphone"), v("headphones", "A man with headphones speaking and reading"), i("mic-macro", "A close-up of a studio microphone"), i("presenting", "A professional presenting with a microphone")],
  study: [v("office", "A young professional working at a laptop in a bright office"), v("videocall", "A woman talking on a video call at her laptop"), i("teacher", "A teacher helping a student at a desk"), i("reading-mic", "A woman reading aloud at her desk")],
  company: [v("interviewer", "An interviewer on a laptop screen during a video interview"), v("office", "A young professional working at a laptop in a bright office"), i("meeting", "A laptop showing an online meeting in a bright office"), i("callcentre", "Colleagues working in a modern office")],
  quant: [v("office", "A young professional working at a laptop in a bright office"), v("headphones", "A man studying at his desk"), i("teacher", "A teacher helping a student with written work"), i("office", "Colleagues working through a problem at a laptop")],
  reasoning: [v("teacher", "A teacher helping a student at a desk"), v("meeting", "A laptop showing an online meeting in a bright office"), i("office", "Colleagues working through a problem at a laptop"), i("teacher", "A student working through a problem")],
  english: [v("reading-mic", "A woman with headphones reading aloud into a microphone"), v("videocall", "A woman talking on a video call at her laptop"), i("portrait", "A woman speaking with a warm smile"), i("headphones", "A man with headphones reading and speaking")],
  sjt: [v("meeting", "A laptop showing an online meeting in a bright office"), v("callcentre", "Colleagues working in a modern office"), i("presenting", "A professional presenting to colleagues"), i("office", "Colleagues working together at a laptop")],
  customer: [v("agent", "A customer-service agent listening on a headset"), v("callcentre", "A customer-service agent speaking into a headset"), i("agent", "A customer-service agent smiling on a call"), i("callcentre", "A customer-service team at work")],
  mock: [v("office", "A young professional taking a test at a laptop"), v("headphones", "A candidate with headphones answering at his desk"), i("meeting", "A quiet desk with a laptop"), i("teacher", "A student concentrating on written work")],
  studyAbroad: [v("graduates", "Graduates in caps and gowns smiling together"), v("teacher", "A teacher helping a student at a desk"), i("graduates", "Graduates celebrating together"), i("reading-mic", "A student reading aloud at her desk")],
  progress: [v("graduates", "Graduates in caps and gowns smiling together"), v("office", "A young professional working at a laptop"), i("presenting", "A confident professional presenting"), i("portrait", "A woman smiling with confidence")],
  coach: [v("videocall", "A woman talking on a video call at her laptop"), v("teacher", "A teacher helping a student at a desk"), i("interviewer", "A friendly face on a laptop screen"), i("portrait", "A woman speaking with a warm smile")],
  dashboard: [v("reading-mic", "A woman practising speaking into a microphone"), v("office", "A young professional studying at a laptop"), v("graduates", "Graduates celebrating together"), i("teacher", "A teacher helping a student at a desk")],
  account: [i("portrait", "A woman speaking with a warm smile")],
} satisfies Record<string, HeroMediaItem[]>;

export type HeroKey =
  | "dashboard"
  | "practice"
  | "explore"
  | "exploreSkills"
  | "company"
  | "category"
  | "mockTests"
  | "mockHistory"
  | "speechAnalysis"
  | "progress"
  | "performance"
  | "coach"
  | "goal"
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
    media: HERO_MEDIA.dashboard,
  },
  practice: {
    eyebrow: "Practice library",
    title: "Practise one skill at a time",
    subtitle: "Grammar, speaking, aptitude, interviews and workplace communication, from Beginner to Expert.",
    cta: { label: "Quick practice", href: "/practice/quick" },
    secondary: { label: "Explore exams", href: "/explore" },
    variant: "split",
    size: "md",
    media: HERO_MEDIA.study,
  },
  explore: {
    eyebrow: "Explore",
    title: "Prepare for company assessments, interviews and workplace skills",
    subtitle: "Start from the test you're facing, or from the skill you want to improve. Both lead to the same questions, at Beginner to Expert level.",
    variant: "full-bleed",
    size: "lg",
    media: HERO_MEDIA.company,
  },
  exploreSkills: {
    eyebrow: "Practice by skill",
    title: "Work on the skill, whichever test you face",
    subtitle: "Quantitative aptitude, reasoning, English and workplace judgement, one skill at a time.",
    variant: "split",
    size: "md",
    media: HERO_MEDIA.english,
  },
  company: {
    eyebrow: "Company & hiring assessments",
    title: "Company assessments",
    subtitle: "Practise each test's own sections, skill by skill, at the level that suits you.",
    variant: "full-bleed",
    size: "md",
    media: HERO_MEDIA.company,
  },
  category: {
    eyebrow: "Explore",
    title: "Assessments",
    subtitle: "Choose an assessment to practise its sections, skill by skill.",
    variant: "full-bleed",
    size: "md",
    media: HERO_MEDIA.study,
  },
  mockTests: {
    eyebrow: "Proctored mock exams",
    title: "Prepare for your assessment",
    subtitle: "Timed sections, a fixed question order and a camera check, just like the real test.",
    variant: "full-bleed",
    size: "md",
    media: HERO_MEDIA.mock,
  },
  mockHistory: {
    eyebrow: "Mock exams",
    title: "Your results",
    subtitle: "Every mock exam you've taken, with its score and report.",
    variant: "split",
    size: "sm",
    media: HERO_MEDIA.mock,
  },
  speechAnalysis: {
    eyebrow: "Speech analysis",
    title: "Hear how you really sound",
    subtitle: "Every recording rated on pronunciation, fluency, grammar, vocabulary, pace and delivery.",
    cta: { label: "Record your answer", href: "/practice/speaking" },
    variant: "full-bleed",
    size: "md",
    media: HERO_MEDIA.speaking,
  },
  progress: {
    eyebrow: "Progress",
    title: "Steady progress, measured",
    subtitle: "Your real history across mock tests and practice. Nothing here is estimated or inferred.",
    variant: "split",
    size: "md",
    media: HERO_MEDIA.progress,
  },
  performance: {
    eyebrow: "Performance",
    title: "Accuracy and speed, skill by skill",
    subtitle: "How you're doing in each subject, skill and level of your practice tests.",
    variant: "split",
    size: "sm",
    media: HERO_MEDIA.progress,
  },
  coach: {
    eyebrow: "AI coach",
    title: "Advice from your own results",
    subtitle: "Ask about your performance and get practical next steps based on your real practice history.",
    variant: "split",
    size: "md",
    media: HERO_MEDIA.coach,
  },
  goal: {
    eyebrow: "My goal",
    title: "Your plan",
    subtitle: "The skills that matter for your goal, in the order to practise them.",
    variant: "split",
    size: "sm",
    media: HERO_MEDIA.studyAbroad,
  },
  skills: {
    eyebrow: "My skills",
    title: "Your strengths and weak spots",
    subtitle: "A rating for every skill, worked out from every answer you give, with quick drills for the weak ones.",
    variant: "split",
    size: "sm",
    media: HERO_MEDIA.english,
  },
  bookmarks: {
    eyebrow: "Bookmarks",
    title: "Questions you saved",
    subtitle: "Revise the questions you bookmarked, or practise them as a test.",
    variant: "split",
    size: "sm",
    media: HERO_MEDIA.study,
  },
  testHistory: {
    eyebrow: "Your tests",
    title: "Test history",
    subtitle: "Every exam practice test, with its score and a full review.",
    variant: "split",
    size: "sm",
    media: HERO_MEDIA.mock,
  },
  account: {
    eyebrow: "Account",
    title: "Your profile",
    subtitle: "Your details, your password and how VocalisAi looks for you.",
    variant: "split",
    size: "sm",
    media: HERO_MEDIA.account,
  },
  billing: {
    eyebrow: "Account",
    title: "Plan & billing",
    subtitle: "Your plan and what you've used this period.",
    variant: "split",
    size: "sm",
    media: HERO_MEDIA.account,
  },
};

/** Media for a catalogue subject (skill-first pages and skill sections). */
export function subjectMedia(slug: string): HeroMediaItem[] {
  if (/quant|data-interpretation|accounting|economics|financial|banking|insurance/.test(slug)) return HERO_MEDIA.quant;
  if (/reasoning|critical|abstract|analytical|attention/.test(slug)) return HERO_MEDIA.reasoning;
  if (/situational|business-communication|laws/.test(slug)) return HERO_MEDIA.sjt;
  if (/listening|reading|vocabulary|grammar|verbal/.test(slug)) return HERO_MEDIA.english;
  return HERO_MEDIA.study;
}

/** Media for a practice mode (/practice/[slug]). */
export function practiceModeMedia(slug: string): HeroMediaItem[] {
  if (/numerical|logical|verbal-reasoning/.test(slug)) return slug.startsWith("numerical") ? HERO_MEDIA.quant : HERO_MEDIA.reasoning;
  if (/situational/.test(slug)) return HERO_MEDIA.sjt;
  if (/customer|supervisor/.test(slug)) return HERO_MEDIA.customer;
  if (/speaking|pronunciation|fluency|reading$|interview|conversation/.test(slug)) return HERO_MEDIA.speaking;
  return HERO_MEDIA.english;
}

/** Media for a catalogue category or company page. */
export function categoryMedia(slug: string): HeroMediaItem[] {
  if (slug === "company-hiring-assessments") return HERO_MEDIA.company;
  if (slug === "aptitude-reasoning") return HERO_MEDIA.reasoning;
  if (slug === "english-communication") return HERO_MEDIA.english;
  if (slug === "workplace-assessments") return HERO_MEDIA.sjt;
  if (slug === "career-entrance") return HERO_MEDIA.studyAbroad;
  return HERO_MEDIA.study;
}
