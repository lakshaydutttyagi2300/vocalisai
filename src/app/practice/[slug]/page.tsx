import { notFound } from "next/navigation";
import { DIFFICULTIES, getModeBySlug } from "@/lib/practice-taxonomy";
import { PracticeSession } from "@/components/practice/PracticeSession";
import { VoicePracticeSession } from "@/components/practice/VoicePracticeSession";

export default async function PracticeModePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ level?: string }>;
}) {
  const { slug } = await params;
  const mode = getModeBySlug(slug);
  if (!mode) notFound();

  // ?level=advanced (from an exam page) highlights that level; the candidate still presses it.
  const wanted = (await searchParams).level?.toUpperCase();
  const suggestedLevel = DIFFICULTIES.find((d) => d === wanted) ?? null;

  if (mode.requiresVoice) {
    return <VoicePracticeSession mode={mode} suggestedLevel={suggestedLevel} />;
  }

  return <PracticeSession mode={mode} suggestedLevel={suggestedLevel} />;
}
