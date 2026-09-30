import { FEATURE_LABELS_PLURAL, PLAN_LIMITS } from "@/lib/entitlements";
import { BillingView } from "@/components/billing/BillingView";

// Plan limits live in server-only entitlements.ts; the page hands the
// numbers each plan card needs to the client view (checkout runs there).
const HIGHLIGHT_FEATURES = ["PRACTICE_SESSION", "SPEECH_ANALYSIS", "MOCK_ASSESSMENT", "INTERVIEW_SIMULATION", "COACH_MESSAGE"] as const;

export default function BillingPage() {
  const planFeatures = Object.fromEntries(
    (["STARTER", "PROFESSIONAL", "PREMIUM"] as const).map((plan) => [
      plan,
      HIGHLIGHT_FEATURES.map((f) => ({ label: FEATURE_LABELS_PLURAL[f], limit: PLAN_LIMITS[plan][f] })),
    ])
  );
  return <BillingView planFeatures={planFeatures} />;
}
