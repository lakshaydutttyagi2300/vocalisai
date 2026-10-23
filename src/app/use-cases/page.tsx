import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { ClipFrame, Container, FinalCta, MediaSplit, PageHero } from "@/components/cine/sections";
import { SiteFooter } from "@/components/cine/SiteFooter";
import { USE_CASES } from "@/components/cine/content";
import { scene } from "@/config/mediaLibrary";

export const metadata: Metadata = {
  title: "Interview and spoken English practice for students and professionals - VocalisAi",
  description: "Job interviews, spoken English and fluency, workplace conversations, placement season and hiring tests: how students, graduates, job seekers and professionals practise with VocalisAi.",
  openGraph: { title: "Interview and spoken English practice for students and professionals - VocalisAi", description: "Job interviews, spoken English and fluency, workplace conversations, placement season and hiring tests: how students, graduates, job seekers and professionals practise with VocalisAi.", siteName: "VocalisAi", type: "website" },
};

const accent = (word: string) => <span className="serif-accent">{word}</span>;

const POINTS: Record<string, string[]> = {
  interviews: ["Tell me about yourself, strengths and weaknesses", "Behavioural and situational questions", "Follow-ups based on your answer", "Feedback on structure, examples and clarity"],
  "spoken-english": ["Speak more naturally, with fewer pauses", "Organise your thoughts before you speak", "Useful vocabulary and sentence formation", "From Beginner to Expert, at your pace"],
  professionals: ["Updates, explanations and opinions", "Conversations with an AI manager", "Professional vocabulary and tone", "Pronunciation and word stress"],
  "campus-placements": ["Aptitude, reasoning and verbal sections", "Company-specific practice: TCS NQT, Infosys and more", "Timed tests like placement day", "Interview rehearsal to finish"],
  "company-assessments": ["Assessment providers and company tests", "Each test's own sections", "Skill-by-skill practice at four levels", "Your weakest skill picked for you"],
  "customer-service": ["Questions, delays and complaints", "Clarity, tone and politeness", "Pace and fillers measured", "Situational judgement practice"],
};

export default function UseCasesPage() {
  return (
    <div className="cine overflow-x-hidden">
      <PageHero
        name={scene("useCases.hero")}
        eyebrow="Who it's for"
        title={<>Built for the {accent("moment")} that matters.</>}
        text="Your first interview, a career move, a meeting tomorrow or simply speaking English with more ease. Whatever you're preparing for, practise it out loud first."
        actions={
          <Link href="/signup" className="btn-primary btn-lg">
            Start practising
            <Icon as={ArrowRight} />
          </Link>
        }
      />

      <nav aria-label="Who it's for" className="sticky top-[4.4rem] z-30 border-b border-line bg-surface/80 backdrop-blur-xl">
        <Container className="flex gap-6 overflow-x-auto py-4 text-sm">
          {USE_CASES.map((u) => (
            <a key={u.id} href={`#${u.id}`} className="whitespace-nowrap text-fg-muted transition-colors hover:text-fg">
              {u.title}
            </a>
          ))}
        </Container>
      </nav>

      {USE_CASES.map((u, i) => (
        <section key={u.id} id={u.id} className={`scroll-mt-32 py-24 sm:py-32 ${i % 2 === 1 ? "bg-surface-muted" : ""}`}>
          <Container>
            <MediaSplit
              reverse={i % 2 === 1}
              eyebrow={`${String(i + 1).padStart(2, "0")} · Who it's for`}
              title={u.title}
              text={u.text}
              points={POINTS[u.id]}
              link={{ href: u.href, label: u.cta }}
              media={<ClipFrame name={scene(`useCases.${u.id}`)} ratio="aspect-[4/3]" />}
            />
          </Container>
        </section>
      ))}

      <FinalCta
        name={scene("useCases.final")}
        title={<>Ready for whatever&rsquo;s {accent("next")}.</>}
        text="Start free with practice sessions and speech analyses. No card needed."
        primary={{ href: "/signup", label: "Start practising" }}
        secondary={{ href: "/product/interviews", label: "Explore interview practice" }}
      />
      <SiteFooter />
    </div>
  );
}
