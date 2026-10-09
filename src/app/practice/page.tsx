import Link from "next/link";
import { ArrowRight, ArrowUpRight, Layers3, Mail, Mic, Keyboard, Timer, Target } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { PRACTICE_MODES, type PracticeModeDef } from "@/lib/practice-taxonomy";
import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";
import { skillFirstAreas } from "@/lib/catalog-queries";

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

function ModeRow({ mode }: { mode: PracticeModeDef }) {
  return (
    <li>
      <Link href={`/practice/${mode.slug}`} className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-ink-950 group-hover:text-brand-700">{mode.label}</span>
            {mode.requiresVoice && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                <Icon as={Mic} size="xs" />
                Needs mic
              </span>
            )}
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-slate-600">{mode.description}</span>
        </span>
        <span className="hidden flex-none pt-0.5 text-xs text-slate-400 sm:block">Beginner &rarr; Expert</span>
        <Icon as={ArrowUpRight} className="mt-0.5 flex-none text-fg-muted transition-colors group-hover:text-brand-600" />
      </Link>
    </li>
  );
}

// The catalogue's skill areas (Critical Thinking, Data Interpretation...) live
// under Explore; they're listed here too so the library shows every skill.
async function skillAreas() {
  try {
    return await skillFirstAreas();
  } catch (err) {
    console.error("practice: skill areas unavailable", err);
    return [];
  }
}

export default async function PracticeHubPage() {
  const areas = await skillAreas();
  return (
    <div className="pb-20">
      <MediaHero {...HEROES.practice} title="Practice Library" subtitle="Pick one skill and practise it at your level, from Beginner to Expert. Speaking modes ask for microphone access first." stats={[`${PRACTICE_MODES.length} practice modes`, ...(areas.length ? [`${areas.reduce((n, x) => n + x.subjects.length, 0)} skill areas`] : []), "Beginner to Expert"]} />
    <div className="page-container mt-10">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Link href="/practice/conversation" className="panel-ink lift group block overflow-hidden rounded-xl p-7 sm:p-8">
          <p className="eyebrow eyebrow-on-ink">AI voice conversation · Needs mic</p>
          <h2 className="display mt-4 max-w-xl text-2xl sm:text-3xl">Talk with an AI customer, interviewer, supervisor or conversation partner</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
            A real back-and-forth conversation, not a scripted quiz - the closest thing to a live Voice &amp; Accent interview you can practice on your own.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-strong">
            Start a conversation
            <Icon as={ArrowRight} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
        <div className="grid gap-4">
          <Link href="/practice/quick" className="sheet group flex items-start gap-4 p-6 transition-colors hover:border-brand-200">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Icon as={Timer} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink-950">Short on time?</span>
              <span className="mt-1 block text-sm text-slate-600">Try a Quick Practice drill &rarr;</span>
            </span>
          </Link>
          <Link href="/practice/typing" className="sheet group flex items-start gap-4 p-6 transition-colors hover:border-brand-200">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon as={Keyboard} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink-950">Typing test</span>
              <span className="mt-1 block text-sm text-slate-600">Speed and accuracy for chat and email jobs &rarr;</span>
            </span>
          </Link>
          <Link href="/practice/email" className="sheet group flex items-start gap-4 p-6 transition-colors hover:border-brand-200">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon as={Mail} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink-950">Email writing</span>
              <span className="mt-1 block text-sm text-slate-600">Reply to a customer, marked by AI &rarr;</span>
            </span>
          </Link>
          <Link href="/goal" className="sheet group flex items-start gap-4 p-6 transition-colors hover:border-brand-200">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon as={Target} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink-950">Not sure where to start?</span>
              <span className="mt-1 block text-sm text-slate-600">Tell us what you&apos;re preparing for &rarr;</span>
            </span>
          </Link>
        </div>
      </div>

      {areas.length > 0 && (
        <section id="skill-areas" aria-labelledby="skill-areas-heading" className="mt-10 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="skill-areas-heading" className="headline text-xl text-ink-950">
                Aptitude, reasoning and workplace skills
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">The skills behind company and entrance tests, one at a time, from Beginner to Expert.</p>
            </div>
            <Link href="/explore/skills" className="text-sm font-semibold text-brand-700 hover:underline">
              All skill areas &rarr;
            </Link>
          </div>
          <div className="mt-5 grid gap-6 lg:grid-cols-3">
            {areas.map((a) => (
              <div key={a.slug}>
                <p className="eyebrow text-slate-500">{a.name}</p>
                <ul className="sheet mt-3 divide-y divide-slate-100 overflow-hidden">
                  {a.subjects.map((sub) => (
                    <li key={sub.slug}>
                      <Link href={`/explore/skills/${sub.slug}`} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50">
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
                          <Icon as={Layers3} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-ink-950 group-hover:text-brand-700">{sub.name}</span>
                          <span className="block text-xs text-slate-500">
                            {sub.skillCount} skill{sub.skillCount === 1 ? "" : "s"} · Beginner &rarr; Expert
                          </span>
                        </span>
                        <Icon as={ArrowUpRight} className="flex-none text-fg-muted transition-colors group-hover:text-brand-600" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <nav aria-label="Skill groups" className="-mx-4 mt-10 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {areas.length > 0 && (
          <a href="#skill-areas" className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400">
            Aptitude &amp; reasoning skills
          </a>
        )}
        {GROUPS.map((g) => (
          <a key={g.id} href={`#${g.id}`} className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400">
            {g.title}
          </a>
        ))}
      </nav>

      <div className="mt-8 grid gap-10">
        {GROUPS.map((group) => {
          const modes = PRACTICE_MODES.filter((m) => group.categories.includes(m.category));
          if (modes.length === 0) return null;
          return (
            <section key={group.title} id={group.id} className="grid scroll-mt-24 items-start gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
              <div>
                <h2 className="headline text-xl text-ink-950">{group.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{group.blurb}</p>
                {group.liveConversationHref && (
                  <Link href={group.liveConversationHref} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
                    Or do a live AI conversation instead &rarr;
                  </Link>
                )}
              </div>
              <ul className="sheet divide-y divide-slate-100 overflow-hidden">
                {modes.map((mode) => (
                  <ModeRow key={mode.slug} mode={mode} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
    </div>
  );
}
