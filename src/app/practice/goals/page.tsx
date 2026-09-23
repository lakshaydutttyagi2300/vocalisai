import Link from "next/link";

// Pure discovery/routing layer - every option below deep-links into an
// existing category or flow. No new test system, no duplicate content.
const GOALS = [
  { label: "Improve my English", description: "Grammar, vocabulary, reading and listening basics.", href: "/practice#general-english" },
  { label: "Improve my speaking", description: "Fluency, delivery and open-response practice.", href: "/practice#speaking" },
  { label: "Improve my pronunciation", description: "Words and sentences that are commonly mispronounced.", href: "/practice#pronunciation-speech" },
  { label: "Improve my writing", description: "Sentence rewriting, short responses and professional messages.", href: "/practice#writing" },
  { label: "Prepare for an interview", description: "Written practice or a full live AI interview.", href: "/practice#interview-preparation" },
  { label: "Prepare for professional communication", description: "Workplace situations, supervisor and customer conversations.", href: "/practice#workplace-communication" },
  { label: "Prepare for a voice-based assessment", description: "A live AI roleplay conversation.", href: "/practice/conversation" },
  { label: "Take a full mock test", description: "A complete timed, proctored assessment with scoring.", href: "/mock-tests" },
];

export default function PracticeGoalsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/practice" className="text-sm text-slate-500 hover:text-ink-900">
        &larr; Back to Practice
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink-950">What are you preparing for?</h1>
      <p className="mt-1 text-sm text-slate-600">
        Pick what matters most right now - you can always come back and try something else.
      </p>

      <div className="mt-6 grid gap-3">
        {GOALS.map((goal) => (
          <Link
            key={goal.label}
            href={goal.href}
            className="card block p-5 transition hover:border-brand-300 hover:shadow-md"
          >
            <h2 className="font-display font-bold text-ink-900">{goal.label}</h2>
            <p className="mt-1 text-sm text-slate-600">{goal.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
