// Shared words for the cinematic pages. Their pictures come from
// src/config/mediaLibrary.ts, where each section has its own scene (the home
// page's use-case cards and the Use cases page show different footage). The
// people in them are stock footage, never presented as our users.

export interface UseCase {
  id: "campus-placements" | "company-assessments" | "interviews" | "customer-service" | "professionals" | "spoken-english";
  title: string;
  text: string;
  href: string;
  cta: string;
}

export const USE_CASES: UseCase[] = [
  {
    id: "campus-placements",
    title: "Campus placements",
    text: "Freshers preparing for placement season: aptitude, reasoning and English, then interview practice to finish.",
    href: "/explore/company-hiring-assessments",
    cta: "Explore company tests",
  },
  {
    id: "company-assessments",
    title: "Company assessments",
    text: "AMCAT, eLitmus, TCS NQT, Infosys, Accenture and more, section by section, at the level you need.",
    href: "/explore",
    cta: "Explore exams",
  },
  {
    id: "interviews",
    title: "Job interviews",
    text: "Rehearse the questions you'll be asked with an AI interviewer that replies to what you actually say.",
    href: "/product/interviews",
    cta: "See AI interviews",
  },
  {
    id: "customer-service",
    title: "Customer service & BPO",
    text: "Practise calls with an AI customer and get feedback on clarity, tone, grammar and pace.",
    href: "/product/interviews",
    cta: "See role-play",
  },
  {
    id: "professionals",
    title: "Working professionals",
    text: "Presentations, meetings and workplace English, practised out loud until they feel easy.",
    href: "/product/speaking",
    cta: "See speaking practice",
  },
  {
    id: "spoken-english",
    title: "Everyday spoken English",
    text: "Grammar, vocabulary, pronunciation and conversation practice at your own pace, from Beginner to Expert.",
    href: "/product/personalised",
    cta: "See personalised practice",
  },
];

export const FEATURES: { id: "speak" | "partner" | "listen" | "test"; title: string; text: string }[] = [
  {
    id: "speak",
    title: "Speak and get scored",
    text: "Answer out loud. Feedback on pronunciation, fluency, grammar, vocabulary and pace quotes what you said.",
  },
  {
    id: "partner",
    title: "Talk to an AI partner",
    text: "Interviews, customer calls and everyday conversation with an AI that replies to your actual words.",
  },
  {
    id: "listen",
    title: "Listen and respond",
    text: "Listening and read-aloud practice in natural AI voices and accents, at your level.",
  },
  {
    id: "test",
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
