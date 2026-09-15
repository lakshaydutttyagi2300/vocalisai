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
            AI Voice &amp; Accent Coach
          </span>

          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            Practice smarter. Speak clearer.
            <span className="block text-brand-600">Get interview ready.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Practice real interview situations, analyze your speaking performance, and
            build the confidence to clear your next Voice &amp; Accent round - on real
            recordings, with real AI feedback, never a guess.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {session ? (
              <Link href="/dashboard" className="btn-primary px-6 py-3 text-base">
                Go to your dashboard
              </Link>
            ) : (
              <>
                <Link href="/signup" className="btn-primary px-6 py-3 text-base">
                  Start Practicing
                </Link>
                <Link href="#how-it-works" className="btn-secondary px-6 py-3 text-base">
                  See How It Works
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center font-display text-2xl font-semibold text-ink-950">
          Practice the skills recruiters actually evaluate
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
          Vocalis<span className="font-semibold text-ink-900">Ai</span> - practice with
          purpose.
        </p>
      </footer>
    </div>
  );
}
