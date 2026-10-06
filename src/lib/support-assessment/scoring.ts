// The Customer Support Assessment's score out of 100, its strengths,
// weaknesses and three priority areas - all computed here, in code, from:
//   - marked answers (multiple choice), typed dictation, and what speech
//     recognition heard (listen and repeat): deterministic;
//   - speech timing (pace, pauses, fillers): deterministic;
//   - the AI's strong/adequate/weak ratings of the spoken answers (one call
//     per test - see gemini-assessment-provider.ts). The AI never gives a number.
// Pronunciation is how much of each sentence was understood correctly, so a
// clear Indian (or any) accent is never marked down for not sounding American
// or British.

import { RATING_SCORE } from "@/lib/scoring-engine";
import type { Rating } from "@/lib/providers/gemini-analysis-provider";
import { COMPONENTS, type ComponentKey, type ItemKind } from "./config";
import { dictationAccuracy, wordAccuracy } from "./text-match";

export interface SpeechFacts {
  transcript: string;
  wordCount: number;
  /** From the first to the last word heard - silence before speaking doesn't count. */
  speakingSeconds: number;
  fillerCount: number;
  repetitionCount: number;
  longPauseCount: number;
}

export interface ItemFacts {
  questionId: string;
  kind: ItemKind;
  /** Rating unit: the question itself, or the role-play call (item group) it belongs to. */
  unitId: string;
  correct?: boolean | null; // multiple choice
  typed?: string | null; // dictation
  expected?: string | null; // the sentence to repeat / the dictation answer
  speech?: SpeechFacts | null; // null = not answered
}

export const DIMENSIONS = {
  retell: ["content", "organisation", "language"],
  "fast-speaking": ["relevance", "organisation", "language"],
  roleplay: ["empathy", "professionalism", "problemSolving", "clarity"],
} as const;
export type RatedKind = keyof typeof DIMENSIONS;
export type Dimension = (typeof DIMENSIONS)[RatedKind][number];
export type UnitRatings = Partial<Record<Dimension, Rating>>;

/** Fewer words than this is "no real answer": scored 0 and never sent to the AI. */
export const MIN_WORDS = 5;

export function isRatedKind(kind: ItemKind): kind is RatedKind {
  return kind in DIMENSIONS;
}

/** True when a rating unit (a retell, a fast answer, a whole call) has enough speech to rate. */
export function unitHasSpeech(items: ItemFacts[]): boolean {
  return items.reduce((n, i) => n + (i.speech?.wordCount ?? 0), 0) >= MIN_WORDS;
}

// --- Fluency, from timing alone -------------------------------------------

function paceScore(wpm: number): number {
  if (wpm < 80) return 40;
  if (wpm < 100) return 65;
  if (wpm <= 170) return 100;
  if (wpm <= 190) return 80;
  return 60;
}

function per100(count: number, words: number) {
  return (count / words) * 100;
}

/** 0..100 for one spoken answer. */
export function fluencyScore(s: SpeechFacts | null | undefined): number {
  if (!s || s.wordCount < MIN_WORDS || s.speakingSeconds <= 0) return 0;
  const wpm = (s.wordCount / s.speakingSeconds) * 60;
  const fillers = per100(s.fillerCount, s.wordCount);
  const pausesPerMinute = (s.longPauseCount / s.speakingSeconds) * 60;
  const repeats = per100(s.repetitionCount, s.wordCount);
  const fillerScore = fillers === 0 ? 100 : fillers <= 3 ? 85 : fillers <= 6 ? 65 : 40;
  const pauseScore = pausesPerMinute === 0 ? 100 : pausesPerMinute <= 1 ? 80 : pausesPerMinute <= 2.5 ? 60 : 40;
  const repeatScore = repeats <= 1 ? 100 : repeats <= 3 ? 80 : 60;
  return 0.4 * paceScore(wpm) + 0.25 * pauseScore + 0.2 * fillerScore + 0.15 * repeatScore;
}

// --- The result -------------------------------------------------------------

export interface ComponentResult {
  key: ComponentKey;
  label: string;
  points: number; // whole points, out of max
  max: number;
}

export interface PriorityArea {
  label: string;
  tip: string;
  href: string;
}

export interface SupportResult {
  /** Null while spoken answers are still waiting for their AI ratings. */
  overall: number | null;
  components: (ComponentResult & { pending: boolean })[];
  strengths: string[];
  weaknesses: string[];
  priorities: PriorityArea[];
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function ratingFraction(r: UnitRatings | undefined, dims: readonly Dimension[]): number | null {
  if (!r) return null;
  const scores = dims.map((d) => r[d]).filter((x): x is Rating => !!x).map((x) => RATING_SCORE[x]);
  return scores.length === dims.length ? mean(scores)! / 100 : null;
}

const STRENGTH_TEXT: Record<ComponentKey, string> = {
  listening: "You followed US and UK callers well, including names, numbers and what happened.",
  speaking: "Your spoken answers were relevant and well organised.",
  pronunciation: "You were easy to understand when repeating sentences.",
  fluency: "You spoke at a steady pace with few hesitations.",
  grammarVocabulary: "Your workplace grammar and vocabulary are accurate.",
  customerHandling: "You handled the customers calmly, politely and with a clear solution.",
};
const WEAKNESS_TEXT: Record<ComponentKey, string> = {
  listening: "You missed key details in the calls (names, numbers, dates or the outcome).",
  speaking: "Your spoken answers missed points or were hard to follow.",
  pronunciation: "Some words in the repeated sentences were not understood clearly.",
  fluency: "Your speech had long pauses, filler words or an uneven pace.",
  grammarVocabulary: "Several grammar and vocabulary questions were wrong.",
  customerHandling: "The role-play calls needed more empathy, ownership or a clear next step.",
};

interface SubSkill extends PriorityArea {
  value: number | null;
}

/**
 * Turns per-item facts and the AI's ratings (keyed by rating unit) into the
 * final result. Unanswered items count as 0 - a real test gives no marks for
 * a blank.
 */
export function computeSupportResult(items: ItemFacts[], ratings: Record<string, UnitRatings>): SupportResult {
  const of = (...kinds: ItemKind[]) => items.filter((i) => kinds.includes(i.kind));
  const correct = (i: ItemFacts) => (i.correct ? 1 : 0);

  // Rating units: one per retell / fast answer, one per role-play call.
  const units = new Map<string, ItemFacts[]>();
  for (const i of items) if (isRatedKind(i.kind)) units.set(i.unitId, [...(units.get(i.unitId) ?? []), i]);
  const unitScore = (unitItems: ItemFacts[], dims: readonly Dimension[]): number | null =>
    unitHasSpeech(unitItems) ? ratingFraction(ratings[unitItems[0].unitId], dims) : 0;
  const unitScores = (kind: RatedKind, dims: readonly Dimension[] = DIMENSIONS[kind]) =>
    [...units.values()].filter((u) => u[0].kind === kind).map((u) => unitScore(u, dims));
  const settled = (xs: (number | null)[]) => (xs.some((x) => x === null) ? null : mean(xs as number[]));

  const listeningItems = [
    ...of("us-listening", "uk-listening", "call-understanding").map(correct),
    ...of("dictation").map((i) => dictationAccuracy(i.expected ?? "", i.typed ?? "")),
  ];
  const repeat = of("repeat").map((i) => (i.speech && i.speech.wordCount > 0 ? wordAccuracy(i.expected ?? "", i.speech.transcript) : 0));
  const freeSpeech = of("retell", "fast-speaking", "roleplay").map((i) => fluencyScore(i.speech) / 100);
  const speakingUnits = [...unitScores("retell"), ...unitScores("fast-speaking")];
  const roleplayUnits = unitScores("roleplay");
  const waiting = (xs: (number | null)[]) => xs.some((x) => x === null);
  const roleplay = mean(roleplayUnits as number[]);
  const callAction = mean(of("call-action").map(correct));
  const handling =
    roleplay === null ? (callAction ?? 0) : callAction === null ? roleplay : 0.75 * roleplay + 0.25 * callAction;

  // null = still waiting for the AI's ratings of the spoken answers.
  const fractions: Record<ComponentKey, number | null> = {
    listening: mean(listeningItems) ?? 0,
    speaking: waiting(speakingUnits) ? null : (mean(speakingUnits as number[]) ?? 0),
    pronunciation: mean(repeat) ?? 0,
    fluency: mean(freeSpeech) ?? 0,
    grammarVocabulary: mean(of("grammar").map(correct)) ?? 0,
    customerHandling: waiting(roleplayUnits) ? null : handling,
  };

  const components = COMPONENTS.map((c) => {
    const f = fractions[c.key];
    return { key: c.key, label: c.label, max: c.points, points: f === null ? 0 : Math.round(f * c.points), pending: f === null };
  });
  const pending = components.some((c) => c.pending);
  const ranked = components.filter((c) => !c.pending).map((c) => ({ ...c, f: c.points / c.max }));

  // Narrower skills, for the three things to practise first.
  const pct = (x: number | null | undefined) => (x === null || x === undefined ? null : Math.round(x * 100));
  const roleplayDim = (...dims: Dimension[]) => settled(unitScores("roleplay", dims));
  const sub: SubSkill[] = [
    { label: "US accent calls", value: pct(mean(of("us-listening").map(correct))), tip: "Listen to short US customer calls and note the name, number, problem and outcome.", href: "/practice/listening" },
    { label: "UK accent calls", value: pct(mean(of("uk-listening").map(correct))), tip: "Listen to short UK customer calls and note the name, number, problem and outcome.", href: "/practice/listening" },
    { label: "Names, numbers and reference codes", value: pct(mean(of("dictation").map((i) => dictationAccuracy(i.expected ?? "", i.typed ?? "")))), tip: "Write down order numbers, dates and spellings exactly as you hear them.", href: "/practice/listening" },
    { label: "Understanding the customer's problem", value: pct(mean(of("call-understanding").map(correct))), tip: "After each call, say in one sentence what happened and what the customer wants.", href: "/practice/listening" },
    { label: "Choosing the right next step", value: pct(callAction), tip: "Decide the agent's next action before looking at the options: own it, fix it, confirm it.", href: "/practice/situational-judgement" },
    { label: "Workplace grammar and vocabulary", value: pct(fractions.grammarVocabulary), tip: "Practise tenses, prepositions and polite call phrases such as 'I'll look into that for you'.", href: "/practice/grammar" },
    { label: "Clear pronunciation", value: pct(fractions.pronunciation), tip: "Repeat short sentences aloud, finish every word ending and stress the key words.", href: "/practice/pronunciation" },
    { label: "Smooth, steady speech", value: pct(fractions.fluency), tip: "Speak for 40 seconds without stopping; use a short pause instead of 'um'.", href: "/practice/fluency" },
    { label: "Retelling the key details", value: pct(settled(unitScores("retell"))), tip: "Retell short stories in order: who, what happened, what was done, the result.", href: "/practice/speaking" },
    { label: "Answering clearly and to the point", value: pct(settled(unitScores("fast-speaking"))), tip: "Answer in three parts: your main point, one reason or example, a short close.", href: "/practice/speaking" },
    { label: "Calming upset customers", value: pct(roleplayDim("empathy")), tip: "Start with an apology and the customer's own words: 'I'm sorry you've been charged twice'.", href: "/practice/customer-service" },
    { label: "Solving the customer's problem", value: pct(roleplayDim("problemSolving")), tip: "Always end with what you will do, by when, and what the customer will see.", href: "/practice/customer-service" },
    { label: "Professional, clear call language", value: pct(roleplayDim("professionalism", "clarity")), tip: "Use short sentences and polite phrases; confirm details back to the customer.", href: "/practice/conversation" },
  ];
  const known = sub.filter((s): s is SubSkill & { value: number } => s.value !== null).sort((a, b) => a.value - b.value);

  return {
    overall: pending ? null : components.reduce((n, c) => n + c.points, 0),
    components,
    strengths: ranked.filter((c) => c.f >= 0.75).sort((a, b) => b.f - a.f).slice(0, 2).map((c) => STRENGTH_TEXT[c.key]),
    weaknesses: ranked.filter((c) => c.f < 0.6).sort((a, b) => a.f - b.f).slice(0, 2).map((c) => WEAKNESS_TEXT[c.key]),
    priorities: pending ? [] : known.slice(0, 3).map(({ label, tip, href }) => ({ label, tip, href })),
  };
}

/** One plain sentence for the overall score. */
export function verdict(overall: number): string {
  if (overall >= 80) return "Ready for most customer support and voice-process roles.";
  if (overall >= 65) return "Nearly ready: fix the priority areas below before your interview.";
  if (overall >= 50) return "Developing: practise the priority areas below, then take the test again.";
  return "Build the basics first: start with the priority areas below.";
}
