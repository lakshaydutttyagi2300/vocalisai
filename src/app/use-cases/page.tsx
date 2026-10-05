import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { ClipFrame, Container, FinalCta, MediaSplit, PageHero } from "@/components/cine/sections";
import { SiteFooter } from "@/components/cine/SiteFooter";
import { USE_CASES } from "@/components/cine/content";
import { scene } from "@/config/mediaLibrary";

export const metadata: Metadata = {
  title: "Use cases - VocalisAi",
  description: "Campus placements, company assessments, job interviews, customer service, workplace English and everyday spoken English: how people use VocalisAi.",
};

const accent = (word: string) => <span className="serif-accent">{word}</span>;

const POINTS: Record<string, string[]> = {
  "campus-placements": ["Aptitude, reasoning and verbal sections", "Company-specific practice: TCS NQT, Infosys and more", "Timed tests like placement day", "Interview rehearsal to finish"],
  "company-assessments": ["Assessment providers and company tests", "Each test's own sections", "Skill-by-skill practice at four levels", "Your weakest skill picked for you"],
  interviews: ["Tell me about yourself, strengths, a time you...", "Follow-ups based on your answer", "Feedback on structure and examples", "Grammar and phrasing fixes"],
  "customer-service": ["Upset customers, delays, refunds", "Clarity, tone and politeness", "Pace and fillers measured", "Situational judgement practice"],
  professionals: ["Presentations and meeting updates", "Pronunciation and word stress", "Professional vocabulary", "Fluency without fillers"],
  "spoken-english": ["Grammar and vocabulary foundations", "Listening with natural voices", "Read aloud and pronunciation", "From Beginner to Expert"],
};

export default function UseCasesPage() {
  return (
    <div className="cine overflow-x-hidden">
      <PageHero
        name={scene("useCases.hero")}
        eyebrow="Use cases"
        title={<>Built for the {accent("moment")} that matters.</>}
        text="A placement test, an interview, a customer on the line, a presentation tomorrow. Whatever you're preparing for, practise it the way it will happen."
        actions={
          <Link href="/signup" className="btn-primary btn-lg">
            Start practising
            <Icon as={ArrowRight} />
          </Link>
        }
      />

      <nav aria-label="Use cases" className="sticky top-[4.4rem] z-30 border-b border-line bg-surface/80 backdrop-blur-xl">
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
              eyebrow={`${String(i + 1).padStart(2, "0")} · Use case`}
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
        secondary={{ href: "/explore", label: "Explore exams" }}
      />
      <SiteFooter />
    </div>
  );
}
