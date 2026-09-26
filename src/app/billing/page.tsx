"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useSession } from "next-auth/react";

interface UsageSummary {
  plan: string;
  periodEnd: string | null;
  features: { feature: string; label: string; pluralLabel: string; limit: number; used: number }[];
}

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

export default function BillingPage() {
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

      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-2xl font-bold text-ink-950">Billing</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your plan and see what you've used this period.</p>

        {error && (
          <p role="alert" className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {usage && (
          <div className="card mt-6 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current plan</p>
            <p className="mt-1 font-display text-lg font-bold text-ink-900">{usage.plan}</p>
            {usage.periodEnd && (
              <p className="mt-0.5 text-xs text-slate-500">
                Renews {new Date(usage.periodEnd).toLocaleDateString()}
              </p>
            )}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {usage.features.map((f) => (
                <div key={f.feature} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <span className="text-ink-900">{f.pluralLabel}</span>
                  <span className="font-mono text-slate-600">{f.used} / {f.limit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {UPGRADE_PLANS.map((p) => (
            <div key={p.plan} className="card p-5">
              <p className="font-display font-bold text-ink-900">{p.name}</p>
              <p className="mt-1 text-sm text-slate-600">{p.blurb}</p>
              <button
                onClick={() => handleUpgrade(p.priceId)}
                disabled={!paddleReady}
                className="btn-primary mt-4 w-full"
              >
                {usage?.plan === p.plan ? "Current plan" : "Upgrade"}
              </button>
            </div>
          ))}
        </div>

        {checkoutError && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{checkoutError}</p>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Payments are processed securely by Paddle. Prices are shown in your local currency at checkout.
          See our{" "}
          <a href="/refund-policy" className="text-brand-600 hover:underline">
            Refund Policy
          </a>{" "}
          for how cancellations work.
        </p>
      </div>
    </>
  );
}
