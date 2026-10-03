"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useSession } from "next-auth/react";
import { Check, Lock } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";

interface UsageSummary {
  plan: string;
  periodEnd: string | null;
  features: { feature: string; label: string; pluralLabel: string; limit: number; used: number }[];
}

type PlanFeatures = Record<string, { label: string; limit: number }[]>;

const PLAN_NAMES: Record<string, string> = { FREE: "Free", STARTER: "Starter", PROFESSIONAL: "Professional", PREMIUM: "Premium" };

const UPGRADE_PLANS = [
  {
    plan: "STARTER",
    name: "Starter",
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER,
    blurb: "More practice, voice recordings, and AI Speech Analysis every month.",
  },
  {
    plan: "PROFESSIONAL",
    name: "Professional",
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_PROFESSIONAL,
    blurb: "Higher limits across every feature, including Full Mock Assessments.",
  },
  {
    plan: "PREMIUM",
    name: "Premium",
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_PREMIUM,
    blurb: "The highest limits on every feature, for serious, sustained practice.",
  },
];

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: string) => void };
      Setup: (opts: { token: string }) => void;
      Checkout: {
        open: (opts: {
          items: { priceId: string; quantity: number }[];
          customData?: Record<string, string>;
          customer?: { email: string };
        }) => void;
      };
    };
  }
}

export function BillingView({ planFeatures }: { planFeatures: PlanFeatures }) {
  const { data: session } = useSession();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paddleReady, setPaddleReady] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/usage")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setUsage(data);
      })
      .catch(() => setError("Couldn't load your plan."));
  }, []);

  function handlePaddleLoaded() {
    if (!window.Paddle) return;
    const env = process.env.NEXT_PUBLIC_PADDLE_ENV ?? "sandbox";
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (env === "sandbox") window.Paddle.Environment.set("sandbox");
    if (token) window.Paddle.Setup({ token });
    setPaddleReady(true);
  }

  function handleUpgrade(priceId: string | undefined) {
    setCheckoutError(null);
    if (!priceId || !window.Paddle || !session?.user) {
      setCheckoutError("Checkout isn't configured yet. Please try again later.");
      return;
    }
    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: { userId: session.user.id },
      customer: session.user.email ? { email: session.user.email } : undefined,
    });
  }

  return (
    <>
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" onLoad={handlePaddleLoaded} />

      <div className="pb-20">
        <MediaHero {...HEROES.billing} title="Plan & billing" subtitle="Manage your plan and see what you've used this period." />
      <div className="page-container mt-10">

        {error && (
          <p role="alert" className="mb-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {usage && (
          <section aria-labelledby="current-plan" className="panel-ink overflow-hidden rounded-xl p-7 sm:p-9">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow eyebrow-on-ink">Current plan</p>
                <h2 id="current-plan" className="display mt-3 text-4xl">
                  {PLAN_NAMES[usage.plan] ?? usage.plan}
                </h2>
              </div>
              <p className="text-sm text-slate-400">
                {usage.periodEnd
                  ? `Renews ${new Date(usage.periodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                  : usage.plan === "FREE"
                    ? "A one-time sample - it doesn't reset"
                    : null}
              </p>
            </div>
            <ul className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
              {usage.features.map((f) => {
                const share = f.limit > 0 ? Math.min(1, f.used / f.limit) : 1;
                return (
                  <li key={f.feature}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-fg-muted">{f.pluralLabel.charAt(0).toUpperCase() + f.pluralLabel.slice(1)}</span>
                      <span className="num text-slate-400">
                        {f.limit === 0 ? "Not included" : `${f.used} / ${f.limit}`}
                      </span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-muted">
                      {f.limit > 0 && <div className={`h-full rounded-full ${share >= 0.8 ? "bg-warning" : "bg-accent"}`} style={{ width: `${share * 100}%` }} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section aria-labelledby="plans-heading" className="mt-12">
          <h2 id="plans-heading" className="headline text-2xl text-ink-950">
            {usage && usage.plan !== "FREE" ? "Change plan" : "Choose a plan"}
          </h2>
          <div className="mt-6 grid overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white lg:grid-cols-3">
            {UPGRADE_PLANS.map((p) => {
              const current = usage?.plan === p.plan;
              const featured = p.plan === "PROFESSIONAL";
              return (
                <div
                  key={p.plan}
                  className={`flex flex-col p-7 [&:not(:first-child)]:border-t lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:border-t-0 ${
                    featured ? "panel-ink" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className={`font-display text-lg font-bold text-fg`}>{p.name}</h3>
                    {current ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[0.7rem] font-bold text-green-800">Your plan</span>
                    ) : (
                      featured && <span className="rounded-full bg-amber-300 px-2.5 py-0.5 text-[0.7rem] font-bold text-ink-950">Recommended</span>
                    )}
                  </div>
                  <p className={`mt-2 text-sm ${featured ? "text-fg-muted" : "text-slate-600"}`}>{p.blurb}</p>
                  <ul className={`mt-6 flex-1 space-y-3 border-t pt-6 text-sm ${featured ? "border-line text-fg-muted" : "border-slate-100 text-ink-800"}`}>
                    {(planFeatures[p.plan] ?? []).map((f) =>
                      f.limit === 0 ? (
                        <li key={f.label} className={`flex items-start gap-2.5 ${featured ? "text-slate-400" : "text-slate-500"}`}>
                          <Icon as={Lock} className="mt-0.5" />
                          <span>{f.label.charAt(0).toUpperCase() + f.label.slice(1)} not included</span>
                        </li>
                      ) : (
                        <li key={f.label} className="flex items-start gap-2.5">
                          <Icon as={Check} className={`mt-0.5 ${featured ? "text-accent-strong" : "text-brand-600"}`} />
                          <span>
                            <span className="num font-semibold">{f.limit}</span> {f.label}
                            <span className={featured ? "text-slate-400" : "text-slate-500"}>/month</span>
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                  {current ? (
                    <p className={`mt-8 text-center text-sm font-semibold ${featured ? "text-fg-muted" : "text-slate-500"}`}>You&apos;re on this plan</p>
                  ) : (
                    <button onClick={() => handleUpgrade(p.priceId)} disabled={!paddleReady} className={`${featured ? "btn-primary" : "btn-secondary"} btn-lg mt-8 w-full`}>
                      {`Upgrade to ${p.name}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {checkoutError && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {checkoutError}
          </p>
        )}

        <p className="mt-6 text-xs text-slate-500">
          Payments are processed securely by Paddle. Prices are shown in your local currency at checkout. See our{" "}
          <a href="/refund-policy" className="text-brand-700 hover:underline">
            Refund Policy
          </a>{" "}
          for how cancellations work.
        </p>
      </div>
      </div>
    </>
  );
}
