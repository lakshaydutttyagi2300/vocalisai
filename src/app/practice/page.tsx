import Link from "next/link";
import { PRACTICE_MODES, type PracticeModeDef } from "@/lib/practice-taxonomy";

const GROUPS: { title: string; blurb: string; categories: string[] }[] = [
  {
    title: "Voice & Accent",
    blurb: "The core of a Voice & Accent round - pronunciation, fluency and read-aloud delivery.",
    categories: ["READING", "PRONUNCIATION", "FLUENCY", "SPEAKING"],
  },
  {
    title: "English Skills",
    blurb: "The grammar, vocabulary and comprehension recruiters check before they even listen to your accent.",
    categories: ["GRAMMAR", "VOCABULARY", "READING_COMPREHENSION", "LISTENING"],
  },
  {
    title: "Situational & Interview",
    blurb: "Realistic workplace situations and interview questions, scored on communication - not just correctness.",
    categories: ["CUSTOMER_SERVICE", "SITUATIONAL_JUDGEMENT", "INTERVIEW"],
  },
];

function ModeCard({ mode }: { mode: PracticeModeDef }) {
  return (
    <Link
      href={`/practice/${mode.slug}`}
      className="card group block p-5 transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display font-bold text-ink-900">{mode.label}</h3>
        {mode.requiresVoice && <span className="badge badge-skill flex-none">Needs mic</span>}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{mode.description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
        Beginner &rarr; Expert
      </span>
    </Link>
  );
}

export default function PracticeHubPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink-950">Practice Library</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Find out exactly why your speaking performance may be holding you back in Voice &amp;
        Accent interviews - then practice it directly. Every mode has Beginner through Expert
        difficulty; speaking modes ask for microphone access first.
      </p>

      <Link
        href="/practice/conversation"
        className="card mt-8 block bg-ink-950 p-6 text-white transition hover:border-brand-400"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="badge badge-ai">AI Voice Conversation</span>
            <h2 className="mt-2 font-display font-bold">Talk with an AI customer, interviewer or supervisor</h2>
          </div>
          <span className="badge badge-neutral flex-none" style={{ backgroundColor: "rgba(255,255,255,.1)", color: "#e2e8e6" }}>
            Needs mic
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          A real back-and-forth conversation, not a scripted quiz - the closest thing to a live
          Voice &amp; Accent interview you can practice on your own.
        </p>
      </Link>

      {GROUPS.map((group) => {
        const modes = PRACTICE_MODES.filter((m) => group.categories.includes(m.category));
        if (modes.length === 0) return null;
        return (
          <section key={group.title} className="mt-10">
            <h2 className="font-display text-lg font-bold text-ink-950">{group.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{group.blurb}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modes.map((mode) => (
                <ModeCard key={mode.slug} mode={mode} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
