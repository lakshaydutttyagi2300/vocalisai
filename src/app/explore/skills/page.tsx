import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { skillFirstAreas } from "@/lib/catalog-queries";
import { Icon } from "@/components/ui/Icon";
import { SpeakingPracticeLinks } from "@/components/explore/SpeakingPracticeLinks";
import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";

export const metadata: Metadata = {
  title: "Practice by skill - VocalisAi",
  description: "Practise quantitative aptitude, reasoning, verbal ability, English, situational judgement and more, skill by skill, without choosing a company first.",
};

// Skill-first practice: pick a practice area, no company or exam needed.
// The same question bank as the company assessments.
export default async function PracticeBySkillPage() {
  const groups = await skillFirstAreas().catch((err) => {
    console.error("explore: skill areas failed", err);
    return [];
  });

  return (
    <div className="pb-20">
      <MediaHero {...HEROES.exploreSkills} back={{ label: "Explore", href: "/explore" }} subtitle="Weak in reasoning? Start there. These are the same questions behind the company and provider assessments, at Beginner to Expert level." />
    <div className="page-container mt-2">
      {groups.map((g) => (
        <section key={g.slug} aria-labelledby={`group-${g.slug}`} className="mt-10">
          <h2 id={`group-${g.slug}`} className="eyebrow text-slate-500">
            {g.name}
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.subjects.map((s) => (
              <li key={s.slug}>
                <Link href={`/explore/skills/${s.slug}`} className="sheet group flex h-full items-start justify-between gap-4 p-5 transition-colors hover:border-brand-200">
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink-950 group-hover:text-brand-700">{s.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">{s.skillCount > 0 ? `${s.skillCount} skills` : "Practice questions"}</span>
                  </span>
                  <Icon as={ArrowUpRight} className="mt-0.5 flex-none text-fg-muted transition-colors group-hover:text-brand-600" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="mt-10">
        <SpeakingPracticeLinks />
      </div>
    </div>
    </div>
  );
}
