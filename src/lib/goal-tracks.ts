// Goal Tracks (Phase 4): what a candidate is preparing for, and a plan built
// from their skill mastery. A track is a recipe over skills (GoalTrackSkill
// weights) plus the exams that belong to it (ExamBlueprint, e.g. the BPO
// assessment lives inside the BPO track). Only enabled tracks are offered;
// Campus and Study Abroad stay hidden until an admin enables them.

import { db } from "@/lib/db";
import { drillableCountsByNode } from "@/lib/skills/drills";
import type { MasteryResult } from "@/lib/skills/mastery";
import { reconcileUserMastery } from "@/lib/skills/mastery-store";
import { CATEGORY_SHORT_NAMES, displayName } from "@/lib/skills/taxonomy";

export interface TrackSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

/** Candidate-facing extras per track: a tagline and what's included. */
export const TRACK_COPY: Record<string, { tagline: string; includes: string[] }> = {
  GENERAL_ENGLISH: {
    tagline: "Stronger everyday and workplace English.",
    includes: ["Grammar, vocabulary, reading and listening drills", "Writing and speaking practice", "The General English assessment"],
  },
  BPO_SUPPORT: {
    tagline: "Get ready for customer-support and BPO roles.",
    includes: ["Voice, accent and listening practice", "Customer-service role-plays and workplace judgement", "The full BPO (Workplace Communication) assessment"],
  },
  INTERVIEW_PREP: {
    tagline: "Answer interview questions clearly and confidently.",
    includes: ["Interview questions with feedback", "Live AI mock interviews", "Workplace judgement and spoken English"],
  },
};

export async function listEnabledTracks(): Promise<TrackSummary[]> {
  return db.goalTrack.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true, description: true },
  });
}

export async function getUserTrack(userId: string): Promise<TrackSummary | null> {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { goalTrack: { select: { id: true, slug: true, name: true, description: true, enabled: true } } },
  });
  const t = profile?.goalTrack;
  return t && t.enabled ? { id: t.id, slug: t.slug, name: t.name, description: t.description } : null;
}

/** Sets the candidate's goal. Returns false for an unknown or hidden track. */
export async function setUserTrack(userId: string, slug: string): Promise<boolean> {
  const track = await db.goalTrack.findUnique({ where: { slug }, select: { id: true, enabled: true } });
  if (!track?.enabled) return false;
  await db.profile.upsert({ where: { userId }, create: { userId, goalTrackId: track.id }, update: { goalTrackId: track.id } });
  return true;
}

// Where to practise a skill area that has no instantly-marked drill
// (speaking, role-play, writing...), by longest matching prefix.
const PRACTICE_FOR: Record<string, { href: string; label: string }> = {
  SPK: { href: "/practice#speaking", label: "Speaking practice" },
  "SPK.PRN": { href: "/practice/pronunciation", label: "Pronunciation practice" },
  "SPK.PRN.READALOUD": { href: "/practice/reading", label: "Read Aloud practice" },
  "SPK.FLU": { href: "/practice/fluency", label: "Fluency practice" },
  "SPK.SPN": { href: "/practice/speaking", label: "Speaking practice" },
  "SPK.INT": { href: "/practice/conversation-partner", label: "Conversation practice" },
  CSV: { href: "/practice/customer-service", label: "Customer-service role-play" },
  INV: { href: "/practice/interview", label: "Interview questions" },
  "ENG.WRT": { href: "/practice/writing", label: "Writing practice" },
  SJT: { href: "/practice/situational-judgement", label: "Workplace judgement practice" },
};

export function practiceLinkFor(nodeId: string): { href: string; label: string } {
  const parts = nodeId.split(".");
  for (let i = parts.length; i > 0; i--) {
    const hit = PRACTICE_FOR[parts.slice(0, i).join(".")];
    if (hit) return hit;
  }
  return { href: "/practice", label: "Practice library" };
}

export interface PlanArea {
  id: string;
  name: string;
  weight: number;
  mastery: MasteryResult | null;
  action: { href: string; label: string };
}

export interface TrackExam {
  name: string;
  description: string;
  href: string;
  kind: "mock" | "interview";
}

export interface TrackPlan {
  track: TrackSummary;
  /** 0-100 weighted readiness over the areas with a rating; null until something is rated. */
  readiness: number | null;
  /** Share (0-1) of the track's weight that has a rating yet. */
  coverage: number;
  areas: PlanArea[];
  nextSteps: PlanArea[];
  exams: TrackExam[];
}

/** Weighted readiness over rated areas, and how much of the track is rated. */
export function computeReadiness(areas: { weight: number; mastery: { band: string; score: number } | null }[]): { readiness: number | null; coverage: number } {
  const total = areas.reduce((s, a) => s + a.weight, 0);
  const rated = areas.filter((a) => a.mastery && a.mastery.band !== "UNRATED");
  const ratedWeight = rated.reduce((s, a) => s + a.weight, 0);
  if (ratedWeight === 0) return { readiness: null, coverage: 0 };
  const readiness = Math.round(rated.reduce((s, a) => s + a.weight * a.mastery!.score, 0) / ratedWeight);
  return { readiness, coverage: total ? ratedWeight / total : 0 };
}

/**
 * Next steps: the areas where improving matters most for this goal -
 * weight x how far below 100 - rated weak spots first, then important
 * areas not tried yet.
 */
export function pickNextSteps<T extends { weight: number; mastery: { band: string; score: number } | null }>(areas: T[], max = 4): T[] {
  const gap = (a: T) => (a.mastery && a.mastery.band !== "UNRATED" ? a.weight * (100 - a.mastery.score) : -1);
  const rated = areas.filter((a) => a.mastery && a.mastery.band !== "UNRATED" && a.mastery.band !== "MASTERED").sort((a, b) => gap(b) - gap(a));
  const untried = areas.filter((a) => !a.mastery || a.mastery.band === "UNRATED").sort((a, b) => b.weight - a.weight);
  return [...rated, ...untried].slice(0, max);
}

export async function buildTrackPlan(userId: string, track: TrackSummary): Promise<TrackPlan> {
  const [weights, blueprints, mastery, drillable] = await Promise.all([
    db.goalTrackSkill.findMany({ where: { goalTrackId: track.id }, select: { skillId: true, weight: true, skill: { select: { id: true, name: true } } }, orderBy: { weight: "desc" } }),
    db.examBlueprint.findMany({ where: { goalTrackId: track.id, kind: "mock", enabled: true, mockTestTemplateId: { not: null } }, select: { name: true, mockTestTemplateId: true } }),
    reconcileUserMastery(userId),
    drillableCountsByNode(userId),
  ]);

  const areas: PlanArea[] = [];
  for (const w of weights) {
    const hasDrill = (drillable.get(w.skillId) ?? 0) > 0;
    areas.push({
      id: w.skillId,
      name: CATEGORY_SHORT_NAMES[w.skillId] ?? displayName(w.skill),
      weight: w.weight,
      mastery: mastery.get(w.skillId) ?? null,
      action: hasDrill ? { href: `/skills/drill/${encodeURIComponent(w.skillId)}`, label: "Quick drill" } : practiceLinkFor(w.skillId),
    });
  }

  const exams: TrackExam[] = blueprints.map((b) => ({
    name: b.name,
    description: "Full timed, proctored mock exam with a readiness report.",
    href: `/mock-tests?template=${encodeURIComponent(b.mockTestTemplateId!)}`,
    kind: "mock",
  }));
  if (track.slug === "INTERVIEW_PREP" || track.slug === "BPO_SUPPORT") {
    exams.push({
      name: "Live AI mock interview",
      description: "A real back-and-forth interview with an AI interviewer, then feedback.",
      href: "/practice/conversation?role=INTERVIEWER",
      kind: "interview",
    });
  }

  const { readiness, coverage } = computeReadiness(areas);
  return { track, readiness, coverage, areas, nextSteps: pickNextSteps(areas), exams };
}
