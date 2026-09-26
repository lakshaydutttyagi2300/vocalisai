import Link from "next/link";
import { PRACTICE_MODES, type PracticeModeDef } from "@/lib/practice-taxonomy";

const GROUPS: { id: string; title: string; blurb: string; categories: string[]; liveConversationHref?: string }[] = [
  {
    id: "general-english",
    title: "General English",
    blurb: "The grammar, vocabulary and comprehension foundations every assessment checks first.",
    categories: ["GRAMMAR", "VOCABULARY", "READING_COMPREHENSION", "LISTENING"],
  },
  {
    id: "speaking",
    title: "Speaking",
    blurb: "Spoken delivery - reading aloud, fluency, open response and casual conversation.",
    categories: ["READING", "FLUENCY", "SPEAKING", "CONVERSATION_PARTNER"],
  },
  {
    id: "pronunciation-speech",
    title: "Pronunciation & Speech",
    blurb: "Accuracy and clarity on the words and sentences that are commonly mispronounced.",
    categories: ["PRONUNCIATION"],
  },
  {
    id: "writing",
    title: "Writing",
    blurb: "Sentence rewriting, short responses and professional messages.",
    categories: ["WRITING"],
  },
  {
    id: "aptitude-reasoning",
    title: "Aptitude & Reasoning",
    blurb: "Numerical aptitude, logical and verbal reasoning - the aptitude rounds of campus and job assessments.",
    categories: ["NUMERICAL_APTITUDE", "LOGICAL_REASONING", "VERBAL_REASONING"],
  },
  {
    id: "interview-preparation",
    title: "Interview Preparation",
    blurb: "Practice written answers to common interview questions, or do a full live AI interview below.",
    categories: ["INTERVIEW"],
    liveConversationHref: "/practice/conversation?role=INTERVIEWER",
  },
  {
    id: "workplace-communication",
    title: "Workplace & Customer Communication",
    blurb: "Realistic workplace situations, supervisor conversations and customer scenarios, scored on communication - not just correctness.",
    categories: ["SITUATIONAL_JUDGEMENT", "CUSTOMER_SERVICE", "SUPERVISOR"],
    liveConversationHref: "/practice/conversation?role=CUSTOMER",
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

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href="/practice/goals" className="font-medium text-brand-600 hover:underline">
          Not sure where to start? Tell us what you&apos;re preparing for &rarr;
        </Link>
        <span className="text-slate-300">|</span>
        <Link href="/practice/quick" className="font-medium text-brand-600 hover:underline">
          Short on time? Try a Quick Practice drill &rarr;
        </Link>
      </div>

      <Link
        href="/practice/conversation"
        className="card mt-8 block bg-ink-950 p-6 text-white transition hover:border-brand-400"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="badge badge-ai">AI Voice Conversation</span>
            <h2 className="mt-2 font-display font-bold">Talk with an AI customer, interviewer, supervisor or conversation partner</h2>
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
          <section key={group.title} id={group.id} className="mt-10 scroll-mt-24">
            <h2 className="font-display text-lg font-bold text-ink-950">{group.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{group.blurb}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modes.map((mode) => (
                <ModeCard key={mode.slug} mode={mode} />
              ))}
            </div>
            {group.liveConversationHref && (
              <Link href={group.liveConversationHref} className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
                Or do a live AI conversation instead &rarr;
              </Link>
            )}
          </section>
        );
      })}
    </div>
  );
}
