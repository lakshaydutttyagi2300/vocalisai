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
    id: "interviews",
    title: "Job interviews",
    text: "Rehearse self-introductions, strengths and weaknesses, and behavioural questions with an AI interviewer that asks follow-ups.",
    href: "/product/interviews",
    cta: "Explore interview practice",
  },
  {
    id: "spoken-english",
    title: "Spoken English and fluency",
    text: "Practise speaking at your own level, from Beginner to Expert, with fewer pauses and clearer sentences each week.",
    href: "/product/speaking",
    cta: "See speaking practice",
  },
  {
    id: "professionals",
    title: "Working professionals",
    text: "Meeting updates, explaining ideas and conversations with your manager, practised out loud until they feel easy.",
    href: "/product/interviews",
    cta: "See workplace role-play",
  },
  {
    id: "campus-placements",
    title: "Students and freshers",
    text: "Get ready for placement season: aptitude, reasoning and English practice, then interview rehearsal to finish.",
    href: "/explore/company-hiring-assessments",
    cta: "Explore placement practice",
  },
  {
    id: "company-assessments",
    title: "Aptitude and hiring tests",
    text: "AMCAT, eLitmus, TCS NQT, Infosys, Accenture and more, section by section, at the level you need.",
    href: "/explore",
    cta: "Explore exams",
  },
  {
    id: "customer-service",
    title: "Customer conversations",
    text: "For customer-facing roles: practise calm, clear answers to questions and complaints with an AI customer.",
    href: "/product/interviews",
    cta: "See role-play",
  },
];

export const FEATURES: { id: "speak" | "partner" | "listen" | "test"; title: string; text: string }[] = [
  {
    id: "speak",
    title: "Spoken English practice",
    text: "Answer out loud and get feedback on pronunciation, fluency, grammar, vocabulary and pace, with your own words quoted.",
  },
  {
    id: "partner",
    title: "AI interview coach",
    text: "Practise interview questions with an AI interviewer that listens to your answer and asks the follow-up a real panel might.",
  },
  {
    id: "listen",
    title: "Listening and fluency",
    text: "Listen to natural voices and accents, read aloud and answer, so speaking feels smoother and less hesitant.",
  },
  {
    id: "test",
    title: "Mock tests and hiring practice",
    text: "Timed, camera-checked mock tests for aptitude rounds and English assessments, with a score report at the end.",
  },
];

/** Worries people bring to practice, and how practising here helps (home page). */
export const CONFIDENCE: { worry: string; help: string }[] = [
  { worry: "“I go blank in interviews.”", help: "Rehearse common questions until your answers have a shape: your point, a reason, an example." },
  { worry: "“I get nervous speaking English.”", help: "Practise on your own, at your level, as often as your plan allows. No audience in the room." },
  { worry: "“I can’t explain my ideas clearly.”", help: "Your feedback shows where an answer wandered and what to say first next time." },
  { worry: "“I’m afraid of making mistakes.”", help: "Mistakes stay in practice. Each one comes back with the correction beside it." },
  { worry: "“Introducing myself feels awkward.”", help: "Practise “Tell me about yourself” until it sounds like you rather than a script." },
  { worry: "“Unexpected questions throw me.”", help: "The AI interviewer asks follow-ups based on what you said, so you learn to think on your feet." },
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
  { topic: "Grammar", title: "“Will” takes the base verb", body: "“I will help you”, not “I will helping you”. A small slip that stands out when you speak." },
  { topic: "Listening", title: "Read the question before the audio starts", body: "Use the preview time to decide what you are listening for: a number, a name, a reason. Then listen only for that." },
  { topic: "Interviews", title: "Use STAR for “tell me about a time”", body: "Situation, Task, Action, Result, in about a minute. Spend most of it on what you did." },
  { topic: "Exam strategy", title: "In a timed paper, flag it and move on", body: "A question you can't crack in its time is costing you two you could answer. Mark it, keep going, come back." },
];
