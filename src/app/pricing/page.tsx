import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Check, Lock } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { FEATURE_LABELS, FEATURE_LABELS_PLURAL, PLAN_DIFFICULTY_ACCESS, PLAN_LIMITS } from "@/lib/entitlements";
import { PLAN_OFFERS, PLANS_ON_SALE } from "@/lib/plans-and-roles";
import { PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { Icon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/cine/FadeIn";
import { Container, FinalCta } from "@/components/cine/sections";
import { SiteFooter } from "@/components/cine/SiteFooter";
import { Waveform } from "@/components/cine/Waveform";
import { scene } from "@/config/mediaLibrary";

export const metadata: Metadata = {
  title: "Pricing - VocalisAi",
  description: "Every practice mode on every plan. Start free, then choose how much practice, speech analysis, mock assessments and AI interviews you need each month.",
};

const accent = (word: string) => <span className="serif-accent">{word}</span>;

const HIGHLIGHTS = ["PRACTICE_SESSION", "SPEECH_ANALYSIS", "MOCK_ASSESSMENT", "INTERVIEW_SIMULATION"] as const;

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  const free = PLAN_LIMITS.FREE;
  const faqs: [string, string][] = [
    [
      "Is the free plan really free?",
      `Yes. It's a one-time sample with no card needed: ${free.PRACTICE_SESSION} practice sessions, ${free.SPEECH_ANALYSIS} speech analyses and ${free.INTERVIEW_SIMULATION} AI interview.`,
    ],
    ["What's different between the plans?", `Every plan includes all ${PRACTICE_MODES.length} practice modes. Paid plans add more of each every month, full mock assessments, and more difficulty levels.`],
    ["Will I see the same questions again?", "No. You get questions you haven't seen first, until a topic runs out; revision mode brings back the ones you got wrong."],
    ["Is this an official Versant or SVAR score?", "No. Our International Process Ready score is our own practice estimate, not an official Versant, SVAR or employer score."],
    ["Are these the official tests?", "No. Practice material is written by VocalisAi in the style of each test. We are not affiliated with or endorsed by the employers or test providers named."],
  ];

  return (
    <div className="cine overflow-x-hidden">
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="aurora pointer-events-none absolute inset-0" />
        <Container className="relative pb-20 pt-24 text-center sm:pt-32">
          <div className="cine-copy mx-auto max-w-3xl">
            <p className="cine-eyebrow">Pricing</p>
            <h1 className="cine-display mt-5 text-5xl text-fg sm:text-7xl">Every mode. Every {accent("plan")}.</h1>
            <p className="cine-lede mx-auto mt-6 max-w-xl">Plans differ in how much you can do each month and which levels unlock. Start free, no card needed.</p>
          </div>
          <Waveform bars={64} className="mx-auto mt-14 h-10 max-w-2xl opacity-50" />
        </Container>

        <Container className="relative pb-28 sm:pb-36">
          <FadeIn>
            <div className="grid gap-4 lg:grid-cols-3">
              {PLANS_ON_SALE.map((plan) => {
                const limits = PLAN_LIMITS[plan];
                const levels = PLAN_DIFFICULTY_ACCESS[plan];
                const featured = plan === "PROFESSIONAL";
                return (
                  <div
                    key={plan}
                    className={`flex flex-col rounded-[1.5rem] border p-7 ${featured ? "border-accent-line bg-accent-softer shadow-[var(--shadow-lg)]" : "border-line bg-surface"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-display text-xl font-semibold tracking-tight text-fg">{PLAN_OFFERS[plan].name}</h2>
                      {featured && <span className="rounded-full bg-accent px-2.5 py-0.5 text-[0.7rem] font-semibold text-on-ink">Recommended</span>}
                    </div>
                    <p className="mt-4 font-display text-3xl font-semibold text-fg">{PLAN_OFFERS[plan].price}</p>
                    <p className="min-h-[1.25rem] text-xs text-fg-subtle">{PLAN_OFFERS[plan].altPrice}</p>
                    <p className="mt-2 min-h-[2.5rem] text-sm text-fg-muted">{PLAN_OFFERS[plan].blurb}</p>
                    <ul className="mt-6 flex-1 space-y-3 border-t border-line pt-6 text-sm text-fg-muted">
                      {HIGHLIGHTS.map((feature) => {
                        const count = limits[feature];
                        return count === 0 ? (
                          <li key={feature} className="flex items-start gap-2.5 text-fg-subtle">
                            <Icon as={Lock} className="mt-0.5" />
                            <span>{FEATURE_LABELS_PLURAL[feature]} on paid plans</span>
                          </li>
                        ) : (
                          <li key={feature} className="flex items-start gap-2.5">
                            <Icon as={Check} className="mt-0.5 text-accent-strong" />
                            <span>
                              <span className="num font-semibold text-fg">{count}</span> {count === 1 ? FEATURE_LABELS[feature] : FEATURE_LABELS_PLURAL[feature]}
                              <span className="text-fg-subtle">{plan === "FREE" ? " (once)" : " / month"}</span>
                            </span>
                          </li>
                        );
                      })}
                      <li className="flex items-start gap-2.5">
                        <Icon as={Check} className="mt-0.5 text-accent-strong" />
                        <span>{levels.length === 4 ? "All four levels" : `${levels.map((d) => d.charAt(0) + d.slice(1).toLowerCase()).join(" & ")} levels`}</span>
                      </li>
                    </ul>
                    <Link href={session ? "/billing" : "/signup"} className={`${featured ? "btn-primary" : "btn-secondary"} mt-8 w-full`}>
                      {plan === "FREE" ? "Start free" : `Choose ${PLAN_OFFERS[plan].name}`}
                    </Link>
                  </div>
                );
              })}
            </div>
          </FadeIn>
        </Container>
      </section>

      <section className="border-t border-line bg-surface-muted py-24 sm:py-32">
        <Container className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <p className="cine-eyebrow">Questions</p>
            <h2 className="cine-headline mt-5 text-4xl text-fg sm:text-5xl">Good to {accent("know")}.</h2>
          </div>
          <dl className="divide-y divide-line border-y border-line">
            {faqs.map(([q, a]) => (
              <div key={q} className="py-6">
                <dt className="font-medium text-fg">{q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-fg-muted">{a}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <FinalCta
        name={scene("pricing.final")}
        title={<>Start with your {accent("voice")}.</>}
        text="Free to begin. Upgrade only when you want more."
        primary={{ href: session ? "/dashboard" : "/signup", label: session ? "Go to your dashboard" : "Start free" }}
        secondary={{ href: "/use-cases", label: "See use cases" }}
      />
      <SiteFooter />
    </div>
  );
}
