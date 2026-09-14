import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const STEPS = [
  {
    title: "Practice by skill",
    description:
      "Work through pronunciation, grammar, fluency, listening and customer-service roleplay - one skill at a time.",
  },
  {
    title: "Take a proctored mock test",
    description:
      "A realistic, timed assessment with camera and microphone checks, just like the real hiring process.",
  },
  {
    title: "Get analyzed, not guessed",
    description:
      "Your actual recording is transcribed and scored - real speech rate, real transcript, real feedback.",
  },
];

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  return (
    <div>
      <section className="hero-gradient">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
          <span className="inline-block rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
            BPO Voice &amp; Accent Practice
          </span>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            Practice your BPO Voice &amp; Accent assessment
            <span className="block text-brand-600">before the real interview.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            ProActing gives job seekers a realistic, proctored practice environment for
            BPO voice-process and customer-service hiring assessments - pronunciation,
            grammar, fluency, rate of speech, and customer handling, analyzed on real
            recordings, not guesses.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {session ? (
              <Link href="/dashboard" className="btn-primary px-6 py-3 text-base">
                Go to your dashboard
              </Link>
            ) : (
              <>
                <Link href="/signup" className="btn-primary px-6 py-3 text-base">
                  Create free account
                </Link>
                <Link href="/login" className="btn-secondary px-6 py-3 text-base">
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-2xl font-semibold text-ink-950">
          How practicing on ProActing works
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="card p-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <p className="text-center text-sm text-slate-500">
          Pro<span className="font-semibold text-ink-900">Acting</span> - practice with
          purpose.
        </p>
      </footer>
    </div>
  );
}
