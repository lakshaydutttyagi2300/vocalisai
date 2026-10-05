import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowUpRight } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { Icon } from "@/components/ui/Icon";
import { CineHero, type CineSlide } from "@/components/cine/CineHero";
import { CineVideo } from "@/components/cine/CineVideo";
import { AnalysisDemo, ConversationDemo, WalkthroughDemo } from "@/components/cine/demos";
import { FadeIn } from "@/components/cine/FadeIn";
import { ClipFrame, Container, FinalCta, MediaSplit, SectionIntro, TextLink } from "@/components/cine/sections";
import { SiteFooter } from "@/components/cine/SiteFooter";
import { Waveform } from "@/components/cine/Waveform";
import { FEATURES, SPEECH_DIMENSIONS, USE_CASES } from "@/components/cine/content";
import { LIBRARY, scene } from "@/config/mediaLibrary";

export const metadata: Metadata = {
  title: "VocalisAi - AI speaking, interview and hiring-test practice",
  description:
    "Practise speaking, interviews and company hiring tests with AI feedback on every answer: pronunciation, fluency, grammar and pace, AI interview role-play, and timed mock tests for AMCAT, TCS NQT and more.",
};

// Live product figures. The page must never fail because the database is
// unreachable, so it renders without them instead.
async function loadFigures() {
  try {
    const [questions, assessments] = await Promise.all([
      db.practiceQuestion.count({ where: { isActive: true, archivedAt: null } }),
      db.catalogExam.count({ where: { isActive: true } }),
    ]);
    return { questions, assessments };
  } catch (err) {
    console.error("landing page: figures unavailable", err);
    return null;
  }
}

function roundDown(n: number, step: number) {
  return `${(Math.floor(n / step) * step).toLocaleString("en-US")}+`;
}

const accent = (word: string) => <span className="serif-accent">{word}</span>;

export default async function LandingPage() {
  const [session, figures] = await Promise.all([getServerSession(authOptions), loadFigures()]);
  const signedIn = Boolean(session);
  const start = signedIn ? "/dashboard" : "/signup";

  const slides: CineSlide[] = [
    {
      name: scene("home.hero.speaking"),
      label: "Speaking",
      eyebrow: "AI speaking practice",
      title: <>Give every answer a {accent("confident")} voice.</>,
      text: "Answer out loud and get feedback on pronunciation, fluency, grammar and pace that quotes your own words.",
      cta: { label: "Start speaking", href: signedIn ? "/practice/speaking" : "/signup" },
      alt: LIBRARY[scene("home.hero.speaking")].alt,
    },
    {
      name: scene("home.hero.interviews"),
      label: "Interviews",
      eyebrow: "AI interviews",
      title: <>Rehearse the interview {accent("before")} it&rsquo;s real.</>,
      text: "An AI interviewer listens to your answer and asks the next question, just like a real panel.",
      cta: { label: "Try an AI interview", href: signedIn ? "/practice/conversation" : "/product/interviews" },
      alt: LIBRARY[scene("home.hero.interviews")].alt,
    },
    {
      name: scene("home.hero.analysis"),
      label: "Feedback",
      eyebrow: "Speech analysis",
      title: <>Hear how you {accent("really")} sound.</>,
      text: "Every recording is transcribed and rated on six dimensions, so you know exactly what to fix next.",
      cta: { label: "See speech analysis", href: "/product/speaking" },
      alt: LIBRARY[scene("home.hero.analysis")].alt,
      overlay: <AnalysisDemo />,
    },
    {
      name: scene("home.hero.companyTests"),
      label: "Company tests",
      eyebrow: "Hiring assessments",
      title: <>Clear the {accent("aptitude")} round.</>,
      text: "Reasoning, aptitude and English for AMCAT, TCS NQT, Infosys and more, skill by skill.",
      cta: { label: "Explore exams", href: "/explore" },
      alt: LIBRARY[scene("home.hero.companyTests")].alt,
    },
    {
      name: scene("home.hero.customerService"),
      label: "Customer calls",
      eyebrow: "Role-play",
      title: <>Sound ready for the {accent("customer")} on the line.</>,
      text: "Practise real customer and workplace conversations with an AI that replies to what you said.",
      cta: { label: "See use cases", href: "/use-cases" },
      alt: LIBRARY[scene("home.hero.customerService")].alt,
    },
    {
      name: scene("home.hero.spokenEnglish"),
      label: "Your plan",
      eyebrow: "Personalised practice",
      title: <>Practice that {accent("knows")} you.</>,
      text: "Pick your goal. Your weakest skills come first, at your level, with no repeated questions.",
      cta: { label: signedIn ? "Open my plan" : "Start free", href: signedIn ? "/goal" : "/signup" },
      alt: LIBRARY[scene("home.hero.spokenEnglish")].alt,
    },
  ];

  const facts = [
    figures && figures.questions >= 100 ? { value: roundDown(figures.questions, 100), label: "practice questions, unseen ones first" } : null,
    figures && figures.assessments > 0 ? { value: String(figures.assessments), label: "company, entrance and professional assessments" } : null,
    { value: String(PRACTICE_MODES.length), label: "practice modes, from grammar to role-play" },
    { value: "4", label: "levels for every skill, Beginner to Expert" },
  ].filter((f): f is { value: string; label: string } => f !== null);

  return (
    <div className="cine overflow-x-hidden">
      <CineHero
        slides={slides}
        heading="VocalisAi: practise speaking, interviews and hiring tests with AI feedback"
        secondary={{ label: "See how it works", href: "#platform" }}
      />

      {/* 2. One platform. Every voice. */}
      <section id="platform" className="scroll-mt-20 py-28 sm:py-40">
        <Container>
          <SectionIntro
            eyebrow="The platform"
            title={<>One platform. Every {accent("voice")}.</>}
            text="Everything you need to sound ready: speaking, conversation, listening and real test conditions, in one place."
          />
          <div className="mt-16 grid gap-x-6 gap-y-14 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={(i % 2) * 120}>
                <article className="group">
                  <ClipFrame name={scene(`home.feature.${f.id}`)} ratio="aspect-[16/10]" mode="hover" />
                  <h3 className="cine-headline mt-6 text-2xl text-fg">{f.title}</h3>
                  <p className="mt-2 max-w-md leading-relaxed text-fg-muted">{f.text}</p>
                </article>
              </FadeIn>
            ))}
          </div>
        </Container>
      </section>

      {/* 3. Voice: a large cinematic visual with the waveform over it. */}
      <section className="px-2 sm:px-3">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-line">
          <div className="absolute inset-0">
            <CineVideo name={scene("home.voice")} />
          </div>
          <div aria-hidden="true" className="scrim-left absolute inset-0" />
          <div aria-hidden="true" className="scrim-bottom absolute inset-0" />
          <Container className="relative py-28 sm:py-40">
            <FadeIn className="max-w-2xl">
              <p className="cine-eyebrow">Speech analysis</p>
              <h2 className="cine-display mt-5 text-5xl text-fg sm:text-7xl">Feedback on the {accent("voice")}, not just the words.</h2>
              <p className="cine-lede mt-6 text-fg-muted">
                VocalisAi listens to how you speak: the sounds you stress, the pauses you leave, the fillers you use and how fast you go. Every comment quotes your
                own words, with the fix beside it.
              </p>
              <dl className="mt-10 grid gap-x-10 gap-y-5 sm:grid-cols-2">
                {SPEECH_DIMENSIONS.map(([name, text]) => (
                  <div key={name}>
                    <dt className="text-sm font-medium text-fg">{name}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-fg-muted">{text}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-10">
                <TextLink href="/product/speaking">How speech analysis works</TextLink>
              </div>
            </FadeIn>
            <Waveform bars={72} className="mt-16 h-16 opacity-80" />
          </Container>
        </div>
      </section>

      {/* 4. AI interviews: from a question to a confident answer. */}
      <section className="py-28 sm:py-40">
        <Container>
          <MediaSplit
            eyebrow="AI interviews and role-play"
            title={<>From question to {accent("confident")} answer.</>}
            text="Speak your answer to an AI interviewer, customer or manager. It replies to what you actually said, asks the follow-up a real person would, and then shows what worked and what to add."
            points={["Job interviews, customer calls and casual conversation", "Replies to your words, not a script", "Feedback on structure, examples and results", "As many rounds as your plan allows"]}
            link={{ href: "/product/interviews", label: "See AI interviews" }}
            media={
              <div className="relative">
                <ClipFrame name={scene("home.interviews")} ratio="aspect-[4/3]" />
                <ConversationDemo className="relative -mt-24 ml-auto w-[92%] sm:-mr-6 sm:w-[24rem]" />
              </div>
            }
          />
        </Container>
      </section>

      {/* 5. Personalised practice. */}
      <section className="pb-28 sm:pb-40">
        <Container>
          <MediaSplit
            reverse
            eyebrow="Personalised practice"
            title={<>Practice that {accent("knows")} you.</>}
            text="Tell VocalisAi what you're preparing for. Your plan puts the skills that matter for it first, every answer updates your skill scores, and the next questions go straight to what's weakest."
            points={["A plan for your goal", "Weakest skills first", "Beginner to Expert, at your level", "No repeated questions until a topic runs out"]}
            link={{ href: "/product/personalised", label: "See personalised practice" }}
            media={
              <ClipFrame name={scene("home.practice")} ratio="aspect-[4/5] sm:aspect-[4/3]">
                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur-md sm:inset-x-6 sm:bottom-6">
                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-accent-strong">Your skills · Example</p>
                  <ul className="mt-3 grid gap-2.5 text-xs">
                    {(
                      [
                        ["Tenses", "Mastered", 92],
                        ["Listening for detail", "Proficient", 74],
                        ["Word stress", "Next up", 38],
                      ] as const
                    ).map(([skill, band, value]) => (
                      <li key={skill} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
                        <span className="text-fg-muted">{skill}</span>
                        <span className="text-fg-subtle">{band}</span>
                        <span className="col-span-2 h-1 overflow-hidden rounded-full bg-fg/10">
                          <span className="block h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ClipFrame>
            }
          />
        </Container>
      </section>

      {/* 6. Use cases as large visual panels. */}
      <section className="pb-28 sm:pb-40">
        <Container>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionIntro eyebrow="Use cases" title={<>Built for the {accent("moment")} that matters.</>} />
            <TextLink href="/use-cases">All use cases</TextLink>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-12">
            {USE_CASES.map((u, i) => (
              <FadeIn key={u.id} delay={(i % 4) * 90} className={i < 2 ? "md:col-span-6" : "md:col-span-6 lg:col-span-3"}>
                <Link href={u.href} className="group relative block overflow-hidden rounded-[1.5rem] ring-1 ring-line">
                  <div className={`relative ${i < 2 ? "aspect-[16/11]" : "aspect-[16/11] lg:aspect-[3/4]"}`}>
                    <CineVideo name={scene(`home.useCase.${u.id}`)} mode="hover" className="transition-transform duration-700 group-hover:scale-[1.04]" />
                    <div aria-hidden="true" className="scrim-bottom absolute inset-0" />
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <h3 className="cine-headline text-2xl text-fg">{u.title}</h3>
                      <p className="mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">{u.text}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-strong">
                        {u.cta}
                        <Icon as={ArrowUpRight} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </Container>
      </section>

      {/* 7. Product walkthrough. */}
      <section className="border-y border-line bg-surface-muted py-28 sm:py-40">
        <Container>
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <SectionIntro
                eyebrow="In the product"
                title={<>Choose. Answer. {accent("Improve")}.</>}
                text="Pick a company test, a section and a skill. Answer at your level. See your score, your weakest skill and what to practise next."
              />
              <ol className="mt-10 grid gap-5">
                {[
                  ["Choose", "A company, assessment or skill, then your level and how you want to practise."],
                  ["Answer", "Untimed practice with instant explanations, or a timed test like the real one."],
                  ["Review", "Your score, every answer explained, and your weakest skill picked for next time."],
                ].map(([t, d], i) => (
                  <FadeIn key={t} delay={i * 100}>
                    <li className="flex gap-4">
                      <span className="num flex h-8 w-8 flex-none items-center justify-center rounded-full border border-line text-xs text-accent-strong">{i + 1}</span>
                      <div>
                        <p className="font-medium text-fg">{t}</p>
                        <p className="mt-1 text-sm leading-relaxed text-fg-muted">{d}</p>
                      </div>
                    </li>
                  </FadeIn>
                ))}
              </ol>
            </div>
            <FadeIn delay={150}>
              <WalkthroughDemo />
            </FadeIn>
          </div>
        </Container>
      </section>

      {/* 8. Trust: real product figures only. */}
      <section className="py-24 sm:py-32">
        <Container>
          <FadeIn>
            <dl className={`grid gap-px overflow-hidden rounded-[1.5rem] bg-accent-softer ring-1 ring-line sm:grid-cols-2 ${facts.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
              {facts.map((f) => (
                <div key={f.label} className="bg-bg p-8">
                  <dt className="sr-only">{f.label}</dt>
                  <dd className="cine-display text-5xl text-fg">{f.value}</dd>
                  <dd className="mt-3 text-sm leading-relaxed text-fg-muted">{f.label}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 max-w-3xl text-xs leading-relaxed text-fg-subtle">
              Figures come straight from the live question bank and catalogue. Practice material is written by VocalisAi; we are not affiliated with or endorsed by
              the employers or test providers named.
            </p>
          </FadeIn>
        </Container>
      </section>

      {/* 9. Final call to action. */}
      <FinalCta
        name={scene("home.final")}
        title={<>Your next opportunity starts with your {accent("voice")}.</>}
        text="Start free with practice sessions and speech analyses. No card needed."
        primary={{ href: start, label: signedIn ? "Go to your dashboard" : "Start practising" }}
        secondary={{ href: "/pricing", label: "See pricing" }}
      />
      <SiteFooter />
    </div>
  );
}
