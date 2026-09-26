import { notFound } from "next/navigation";
import { SkillQuiz } from "@/components/skills/SkillQuiz";
import { findVisibleSkill } from "@/lib/skills/drills";
import { displayName } from "@/lib/skills/taxonomy";

export const metadata = { title: "Find my weak spots - VocalisAi" };

export default async function SkillDiagnosticPage({ params }: { params: Promise<{ category: string }> }) {
  const code = (await params).category.toUpperCase();
  const category = await findVisibleSkill(code);
  if (!category || category.depth !== 1) notFound();

  return (
    <SkillQuiz
      kind="diagnostic"
      category={code}
      title={`Find my weak spots: ${displayName(category)}`}
      subtitle="A short check across every part of this area. You'll see which parts are strong, which need work, and the drills to fix them."
      questionCount={10}
    />
  );
}
