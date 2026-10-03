import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import LessonsSlider from "@/components/landing/LessonsSlider";
import { AnalysisDemo } from "@/components/cine/demos";
import { FadeIn } from "@/components/cine/FadeIn";
import { ClipFrame, Container, FinalCta, MediaSplit, PageHero, SectionIntro } from "@/components/cine/sections";
import { SiteFooter } from "@/components/cine/SiteFooter";
import { Waveform } from "@/components/cine/Waveform";
import { LESSONS, SPEECH_DIMENSIONS } from "@/components/cine/content";

export const metadata: Metadata = {
  title: "Speaking practice with AI feedback - VocalisAi",
  description: "Speak your answer out loud and get feedback on pronunciation, fluency, grammar, vocabulary and pace that quotes your own words.",
};

const accent = (word: string) => <span className="serif-accent">{word}</span>;

// Before -> after: what the feedback actually changes.
const BEFORE_AFTER = [
  { skill: "Grammar", before: "I will helping you with that.", after: "I will help you with that.", note: "“Will” takes the base verb." },
  { skill: "Fluency", before: "So, um, like, I think, um, yes.", after: "So [pause] I think yes.", note: "Two fillers swapped for a half-second pause." },
  { skill: "Pronunciation", before: "I can help you with that today.", after: "I can HELP you with that TODAY.", note: "Stress the words that carry the meaning." },
];

const MODES = [
  ["Speaking", "/practice/speaking", "Answer prompts out loud, from everyday topics to workplace questions."],
  ["Pronunciation", "/practice/pronunciation", "Sounds, word stress and intonation, word by word."],
  ["Fluency", "/practice/fluency", "Keep going without fillers, long pauses or restarts."],
  ["Read aloud", "/practice/reading", "Read a passage clearly at a natural pace."],
  ["Listening", "/practice/listening", "Natural AI voices and accents, then questions on what you heard."],
  ["AI conversation", "/practice/conversation", "A live back-and-forth with an AI that replies to what you say."],
];

export default function SpeakingPage() {
  return (
    <div className="cine overflow-x-hidden">
      <PageHero
        name="reading-mic"
        alt="A woman with headphones reading aloud into a microphone"
        eyebrow="Speaking practice"
        title={<>Speak. Hear exactly how you {accent("sound")}.</>}
        text="Answer out loud and VocalisAi transcribes and rates your answer on six dimensions, quoting your own words with the fix beside each one."
        actions={
          <>
            <Link href="/signup" className="btn-primary btn-lg">
              Start speaking free
              <Icon as={ArrowRight} />
            </Link>
            <Link href="/practice/speaking" className="btn-secondary btn-lg">
              Open speaking practice
            </Link>
          </>
        }
      />

      <section className="py-28 sm:py-40">
        <Container>
          <MediaSplit
            eyebrow="The analysis"
            title={<>Six things a good {accent("listener")} notices.</>}
            text="Your recording is transcribed, then rated for how you said it as well as what you said. Each point quotes your transcript, so you can see the moment it happened."
            points={SPEECH_DIMENSIONS.map(([name, text]) => `${name}: ${text.toLowerCase()}`)}
            media={
              <div className="relative">
                <ClipFrame name="mic-macro" alt="A close-up of a studio microphone" ratio="aspect-[4/3]" />
                <AnalysisDemo className="relative -mt-40 ml-auto w-[94%] sm:-mr-6 sm:w-[25rem]" />
              </div>
            }
          />
        </Container>
      </section>

      <section className="border-y border-line bg-surface-muted py-28 sm:py-36">
        <Container>
          <SectionIntro eyebrow="Before and after" title={<>Small fixes, a {accent("clearer")} you.</>} text="Three of the changes the feedback asks for most often." />
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {BEFORE_AFTER.map((b, i) => (
              <FadeIn key={b.skill} delay={i * 110}>
                <div className="cine-surface h-full p-7">
                  <p className="cine-eyebrow">{b.skill}</p>
                  <p className="mt-6 text-lg text-fg-subtle line-through decoration-fg-subtle">{b.before}</p>
                  <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-fg">{b.after}</p>
                  <p className="mt-6 border-t border-line pt-5 text-sm text-fg-muted">{b.note}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <Waveform bars={96} className="mt-16 h-14 opacity-60" />
        </Container>
      </section>

      <section className="py-28 sm:py-40">
        <Container>
          <MediaSplit
            reverse
            eyebrow="Ways to practise"
            title={<>Every kind of {accent("speaking")}, in one place.</>}
            text="Pick the skill you want to work on, at Beginner, Intermediate, Advanced or Expert. Every mode gives the same detailed feedback."
            media={<ClipFrame name="presenting" alt="A professional presenting with a microphone" ratio="aspect-[4/3]" />}
          />
          <div className="mt-14 grid gap-px overflow-hidden rounded-[1.5rem] bg-accent-softer ring-1 ring-line sm:grid-cols-2 lg:grid-cols-3">
            {MODES.map(([name, href, text]) => (
              <Link key={href} href={href} className="group bg-bg p-7 transition-colors hover:bg-surface">
                <p className="flex items-center justify-between font-display text-lg font-semibold tracking-tight text-fg">
                  {name}
                  <Icon as={ArrowRight} className="text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent-strong" />
                </p>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{text}</p>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-28 sm:pb-40">
        <Container>
          <SectionIntro eyebrow="Micro-lessons" title={<>Small habits that {accent("examiners")} notice.</>} text="One idea each, under a minute to read. Then practise it straight away." />
          <div className="mt-12">
            <LessonsSlider lessons={LESSONS} />
          </div>
        </Container>
      </section>

      <FinalCta
        name="headphones"
        alt="A man with headphones speaking and reading"
        title={<>Your voice, {accent("clearer")} every week.</>}
        text="Start free with practice sessions and speech analyses. No card needed."
        primary={{ href: "/signup", label: "Start practising" }}
        secondary={{ href: "/pricing", label: "See pricing" }}
      />
      <SiteFooter />
    </div>
  );
}
