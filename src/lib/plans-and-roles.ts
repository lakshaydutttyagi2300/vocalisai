// No imports on purpose, so browser components can use these (entitlements.ts,
// where each plan's limits live, imports the database and is server-only).
export const PLANS = ["FREE", "STARTER", "PROFESSIONAL", "PREMIUM"] as const;
export type Plan = (typeof PLANS)[number];

export const ROLES = ["CANDIDATE", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];
