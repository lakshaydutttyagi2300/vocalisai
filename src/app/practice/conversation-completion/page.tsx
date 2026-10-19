import { db } from "@/lib/db";
import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";
import { servableWhere } from "@/lib/practice-bank";
import { ConversationCompletionStart, type LevelCount } from "@/components/practice/ConversationCompletionStart";

export const metadata = { title: "Conversation completion test - VocalisAi" };
export const dynamic = "force-dynamic";

// Short workplace conversations that stop where someone must reply: choose
// the best of four replies. The questions are the "conversation-completion"
// skill of the Situational Judgement bank, run by the catalogue practice
// tests (scored at the end, answers checked on the server).
export default async function ConversationCompletionPage() {
  const skill = await db.catalogSkill.findFirst({
    where: { slug: "conversation-completion", isActive: true, subject: { slug: "situational-judgement", isActive: true } },
    select: { id: true, subjectId: true },
  });
  const counts = skill
    ? await db.practiceQuestion.groupBy({ by: ["difficulty"], where: { AND: [servableWhere(), { catalogSkillId: skill.id }] }, _count: { _all: true } })
    : [];
  const levels: LevelCount[] = counts.map((c) => ({ difficulty: c.difficulty, count: c._count._all }));

  return (
    <div className="pb-20">
      <MediaHero {...HEROES.goal} eyebrow="Practice" title="Conversation completion test" subtitle="Read a short workplace conversation and choose the best reply from four options - like the situational judgement rounds in international hiring tests." />
      <div className="page-container mt-10 max-w-3xl">
        <ConversationCompletionStart subjectId={skill?.subjectId ?? null} skillId={skill?.id ?? null} levels={levels} />
      </div>
    </div>
  );
}
