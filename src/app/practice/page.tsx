import Link from "next/link";
import { PRACTICE_MODES } from "@/lib/practice-taxonomy";

export default function PracticeHubPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-ink-950">Practice</h1>
      <p className="mt-1 text-sm text-slate-600">
        Choose a skill to practice. Each mode has Beginner, Intermediate,
        Advanced and Expert difficulty. Speaking-based modes will ask for
        microphone access first.
      </p>

      <Link
        href="/practice/conversation"
        className="card mt-6 block bg-ink-950 p-5 text-white transition hover:border-brand-400"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">AI Voice Conversation</h2>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-200">
            Needs mic
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-300">
          Talk with an AI customer, interviewer, supervisor or conversation partner - a real
          back-and-forth, not a scripted quiz.
        </p>
      </Link>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRACTICE_MODES.map((mode) => (
          <Link
            key={mode.slug}
            href={`/practice/${mode.slug}`}
            className="card block p-5 transition hover:border-brand-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink-900">{mode.label}</h2>
              {mode.requiresVoice && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  Needs mic
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">{mode.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
