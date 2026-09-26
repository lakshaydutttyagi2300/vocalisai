import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { SkillQuiz } from "@/components/skills/SkillQuiz";
import { authOptions } from "@/lib/auth";
import { countDrillable, DRILL_DEFAULT, findVisibleSkill } from "@/lib/skills/drills";
import { displayName } from "@/lib/skills/taxonomy";

export const metadata = { title: "Skill Drill - VocalisAi" };

export default async function SkillDrillPage({ params }: { params: Promise<{ skillId: string }> }) {
  const { skillId } = await params;
  const session = await getServerSession(authOptions);
  const skill = await findVisibleSkill(decodeURIComponent(skillId));
  if (!skill) notFound();

  const available = await countDrillable(skill.id, session!.user.id);
  if (available === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        <Link href="/skills" className="btn-ghost btn-sm -ml-3">
          <Icon as={ArrowLeft} />
          Back to my skills
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink-950">{displayName(skill)}</h1>
        <p className="mt-2 text-sm text-slate-600">
          There are no quick-drill questions for this skill on your plan yet. Try a related skill from your skills page.
        </p>
      </div>
    );
  }

  return (
    <SkillQuiz
      kind="drill"
      skillId={skill.id}
      title={`${displayName(skill)} - Quick Drill`}
      subtitle="Short, focused practice on one skill, pitched just above where you are now."
      questionCount={Math.min(DRILL_DEFAULT, available)}
    />
  );
}
