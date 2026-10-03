// Shared words and pictures for the cinematic pages. Every clip is chosen to
// show what VocalisAi does (docs/MEDIA_SOURCES.md); the people in them are
// stock footage, never presented as our users.

export interface UseCase {
  id: string;
  clip: string;
  alt: string;
  title: string;
  text: string;
  href: string;
  cta: string;
}

export const USE_CASES: UseCase[] = [
  {
    id: "campus-placements",
    clip: "graduates",
    alt: "Graduates in caps and gowns smiling together",
    title: "Campus placements",
    text: "Freshers preparing for placement season: aptitude, reasoning and English, then interview practice to finish.",
    href: "/explore/company-hiring-assessments",
    cta: "Explore company tests",
  },
  {
    id: "company-assessments",
    clip: "office",
    alt: "A young professional working at a laptop in a bright office",
    title: "Company assessments",
    text: "AMCAT, eLitmus, TCS NQT, Infosys, Accenture and more, section by section, at the level you need.",
    href: "/explore",
    cta: "Explore exams",
  },
  {
    id: "interviews",
    clip: "interviewer",
    alt: "An interviewer on a laptop screen during a video interview",
    title: "Job interviews",
    text: "Rehearse the questions you'll be asked with an AI interviewer that replies to what you actually say.",
    href: "/product/interviews",
    cta: "See AI interviews",
  },
  {
    id: "customer-service",
    clip: "callcentre",
    alt: "A customer-service agent speaking into a headset",
    title: "Customer service & BPO",
    text: "Practise calls with an AI customer and get feedback on clarity, tone, grammar and pace.",
    href: "/product/interviews",
    cta: "See role-play",
  },
  {
    id: "professionals",
    clip: "presenting",
    alt: "A professional presenting with a microphone",
    title: "Working professionals",
    text: "Presentations, meetings and workplace English, practised out loud until they feel easy.",
    href: "/product/speaking",
    cta: "See speaking practice",
  },
  {
    id: "spoken-english",
    clip: "portrait",
    alt: "A woman speaking to the camera with a warm smile",
    title: "Everyday spoken English",
    text: "Grammar, vocabulary, pronunciation and conversation practice at your own pace, from Beginner to Expert.",
    href: "/product/personalised",
    cta: "See personalised practice",
  },
];

export const FEATURES = [
  {
    clip: "reading-mic",
    alt: "A woman with headphones reading aloud into a microphone",
    title: "Speak and get scored",
    text: "Answer out loud. Feedback on pronunciation, fluency, grammar, vocabulary and pace quotes what you said.",
  },
  {
    clip: "videocall",
    alt: "A woman talking on a video call at her laptop",
    title: "Talk to an AI partner",
    text: "Interviews, customer calls and everyday conversation with an AI that replies to your actual words.",
  },
  {
    clip: "headphones",
    alt: "A man with headphones reading and speaking at his desk",
    title: "Listen and respond",
    text: "Listening and read-aloud practice in natural AI voices and accents, at your level.",
  },
  {
    clip: "meeting",
    alt: "A laptop on a desk showing a man in an online meeting",
    title: "Test under real conditions",
    text: "Timed, camera-checked mock tests for company assessments and English exams.",
  },
];

export const SPEECH_DIMENSIONS: [string, string][] = [
  ["Pronunciation", "Words you mispronounced, with a simple sound-it-out hint"],
  ["Fluency", "Hesitations, fillers, repetitions and long pauses"],
  ["Grammar", "Quoted from your transcript, each with the correction"],
  ["Vocabulary", "Word choice, professional terms and repetition"],
  ["Pace", "Words per minute, measured rather than guessed"],
  ["Delivery", "Clarity, confidence and whether you answered the question"],
];

export interface Lesson {
  topic: string;
  title: string;
  body: string;
}

// Micro-lessons written for VocalisAi (docs/MEDIA_SOURCES.md).
export const LESSONS: Lesson[] = [
  { topic: "Fluency", title: "Swap the filler for a pause", body: "Half a second of silence sounds more confident than “um” or “like”. Your analysis counts fillers, so you can watch the number fall." },
  { topic: "Speaking", title: "Answer, give one reason, add one example", body: "Interviewers and examiners listen for shape before vocabulary. Three short parts beat one long ramble." },
  { topic: "Pronunciation", title: "Stress the words that carry the meaning", body: "In “I can help you with that today”, lean on help and today. Flat stress makes clear English sound unsure." },
  { topic: "Grammar", title: "“Will” takes the base verb", body: "“I will help you”, not “I will helping you”. A small slip that stands out in a spoken assessment." },
  { topic: "Listening", title: "Read the question before the audio starts", body: "Use the preview time to decide what you are listening for: a number, a name, a reason. Then listen only for that." },
  { topic: "Interviews", title: "Use STAR for “tell me about a time”", body: "Situation, Task, Action, Result, in about a minute. Spend most of it on what you did." },
  { topic: "Exam strategy", title: "In a timed paper, flag it and move on", body: "A question you can't crack in its time is costing you two you could answer. Mark it, keep going, come back." },
];
