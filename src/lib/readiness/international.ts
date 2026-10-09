// International Process Readiness: one 0-100 score for international voice,
// chat and email roles, built from evidence the candidate already has - the
// Customer Support English Assessment (a timed test like a hiring round) and
// skill mastery from practice. No AI, no new tests: an explainable weighted
// average over the areas these hiring rounds check. It is VocalisAi's own
// practice estimate, never an official Versant, SVAR or employer score.
//
// No imports on purpose, so the page and tests can share it; the database
// loader lives in ./international-loader.ts.

export interface ReadinessArea {
  key: string;
  label: string;
  /** Share of the overall score (all areas add up to 100). */
  weight: number;
  /** Skill-mastery nodes that measure this area from practice. */
  skillIds: readonly string[];
  /** The Customer Support English Assessment component that measures it, if any. */
  component: string | null;
  practice: { href: string; label: string };
}

export const READINESS_AREAS: readonly ReadinessArea[] = [
  { key: "listening", label: "Listening", weight: 20, skillIds: ["ENG.LST"], component: "listening", practice: { href: "/explore/skills/listening", label: "Listening practice" } },
  { key: "pronunciation", label: "Pronunciation and clarity", weight: 15, skillIds: ["SPK.PRN"], component: "pronunciation", practice: { href: "/practice/pronunciation", label: "Pronunciation practice" } },
  { key: "fluency", label: "Fluency", weight: 10, skillIds: ["SPK.FLU"], component: "fluency", practice: { href: "/practice/fluency", label: "Fluency practice" } },
  { key: "customerHandling", label: "Customer handling", weight: 15, skillIds: ["CSV"], component: "customerHandling", practice: { href: "/practice/customer-service", label: "Customer-service role-play" } },
  { key: "speaking", label: "Spoken answers", weight: 10, skillIds: ["SPK.SPN"], component: "speaking", practice: { href: "/practice/speaking", label: "Speaking practice" } },
  { key: "grammarVocabulary", label: "Grammar and vocabulary", weight: 10, skillIds: ["ENG.GRM", "ENG.VOC"], component: "grammarVocabulary", practice: { href: "/practice/grammar", label: "Grammar practice" } },
  { key: "writing", label: "Written English (emails and chats)", weight: 10, skillIds: ["ENG.WRT"], component: null, practice: { href: "/practice/email", label: "Email writing" } },
  { key: "judgement", label: "Workplace judgement", weight: 5, skillIds: ["SJT"], component: null, practice: { href: "/explore/skills/situational-judgement", label: "Workplace judgement practice" } },
  { key: "typing", label: "Typing speed and accuracy", weight: 5, skillIds: [], component: null, practice: { href: "/practice/typing", label: "Typing test" } },
];

/** An assessment result counts for this long; after that, practice decides again. */
export const ASSESSMENT_FRESH_DAYS = 90;
/** The overall score shows once areas worth this much of the 100 have a score. */
export const MIN_COVERAGE = 60;

export interface AssessmentEvidence {
  completedAt: Date;
  /** Component key -> points and maximum (e.g. listening 19 of 25). */
  components: Record<string, { points: number; max: number }>;
}

export interface MasteryEvidence {
  score: number;
  /** "UNRATED" until there are enough answers to trust the score. */
  band: string;
  attempts: number;
}

/** The candidate's recent typing tests: the average of their latest few, already 0-100. */
export interface TypingEvidence {
  score: number;
  tests: number;
}

/** The candidate's recent AI-marked email replies: the average of their latest few, 0-100. */
export interface EmailEvidence {
  score: number;
  emails: number;
}

/** The candidate's recent marked chat simulations: the average of their latest few, 0-100. */
export interface ChatEvidence {
  score: number;
  chats: number;
}

/** Evidence from the dedicated practice tools; each is null until the candidate has used it. */
export interface ToolEvidence {
  typing?: TypingEvidence | null;
  email?: EmailEvidence | null;
  chat?: ChatEvidence | null;
}

export type AreaSource =
  | { kind: "assessment"; at: Date }
  | { kind: "practice"; attempts: number }
  | { kind: "typing"; tests: number }
  | { kind: "email"; emails: number }
  | { kind: "chat"; chats: number };

export interface AreaResult extends ReadinessArea {
  score: number | null;
  source: AreaSource | null;
}

export interface InternationalReadiness {
  /** 0-100, or null until enough areas have a score. */
  overall: number | null;
  /** How much of the 100 has a score so far. */
  coverage: number;
  verdict: string;
  areas: AreaResult[];
  /** Where practice will move the score most: weak areas first, then areas with no score. */
  nextSteps: AreaResult[];
}

export function readinessVerdict(overall: number | null): string {
  if (overall === null) return "Not enough evidence yet.";
  if (overall >= 80) return "Ready for most international voice and chat roles.";
  if (overall >= 65) return "Nearly ready: work on your weakest areas before your interview.";
  if (overall >= 50) return "Getting there: practise the areas below, then check again.";
  return "Build the basics first: start with the areas below.";
}

export function computeInternationalReadiness(
  assessment: AssessmentEvidence | null,
  mastery: ReadonlyMap<string, MasteryEvidence>,
  now = new Date(),
  { typing = null, email = null, chat = null }: ToolEvidence = {}
): InternationalReadiness {
  const fresh = assessment && now.getTime() - assessment.completedAt.getTime() <= ASSESSMENT_FRESH_DAYS * 86_400_000 ? assessment : null;

  const areas: AreaResult[] = READINESS_AREAS.map((area) => {
    if (area.key === "typing") return { ...area, score: typing ? typing.score : null, source: typing ? { kind: "typing", tests: typing.tests } : null };
    // Written English: real emails marked against a hiring-round rubric beat general writing practice.
    if (area.key === "writing" && email) return { ...area, score: email.score, source: { kind: "email", emails: email.emails } };
    const part = fresh && area.component ? fresh.components[area.component] : undefined;
    if (part && part.max > 0) {
      return { ...area, score: Math.round((part.points / part.max) * 100), source: { kind: "assessment", at: fresh!.completedAt } };
    }
    // Customer handling: after a recent assessment, marked live chats beat role-play practice.
    if (area.key === "customerHandling" && chat) return { ...area, score: chat.score, source: { kind: "chat", chats: chat.chats } };
    const rated = area.skillIds.map((id) => mastery.get(id)).filter((m): m is MasteryEvidence => !!m && m.band !== "UNRATED");
    if (rated.length) {
      const score = Math.round(rated.reduce((s, m) => s + m.score, 0) / rated.length);
      return { ...area, score, source: { kind: "practice", attempts: rated.reduce((s, m) => s + m.attempts, 0) } };
    }
    return { ...area, score: null, source: null };
  });

  const scored = areas.filter((a) => a.score !== null);
  const coverage = scored.reduce((s, a) => s + a.weight, 0);
  const overall = coverage >= MIN_COVERAGE ? Math.round(scored.reduce((s, a) => s + a.weight * a.score!, 0) / coverage) : null;

  const gap = (a: AreaResult) => a.weight * (100 - a.score!);
  const weak = scored.filter((a) => a.score! < 80).sort((a, b) => gap(b) - gap(a));
  const missing = areas.filter((a) => a.score === null).sort((a, b) => b.weight - a.weight);
  return { overall, coverage, verdict: readinessVerdict(overall), areas, nextSteps: [...weak, ...missing].slice(0, 3) };
}
