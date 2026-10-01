import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { questionCounts, subjectDetail } from "@/lib/catalog-queries";
import { getEffectivePlan, PLAN_DIFFICULTY_ACCESS } from "@/lib/entitlements";
import { Icon } from "@/components/ui/Icon";
import { TestBuilder } from "@/components/explore/TestBuilder";

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
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-6 sm:pt-10">
      <Link href="/explore/skills" className="btn-ghost btn-sm -ml-3">
        <Icon as={ArrowLeft} />
        Practice by skill
      </Link>
      <h1 className="headline mt-4 text-3xl text-ink-950 sm:text-4xl">{subject.name}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
        {subject.description ?? `Practise ${subject.name.toLowerCase()} on its own or one skill at a time, at the level that suits you.`}
      </p>
      <div className="mt-8">
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
  );
}
