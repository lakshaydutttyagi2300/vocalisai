import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { TRACK_COPY } from "@/lib/goal-tracks";
import { Icon } from "@/components/ui/Icon";
import GoalExplorer, { type GoalOption } from "@/components/landing/GoalExplorer";
import { FadeIn } from "@/components/cine/FadeIn";
import { ClipFrame, Container, FinalCta, MediaSplit, PageHero, SectionIntro } from "@/components/cine/sections";
import { SiteFooter } from "@/components/cine/SiteFooter";
import { scene } from "@/config/mediaLibrary";

export const metadata: Metadata = {
  title: "Personalised practice - VocalisAi",
  description: "Choose your goal and VocalisAi builds your practice around it: the skills that matter first, your weakest skills next, at your level, with no repeated questions.",
};

const accent = (word: string) => <span className="serif-accent">{word}</span>;

async function loadGoals(): Promise<GoalOption[]> {
  try {
    const tracks = await db.goalTrack.findMany({ where: { enabled: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } });
    return tracks.filter((t) => TRACK_COPY[t.slug]).map((t) => ({ slug: t.slug, name: t.name, ...TRACK_COPY[t.slug] }));
  } catch (err) {
    console.error("personalised page: goals unavailable", err);
    return [];
  }
}

const LEVELS = [
  ["Beginner", "Fundamentals, one idea at a time"],
  ["Intermediate", "Real understanding, mixed ideas"],
  ["Advanced", "Multi-step, harder questions"],
  ["Expert", "Exam-level mastery"],
];

export default async function PersonalisedPage() {
  const [session, goals] = await Promise.all([getServerSession(authOptions), loadGoals()]);
  return (
    <div className="cine overflow-x-hidden">
      <PageHero
        name={scene("personalised.hero")}
        eyebrow="Personalised practice"
        title={<>Practice that {accent("knows")} you.</>}
        text="Tell VocalisAi what you're preparing for. Your plan puts the skills that matter for it first, and every answer moves the next question closer to what you need."
        actions={
          <>
            <Link href={session ? "/goal/choose" : "/signup"} className="btn-primary btn-lg">
              Choose my goal
              <Icon as={ArrowRight} />
            </Link>
            <Link href="/explore" className="btn-secondary btn-lg">
              Explore exams
            </Link>
          </>
        }
      />

      {goals.length > 0 && (
        <section className="py-28 sm:py-40">
          <Container>
            <SectionIntro eyebrow="Your goal" title={<>Start from what you&rsquo;re {accent("preparing")} for.</>} text="Each goal comes with its own plan: the skills it needs, in the order to practise them." />
            <div className="mt-14">
              <GoalExplorer goals={goals} ctaHref={session ? "/goal/choose" : "/signup"} />
            </div>
          </Container>
        </section>
      )}

      <section className={goals.length > 0 ? "pb-28 sm:pb-40" : "py-28 sm:py-40"}>
        <Container>
          <MediaSplit
            eyebrow="Skill by skill"
            title={<>Your weakest skill, {accent("first")}.</>}
            text="Every answer updates a mastery score for the skill it tested, with recent and harder answers counting more. Weak-area practice then picks the questions you most need."
            points={["A mastery score for every skill", "Recent and harder answers count more", "Weak-area tests built for you", "Progress you can see week by week"]}
            media={
              <ClipFrame name={scene("personalised.progress")} ratio="aspect-[4/3]">
                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur-md sm:inset-x-6 sm:bottom-6">
                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-accent-strong">Your skills · Example</p>
                  <ul className="mt-3 grid gap-2.5 text-xs">
                    {(
                      [
                        ["Syllogism", "Mastered", 90],
                        ["Reading for inference", "Proficient", 72],
                        ["Data sufficiency", "Next up", 41],
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

      <section className="border-y border-line bg-surface-muted py-28 sm:py-36">
        <Container>
          <SectionIntro eyebrow="Levels" title={<>Four levels. Never the {accent("same")} question twice.</>} text="Every skill runs from Beginner to Expert, and questions you've already seen wait until you've worked through the new ones." />
          <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LEVELS.map(([name, text], i) => (
              <FadeIn key={name} delay={i * 100}>
                <li className="cine-surface h-full p-7">
                  <div className="flex gap-1.5" aria-hidden="true">
                    {LEVELS.map((_, j) => (
                      <span key={j} className={`h-1 flex-1 rounded-full ${j <= i ? "bg-accent" : "bg-fg/10"}`} />
                    ))}
                  </div>
                  <p className="cine-headline mt-8 text-2xl text-fg">{name}</p>
                  <p className="mt-2 text-sm text-fg-muted">{text}</p>
                </li>
              </FadeIn>
            ))}
          </ol>
        </Container>
      </section>

      <FinalCta
        name={scene("personalised.final")}
        title={<>Built around your {accent("next")} step.</>}
        text="Pick a goal and start free. No card needed."
        primary={{ href: session ? "/goal/choose" : "/signup", label: "Choose my goal" }}
        secondary={{ href: "/pricing", label: "See pricing" }}
      />
      <SiteFooter />
    </div>
  );
}
