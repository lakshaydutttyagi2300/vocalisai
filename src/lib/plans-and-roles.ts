// No imports on purpose, so browser components can use these (entitlements.ts,
// where each plan's limits live, imports the database and is server-only).
export const PLANS = ["FREE", "STARTER", "PROFESSIONAL", "PREMIUM"] as const;
export type Plan = (typeof PLANS)[number];

export const ROLES = ["CANDIDATE", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

/** What each plan is called and costs (INR). Premium stays for existing subscribers but is no longer sold. */
export const PLAN_OFFERS: Record<Plan, { name: string; blurb: string; price: string; altPrice?: string; onSale: boolean }> = {
  FREE: { name: "Free", blurb: "A one-time sample, at your own pace.", price: "₹0", onSale: true },
  STARTER: { name: "Job-Ready Pro", blurb: "Interview, aptitude and English practice for campus and job tests.", price: "₹349 / month", altPrice: "or ₹1,999 / year", onSale: true },
  PROFESSIONAL: { name: "International Process Ready Pro", blurb: "Everything in Job-Ready Pro, plus full mock assessments for international voice, chat and email roles.", price: "₹599 / month", altPrice: "or ₹2,999 for 6 months", onSale: true },
  PREMIUM: { name: "Premium", blurb: "The most practice, for the most thorough preparation.", price: "", onSale: false },
};
export const PLANS_ON_SALE = PLANS.filter((p) => PLAN_OFFERS[p].onSale);
