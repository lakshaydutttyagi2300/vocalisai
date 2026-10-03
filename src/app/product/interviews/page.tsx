import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mic, MonitorCheck, ScanFace, Timer } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { ConversationDemo } from "@/components/cine/demos";
import { CineVideo } from "@/components/cine/CineVideo";
import { FadeIn } from "@/components/cine/FadeIn";
import { ClipFrame, Container, FinalCta, MediaSplit, PageHero, SectionIntro } from "@/components/cine/sections";
import { SiteFooter } from "@/components/cine/SiteFooter";

export const metadata: Metadata = {
  title: "AI interviews and role-play - VocalisAi",
  description: "Rehearse job interviews, customer calls and workplace conversations with an AI that replies to what you actually say, then get feedback on your answers.",
};

const accent = (word: string) => <span className="serif-accent">{word}</span>;

const SCENARIOS = [
  { clip: "meeting", alt: "A laptop showing a man in an online meeting", title: "Job interview", text: "Tell me about yourself, your strengths, a time you solved a problem. Follow-ups based on your answer.", href: "/practice/interview" },
  { clip: "agent", alt: "A customer-service agent listening on a headset", title: "Customer call", text: "An upset customer, a delayed order, a refund request. Stay calm, clear and polite.", href: "/practice/customer-service" },
  { clip: "presenting", alt: "A professional presenting with a microphone", title: "Manager conversation", text: "Explain a delay, ask for help, give an update. The workplace conversations that matter.", href: "/practice/supervisor" },
  { clip: "reading-mic", alt: "A woman with headphones reading aloud into a microphone", title: "Casual conversation", text: "Everyday small talk with a friendly AI partner, to build fluency and confidence.", href: "/practice/conversation-partner" },
];

const STEPS = [
  ["Pick a scenario", "Interview, customer call, manager or casual conversation, at your level."],
  ["Speak your answer", "The AI listens, understands what you said, and asks the next question."],
  ["Read your feedback", "What worked, what to add, and the grammar and phrasing to fix."],
];

export default function InterviewsPage() {
  return (
    <div className="cine overflow-x-hidden">
      <PageHero
        name="interviewer"
        alt="An interviewer on a laptop screen during a video interview"
        eyebrow="AI interviews and role-play"
        title={<>Rehearse the conversation {accent("before")} it counts.</>}
        text="Speak to an AI interviewer, customer or manager. It replies to what you actually said, so every round goes a little differently, just like the real thing."
        actions={
          <>
            <Link href="/signup" className="btn-primary btn-lg">
              Try an AI interview
              <Icon as={ArrowRight} />
            </Link>
            <Link href="/practice/conversation" className="btn-secondary btn-lg">
              Open AI conversation
            </Link>
          </>
        }
      />

      <section className="py-28 sm:py-40">
        <Container>
          <MediaSplit
            eyebrow="How a round works"
            title={<>A question, your answer, a {accent("real")} follow-up.</>}
            text="There's no script to memorise. The AI listens to your spoken answer, asks the follow-up a real interviewer would, and at the end shows what made your answer strong and what to add."
            points={STEPS.map(([t, d]) => `${t}: ${d}`)}
            media={
              <div className="relative">
                <ClipFrame name="videocall" alt="A woman talking on a video call at her laptop" ratio="aspect-[4/3]" />
                <ConversationDemo className="relative -mt-28 ml-auto w-[94%] sm:-mr-6 sm:w-[24rem]" />
              </div>
            }
          />
        </Container>
      </section>

      <section className="pb-28 sm:pb-40">
        <Container>
          <SectionIntro eyebrow="Scenarios" title={<>Four conversations worth {accent("practising")}.</>} />
          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {SCENARIOS.map((s, i) => (
              <FadeIn key={s.title} delay={(i % 2) * 110}>
                <Link href={s.href} className="group relative block overflow-hidden rounded-[1.5rem] ring-1 ring-white/[0.06]">
                  <div className="relative aspect-[16/11]">
                    <CineVideo name={s.clip} alt={s.alt} mode="hover" className="transition-transform duration-700 group-hover:scale-[1.04]" />
                    <div aria-hidden="true" className="scrim-bottom absolute inset-0" />
                    <div className="absolute inset-x-0 bottom-0 p-7">
                      <h3 className="cine-headline text-3xl text-mist-50">{s.title}</h3>
                      <p className="mt-2 max-w-md text-sm leading-relaxed text-mist-300">{s.text}</p>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-white/[0.06] bg-night-950 py-28 sm:py-40">
        <Container>
          <MediaSplit
            reverse
            eyebrow="Then test under real conditions"
            title={<>Mock exams that feel like the {accent("real")} one.</>}
            text="When you're ready, take a timed mock exam with the same rules as the real test: a fixed question order, timed sections and a camera and microphone check before you begin."
            media={
              <ClipFrame name="office" alt="A young professional working at a laptop in a bright office" ratio="aspect-[4/3]">
                <ul className="absolute inset-x-4 bottom-4 grid gap-2 sm:inset-x-6 sm:bottom-6 sm:grid-cols-2">
                  {(
                    [
                      [ScanFace, "One person in frame"],
                      [Mic, "Microphone checked"],
                      [MonitorCheck, "Tab switches noticed"],
                      [Timer, "Timed sections"],
                    ] as const
                  ).map(([glyph, text]) => (
                    <li key={text} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-night-900/80 px-3 py-2.5 text-sm text-mist-50 backdrop-blur-md">
                      <Icon as={glyph} className="text-champagne-300" />
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
        name="interview"
        alt="A candidate smiling during a job interview"
        title={<>Walk in having said it {accent("before")}.</>}
        text="Your first AI interview is free. No card needed."
        primary={{ href: "/signup", label: "Start practising" }}
        secondary={{ href: "/use-cases", label: "See use cases" }}
      />
      <SiteFooter />
    </div>
  );
}
