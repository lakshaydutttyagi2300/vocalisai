import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { questionCounts, subjectDetail } from "@/lib/catalog-queries";
import { getEffectivePlan, PLAN_DIFFICULTY_ACCESS } from "@/lib/entitlements";
import { TestBuilder } from "@/components/explore/TestBuilder";
import { MediaHero } from "@/components/ui/MediaHero";
import { CatalogPreview } from "@/components/ui/ContentPreview";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/practice-taxonomy";

type Params = Promise<{ subject: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const s = await subjectDetail((await params).subject).catch(() => null);
  return s ? { title: `${s.name} practice - VocalisAi`, description: s.description ?? `Practise ${s.name} skill by skill, from Beginner to Expert.` } : {};
}

// Skill-first practice for one area: skill, level, mode - no exam needed.
export default async function PracticeAreaPage({ params, searchParams }: { params: Params; searchParams: Promise<{ skill?: string }> }) {
  const subject = await subjectDetail((await params).subject);
  if (!subject) notFound();

  const wantedSkill = (await searchParams).skill;
  const session = await getServerSession(authOptions);
  const [counts, plan] = await Promise.all([questionCounts([subject], null), session?.user ? getEffectivePlan(session.user.id) : Promise.resolve("FREE" as const)]);
  const here = `/explore/skills/${subject.slug}`;

  return (
    <div className="pb-20">
      <MediaHero back={{ label: "Practice by skill", href: "/explore/skills" }} eyebrow="Practice by skill" title={subject.name} subtitle={subject.description ?? `Practise ${subject.name.toLowerCase()} on its own or one skill at a time, at the level that suits you.`} stats={[`${subject.skills.length} skill${subject.skills.length === 1 ? "" : "s"}`, "Beginner to Expert"]} media={[]} visual={<CatalogPreview kicker="Practice by skill" title={subject.name} rows={subject.skills.map((k) => ({ name: k.name, detail: `${DIFFICULTIES.reduce((n, d) => n + (counts[`${subject.id}:${k.id}:${d}`] ?? 0), 0)} questions` }))} levels={DIFFICULTIES.map((d) => ({ label: DIFFICULTY_LABELS[d], count: counts[`${subject.id}:${d}`] ?? 0 }))} />} variant="split" size="md" />
    <div className="page-container mt-10">
      <div>
        <TestBuilder
          examId={null}
          mockMinutes={null}
          subjects={[{ id: subject.id, name: subject.name, description: subject.description, mockQuestionCount: 0, skills: subject.skills }]}
          counts={counts}
          allowedLevels={[...PLAN_DIFFICULTY_ACCESS[plan]]}
          signedIn={Boolean(session?.user)}
          loginHref={`/login?callbackUrl=${encodeURIComponent(here)}`}
          initialSkillId={subject.skills.find((k) => k.slug === wantedSkill)?.id ?? null}
        />
      </div>
    </div>
    </div>
  );
}
