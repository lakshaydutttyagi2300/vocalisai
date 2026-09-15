// Usage-limit enforcement. This is the layer that makes the approved
// VocalisAi package strategy real: every plan's limits are defined here as
// plain numbers (never Infinity - "nothing should be unlimited" was an
// explicit product requirement), and every AI-costing endpoint calls
// checkAndRecordUsage() before doing any paid work.
//
// Deliberately NOT a fungible credit pool: each feature has its own named
// counter, matching exactly what the candidate sees ("12 of 15 AI Speech
// Analyses used"), never an abstract "credits" balance.
//
// No payment processor is wired up yet, so plans are assigned manually by
// an admin (see /api/admin/candidates/[id] PATCH). When billing exists,
// its webhook writes to this same Subscription row - nothing about this
// module changes.

import { db } from "@/lib/db";
import { isValidDifficulty, type Difficulty } from "@/lib/practice-taxonomy";

export const PLANS = ["FREE", "STARTER", "PROFESSIONAL", "PREMIUM"] as const;
export type Plan = (typeof PLANS)[number];

export const FEATURES = [
  "PRACTICE_SESSION",
  "VOICE_RECORDING",
  "SPEECH_ANALYSIS",
  "IMPROVE_ANSWER",
  "COACH_MESSAGE",
  "MOCK_ASSESSMENT",
  "INTERVIEW_SIMULATION",
  "AI_SCENARIO",
] as const;
export type Feature = (typeof FEATURES)[number];

export const FEATURE_LABELS: Record<Feature, string> = {
  PRACTICE_SESSION: "practice session",
  VOICE_RECORDING: "voice recording",
  SPEECH_ANALYSIS: "AI Speech Analysis",
  IMPROVE_ANSWER: "Improve My Answer request",
  COACH_MESSAGE: "AI Coach message",
  MOCK_ASSESSMENT: "Full Mock Assessment",
  INTERVIEW_SIMULATION: "Interview Simulation",
  AI_SCENARIO: "AI-Generated Scenario",
};

// Plain "+s" breaks on irregular plurals ("Analysis" -> "Analyses", not
// "Analysiss") - spelled out explicitly here instead of guessed at in
// every UI that renders a usage count, so admin and candidate-facing
// usage grids can never drift out of sync with each other.
export const FEATURE_LABELS_PLURAL: Record<Feature, string> = {
  PRACTICE_SESSION: "practice sessions",
  VOICE_RECORDING: "voice recordings",
  SPEECH_ANALYSIS: "AI Speech Analyses",
  IMPROVE_ANSWER: "Improve My Answer requests",
  COACH_MESSAGE: "AI Coach messages",
  MOCK_ASSESSMENT: "Full Mock Assessments",
  INTERVIEW_SIMULATION: "Interview Simulations",
  AI_SCENARIO: "AI-Generated Scenarios",
};

// FREE limits are lifetime (all-time), never resetting - deliberately a
// one-time sample, not an ongoing free tier. Every other plan resets each
// 30-day period (Subscription.currentPeriodStart).
export const PLAN_LIMITS: Record<Plan, Record<Feature, number>> = {
  FREE: {
    PRACTICE_SESSION: 5,
    VOICE_RECORDING: 0,
    SPEECH_ANALYSIS: 1,
    IMPROVE_ANSWER: 0,
    COACH_MESSAGE: 0,
    MOCK_ASSESSMENT: 0,
    INTERVIEW_SIMULATION: 1,
    AI_SCENARIO: 0,
  },
  STARTER: {
    PRACTICE_SESSION: 60,
    VOICE_RECORDING: 30,
    SPEECH_ANALYSIS: 15,
    IMPROVE_ANSWER: 10,
    COACH_MESSAGE: 20,
    MOCK_ASSESSMENT: 2,
    INTERVIEW_SIMULATION: 5,
    AI_SCENARIO: 10,
  },
  PROFESSIONAL: {
    PRACTICE_SESSION: 150,
    VOICE_RECORDING: 80,
    SPEECH_ANALYSIS: 40,
    IMPROVE_ANSWER: 30,
    COACH_MESSAGE: 60,
    MOCK_ASSESSMENT: 5,
    INTERVIEW_SIMULATION: 15,
    AI_SCENARIO: 30,
  },
  PREMIUM: {
    PRACTICE_SESSION: 300,
    VOICE_RECORDING: 200,
    SPEECH_ANALYSIS: 100,
    IMPROVE_ANSWER: 80,
    COACH_MESSAGE: 150,
    MOCK_ASSESSMENT: 12,
    INTERVIEW_SIMULATION: 40,
    AI_SCENARIO: 80,
  },
};

// FREE's one included Interview Simulation is a short sample, not a real
// conversation - capped at 3 candidate turns regardless of the monthly
// counter above (which is already 1).
export const FREE_INTERVIEW_SIMULATION_MAX_TURNS = 3;

const ALL_DIFFICULTIES: Difficulty[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
export const PLAN_DIFFICULTY_ACCESS: Record<Plan, Difficulty[]> = {
  FREE: ["BEGINNER", "INTERMEDIATE"],
  STARTER: ALL_DIFFICULTIES,
  PROFESSIONAL: ALL_DIFFICULTIES,
  PREMIUM: ALL_DIFFICULTIES,
};

const PERIOD_DAYS = 30;

function isPlan(value: string): value is Plan {
  return (PLANS as readonly string[]).includes(value);
}

// Loads the user's real plan, lazily creating a FREE subscription row if
// they don't have one yet (covers every user created before this system
// existed, and every future signup, through one code path). A paid plan
// whose period has ended is treated as FREE from here on - the row itself
// is left alone so admin/support can see what they were on and renew it.
export async function getEffectivePlan(userId: string): Promise<Plan> {
  let sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub) {
    sub = await db.subscription.create({ data: { userId, plan: "FREE", status: "ACTIVE" } });
  }

  if (sub.status !== "ACTIVE") return "FREE";
  if (sub.plan !== "FREE" && sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return "FREE";

  return isPlan(sub.plan) ? sub.plan : "FREE";
}

export interface UsageCheck {
  allowed: boolean;
  plan: Plan;
  limit: number;
  used: number;
  remaining: number;
}

// The core gate. Call BEFORE doing the paid work (transcription, an AI
// call, starting a proctored session, ...) - never after. Only records a
// usage event when the action is actually allowed, so a blocked attempt
// never consumes quota.
export async function checkAndRecordUsage(userId: string, feature: Feature): Promise<UsageCheck> {
  const plan = await getEffectivePlan(userId);
  const limit = PLAN_LIMITS[plan][feature];

  const since = plan === "FREE" ? new Date(0) : await currentPeriodStart(userId);
  const used = await db.usageEvent.count({ where: { userId, feature, createdAt: { gte: since } } });

  if (used >= limit) {
    return { allowed: false, plan, limit, used, remaining: 0 };
  }

  await db.usageEvent.create({ data: { userId, feature } });
  return { allowed: true, plan, limit, used: used + 1, remaining: limit - used - 1 };
}

async function currentPeriodStart(userId: string): Promise<Date> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  return sub?.currentPeriodStart ?? new Date(0);
}

export function upgradeMessage(check: UsageCheck, feature: Feature): string {
  const label = FEATURE_LABELS[feature];
  if (check.limit === 0) {
    return `${label[0].toUpperCase()}${label.slice(1)}s aren't included on your current plan. Upgrade to unlock this feature.`;
  }
  const periodText = check.plan === "FREE" ? "your free sample" : "this month";
  return `You've used all ${check.limit} ${label}${check.limit === 1 ? "" : "s"} included in ${periodText === "this month" ? "your plan this month" : periodText}. Upgrade for more.`;
}

export async function checkDifficultyAccess(userId: string, difficulty: string): Promise<boolean> {
  if (!isValidDifficulty(difficulty)) return false;
  const plan = await getEffectivePlan(userId);
  return PLAN_DIFFICULTY_ACCESS[plan].includes(difficulty);
}

export interface SetPlanOptions {
  periodDays?: number; // ignored when periodEnd is given
  periodEnd?: Date; // exact renewal date, e.g. from a Paddle subscription's current_billing_period.ends_at
  paddleCustomerId?: string;
  paddleSubscriptionId?: string;
}

// Sets or renews a user's plan - called by the admin manual-assignment
// route (src/app/api/admin/candidates/[id]) and by the Paddle webhook
// (src/app/api/webhooks/paddle), the exact same function either way so
// "how a plan gets set" is one code path regardless of source.
export async function setPlan(userId: string, plan: Plan, options: SetPlanOptions = {}): Promise<void> {
  const now = new Date();
  const currentPeriodEnd =
    plan === "FREE"
      ? null
      : options.periodEnd ?? new Date(now.getTime() + (options.periodDays ?? PERIOD_DAYS) * 24 * 60 * 60 * 1000);

  await db.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd,
      paddleCustomerId: options.paddleCustomerId,
      paddleSubscriptionId: options.paddleSubscriptionId,
    },
    update: {
      plan,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd,
      paddleCustomerId: options.paddleCustomerId,
      paddleSubscriptionId: options.paddleSubscriptionId,
    },
  });
}

export interface UsageSummary {
  plan: Plan;
  periodEnd: string | null;
  features: { feature: Feature; label: string; pluralLabel: string; limit: number; used: number }[];
}

// Real-time usage snapshot across every gated feature - for a future
// account/usage view. Free to compute (pure counting of already-persisted
// rows), so safe to call on every page load once it's wired into the UI.
export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const plan = await getEffectivePlan(userId);
  const sub = await db.subscription.findUnique({ where: { userId } });
  const since = plan === "FREE" ? new Date(0) : (sub?.currentPeriodStart ?? new Date(0));

  const counts = await db.usageEvent.groupBy({
    by: ["feature"],
    where: { userId, createdAt: { gte: since } },
    _count: { _all: true },
  });
  const usedByFeature = new Map(counts.map((c) => [c.feature, c._count._all]));

  return {
    plan,
    periodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    features: FEATURES.map((feature) => ({
      feature,
      label: FEATURE_LABELS[feature],
      pluralLabel: FEATURE_LABELS_PLURAL[feature],
      limit: PLAN_LIMITS[plan][feature],
      used: usedByFeature.get(feature) ?? 0,
    })),
  };
}
