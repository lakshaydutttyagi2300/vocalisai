import { notFound } from "next/navigation";
import { getModeBySlug } from "@/lib/practice-taxonomy";
import { PracticeSession } from "@/components/practice/PracticeSession";
import { VoicePracticeSession } from "@/components/practice/VoicePracticeSession";

export default async function PracticeModePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mode = getModeBySlug(slug);
  if (!mode) notFound();

  if (mode.requiresVoice) {
    return <VoicePracticeSession mode={mode} />;
  }

  return <PracticeSession mode={mode} />;
}
