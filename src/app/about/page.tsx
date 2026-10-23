import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { AnalysisDemo } from "@/components/cine/demos";
import { CineVideo } from "@/components/cine/CineVideo";
import { FadeIn } from "@/components/cine/FadeIn";
import { Container, FinalCta, MediaSplit, PageHero, SectionIntro } from "@/components/cine/sections";
import { SiteFooter } from "@/components/cine/SiteFooter";
import { scene } from "@/config/mediaLibrary";

export const metadata: Metadata = {
  title: "About VocalisAi - your AI communication coach",
  description: "Why VocalisAi exists: a low-pressure place to practise interviews, spoken English and professional conversations, with feedback you can act on.",
  openGraph: { title: "About VocalisAi - your AI communication coach", description: "Why VocalisAi exists: a low-pressure place to practise interviews, spoken English and professional conversations, with feedback you can act on.", siteName: "VocalisAi", type: "website" },
};

const accent = (word: string) => <span className="serif-accent">{word}</span>;

const BELIEFS = [
  {
    id: "feedback",
    title: "Feedback you can act on",
    text: "Every comment quotes your own words and sits next to the fix. “Improve your fluency” helps no one; “you said um four times in the first sentence” does.",
  },
  {
    id: "realThing",
    title: "Practice like the real thing",
    text: "An AI that replies to what you said, and timed tests when you want them, so the real day feels like the second time you've done it.",
  },
  {
    id: "honest",
    title: "Honest by design",
    text: "Practice material is our own. Examples are labelled as examples, AI feedback is presented as a guide, and we never invent scores, reviews or results.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="cine overflow-x-hidden">
      <PageHero
        name={scene("about.hero")}
        eyebrow="About VocalisAi"
        title={<>For anyone who wants to speak with {accent("confidence")}.</>}
        text="Interviews, meetings, new jobs and everyday conversations: moments where how you express yourself matters. VocalisAi is a calm place to practise them out loud, make mistakes safely and improve a little each time."
      />

      <section className="py-28 sm:py-40">
        <Container>
          <SectionIntro eyebrow="What we believe" title={<>Three ideas behind {accent("everything")} we build.</>} />
          <div className="mt-16 grid gap-10 lg:grid-cols-3">
            {BELIEFS.map((b, i) => (
              <FadeIn key={b.title} delay={i * 120}>
                <article>
                  <div className="cine-media aspect-[4/5]">
                    <CineVideo name={scene(`about.${b.id}`)} />
                  </div>
                  <h3 className="cine-headline mt-7 text-2xl text-fg">{b.title}</h3>
                  <p className="mt-3 leading-relaxed text-fg-muted">{b.text}</p>
                </article>
              </FadeIn>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-surface-muted py-28 sm:py-40">
        <Container>
          <MediaSplit
            eyebrow="How it works"
            title={<>Listening first, then {accent("feedback")}.</>}
            text="Your spoken answers are transcribed and analysed by AI for pronunciation, fluency, grammar, vocabulary, pace and delivery. Every answer also updates a mastery score for the skill it tested, and the next questions you see are chosen from that, never repeating one you've already seen until a topic runs out."
            points={["Speech transcribed, then rated on six dimensions", "Mastery scores for every skill", "Fresh questions first, revision on demand", "Camera and microphone checks for mock exams"]}
            media={
              <div className="relative">
                <div className="cine-media aspect-[4/3]">
                  <CineVideo name={scene("about.howItWorks")} />
                </div>
                <AnalysisDemo example="readAloud" className="relative -mt-40 ml-auto w-[94%] sm:-mr-6 sm:w-[25rem]" />
              </div>
            }
          />
        </Container>
      </section>

      <section className="py-24 sm:py-32">
        <Container className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="cine-eyebrow">Talk to us</p>
            <h2 className="cine-headline mt-5 text-4xl text-fg sm:text-5xl">Questions, colleges or {accent("teams")}?</h2>
          </div>
          <Link href="/contact" className="btn-secondary btn-lg">
            Contact us
            <Icon as={ArrowRight} />
          </Link>
        </Container>
      </section>

      <FinalCta
        name={scene("about.final")}
        title={<>Make the real day the {accent("second")} time.</>}
        text="Start free with practice sessions and speech analyses. No card needed."
        primary={{ href: "/signup", label: "Start practising" }}
        secondary={{ href: "/product/speaking", label: "See the product" }}
      />
      <SiteFooter />
    </div>
  );
}
