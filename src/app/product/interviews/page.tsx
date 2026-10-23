import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mic, MonitorCheck, ScanFace, Timer } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { ConversationDemo } from "@/components/cine/demos";
import { CineVideo } from "@/components/cine/CineVideo";
import { FadeIn } from "@/components/cine/FadeIn";
import { ClipFrame, Container, FinalCta, MediaSplit, PageHero, SectionIntro } from "@/components/cine/sections";
import { SiteFooter } from "@/components/cine/SiteFooter";
import { scene } from "@/config/mediaLibrary";

export const metadata: Metadata = {
  title: "AI interview coach and mock interview practice - VocalisAi",
  description: "Practise job interviews out loud with an AI interviewer that asks follow-ups based on your answers. Rehearse self-introductions, strengths, behavioural questions and workplace conversations, then review your feedback.",
  openGraph: { title: "AI interview coach and mock interview practice - VocalisAi", description: "Practise job interviews out loud with an AI interviewer that asks follow-ups based on your answers. Rehearse self-introductions, strengths, behavioural questions and workplace conversations, then review your feedback.", siteName: "VocalisAi", type: "website" },
};

const accent = (word: string) => <span className="serif-accent">{word}</span>;

const SCENARIOS = [
  { id: "job", title: "Job interview", text: "Tell me about yourself, your strengths and weaknesses, a project you're proud of, where you see yourself next. Follow-ups based on your answer.", href: "/practice/interview" },
  { id: "manager", title: "Manager conversation", text: "Explain a delay, ask for help, give an update or respond to feedback. The workplace conversations that matter.", href: "/practice/supervisor" },
  { id: "casual", title: "Everyday conversation", text: "Relaxed small talk with a friendly AI partner, to build fluency and confidence in spoken English.", href: "/practice/conversation-partner" },
  { id: "customer", title: "Customer conversation", text: "For customer-facing roles: a question, a delay or a complaint. Stay calm, clear and polite.", href: "/practice/customer-service" },
] as const;

const STEPS = [
  ["Pick a conversation", "A job interview, your manager, an everyday chat or a customer, at your level."],
  ["Speak your answer", "The AI listens, understands what you said, and asks the next question."],
  ["Review your feedback", "What worked, what to add, and the grammar and phrasing to fix."],
];

const QUESTION_TYPES = [
  ["Introducing yourself", "A clear, natural answer to “Tell me about yourself”, without reciting a script."],
  ["Strengths and weaknesses", "Honest answers with an example, and how you're working on the weak spot."],
  ["Behavioural questions", "“Tell me about a time…”: situation, what you did and the result."],
  ["Situational questions", "“What would you do if…”: think aloud and give a sensible plan."],
  ["Projects and experience", "Explain what you worked on, your part in it and what you learned."],
  ["Career goals", "Why this role, and where you want to grow next."],
];

export default function InterviewsPage() {
  return (
    <div className="cine overflow-x-hidden">
      <PageHero
        name={scene("interviews.hero")}
        eyebrow="AI interview coach"
        title={<>Rehearse the conversation {accent("before")} it counts.</>}
        text="Practise interviews and workplace conversations out loud. The AI replies to what you actually said, so every round goes a little differently, just like the real thing."
        actions={
          <>
            <Link href="/signup" className="btn-primary btn-lg">
              Practise an interview
              <Icon as={ArrowRight} />
            </Link>
            <Link href="/practice/conversation?role=INTERVIEWER" className="btn-secondary btn-lg">
              Open the AI interviewer
            </Link>
          </>
        }
      />

      <section className="py-28 sm:py-40">
        <Container>
          <MediaSplit
            eyebrow="How a round works"
            title={<>A question, your answer, a {accent("real")} follow-up.</>}
            text="There's no script to memorise. The AI listens to your spoken answer, asks the kind of follow-up a real interviewer might, and at the end shows what made your answer strong and what to add."
            points={STEPS.map(([t, d]) => `${t}: ${d}`)}
            media={
              <div className="relative">
                <ClipFrame name={scene("interviews.conversation")} ratio="aspect-[4/3]" />
                <ConversationDemo example="jobInterview" className="relative -mt-28 ml-auto w-[94%] sm:-mr-6 sm:w-[24rem]" />
              </div>
            }
          />
        </Container>
      </section>

      <section className="pb-28 sm:pb-40">
        <Container>
          <SectionIntro
            eyebrow="Interview questions"
            title={<>The questions you&rsquo;re most likely to {accent("hear")}.</>}
            text="Practise the common questions out loud until your answers feel natural. AI feedback is a guide, so use it alongside your own judgement."
          />
          <dl className="mt-14 grid gap-px overflow-hidden rounded-[1.5rem] bg-accent-softer ring-1 ring-line sm:grid-cols-2 lg:grid-cols-3">
            {QUESTION_TYPES.map(([name, text]) => (
              <div key={name} className="bg-bg p-7">
                <dt className="font-display text-lg font-semibold tracking-tight text-fg">{name}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-fg-muted">{text}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <section className="pb-28 sm:pb-40">
        <Container>
          <SectionIntro eyebrow="Conversations" title={<>Four conversations worth {accent("practising")}.</>} />
          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {SCENARIOS.map((s, i) => (
              <FadeIn key={s.title} delay={(i % 2) * 110}>
                <Link href={s.href} className="group relative block overflow-hidden rounded-[1.5rem] ring-1 ring-line">
                  <div className="relative aspect-[16/11]">
                    <CineVideo name={scene(`interviews.scenario.${s.id}`)} mode="hover" className="transition-transform duration-700 group-hover:scale-[1.04]" />
                    <div aria-hidden="true" className="scrim-bottom absolute inset-0" />
                    <div className="absolute inset-x-0 bottom-0 p-7">
                      <h3 className="cine-headline text-3xl text-fg">{s.title}</h3>
                      <p className="mt-2 max-w-md text-sm leading-relaxed text-fg-muted">{s.text}</p>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-surface-muted py-28 sm:py-40">
        <Container>
          <MediaSplit
            reverse
            eyebrow="Then try it under real conditions"
            title={<>Mock exams that feel like the {accent("real")} one.</>}
            text="When you're ready, take a timed mock exam with the same kind of rules as a real assessment: a fixed question order, timed sections and a camera and microphone check before you begin."
            media={
              <ClipFrame name={scene("interviews.prep")} ratio="aspect-[4/3]">
                <ul className="absolute inset-x-4 bottom-4 grid gap-2 sm:inset-x-6 sm:bottom-6 sm:grid-cols-2">
                  {(
                    [
                      [ScanFace, "One person in frame"],
                      [Mic, "Microphone checked"],
                      [MonitorCheck, "Tab switches noticed"],
                      [Timer, "Timed sections"],
                    ] as const
                  ).map(([glyph, text]) => (
                    <li key={text} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface/80 px-3 py-2.5 text-sm text-fg backdrop-blur-md">
                      <Icon as={glyph} className="text-accent-strong" />
                      {text}
                    </li>
                  ))}
                </ul>
              </ClipFrame>
            }
            link={{ href: "/mock-tests", label: "See mock exams" }}
          />
        </Container>
      </section>

      <FinalCta
        name={scene("interviews.final")}
        title={<>Walk in having said it {accent("before")}.</>}
        text="Your first AI interview is free. No card needed."
        primary={{ href: "/signup", label: "Practise an interview" }}
        secondary={{ href: "/use-cases", label: "See who it's for" }}
      />
      <SiteFooter />
    </div>
  );
}
