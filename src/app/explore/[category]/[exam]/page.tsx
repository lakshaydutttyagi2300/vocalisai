import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { currentExamCategory, examDetail, questionCountsForExam, sectionNames } from "@/lib/catalog-queries";
import { getEffectivePlan, PLAN_DIFFICULTY_ACCESS } from "@/lib/entitlements";
import { Icon } from "@/components/ui/Icon";
import { TestBuilder } from "@/components/explore/TestBuilder";

type Params = Promise<{ category: string; exam: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category, exam } = await params;
  const e = await examDetail(category, exam).catch(() => null);
  return e ? { title: `${e.name} practice - VocalisAi`, description: e.description ?? `Practise for ${e.name} section by section, at the level that suits you.` } : {};
}

// Exam-first practice: section / subject / skill, level, mode - then start.
export default async function ExploreExamPage({ params }: { params: Params }) {
  const { category, exam: examSlug } = await params;
  const exam = await examDetail(category, examSlug);
  if (!exam) {
    // Moved to another category (e.g. TCS NQT out of the old Campus Placement): follow it.
    // No longer offered: back to Explore rather than a dead end.
    const moved = await currentExamCategory(examSlug);
    redirect(moved ? `/explore/${moved}/${examSlug}` : "/explore");
  }

  const session = await getServerSession(authOptions);
  const [counts, plan] = await Promise.all([questionCountsForExam(exam), session?.user ? getEffectivePlan(session.user.id) : Promise.resolve("FREE" as const)]);
  const here = `/explore/${exam.category.slug}/${exam.slug}`;
  const sections = sectionNames(exam.subjects);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-6 sm:pt-10">
      <Link href={`/explore/${exam.category.slug}`} className="btn-ghost btn-sm -ml-3">
        <Icon as={ArrowLeft} />
        {exam.category.name}
      </Link>
      {exam.groupName && <p className="eyebrow mt-4">{exam.groupName}</p>}
      <h1 className={`headline text-3xl text-ink-950 sm:text-4xl ${exam.groupName ? "mt-2" : "mt-4"}`}>{exam.name}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
        {exam.description ?? `Practise the ${sections.join(", ")} sections, skill by skill, at the level that suits you.`}
      </p>

      <div className="mt-8">
        {exam.subjects.length === 0 ? (
          <p className="sheet p-6 text-sm text-slate-600">Sections for this assessment are being set up. Please check back soon.</p>
        ) : (
          <TestBuilder
            examId={exam.id}
            mockMinutes={exam.mockMinutes}
            subjects={exam.subjects.map((s) => ({
              id: s.subject.id,
              name: s.subject.name,
              description: s.subject.description,
              mockQuestionCount: s.mockQuestionCount,
              skills: s.subject.skills,
              section: s.sectionName,
            }))}
            counts={counts}
            allowedLevels={[...PLAN_DIFFICULTY_ACCESS[plan]]}
            signedIn={Boolean(session?.user)}
            loginHref={`/login?callbackUrl=${encodeURIComponent(here)}`}
          />
        )}
      </div>
      <p className="mt-8 max-w-2xl text-xs leading-relaxed text-slate-400">
        Practice questions are written by VocalisAi to match the skills these assessments test. VocalisAi is not affiliated with or endorsed by the companies or test providers named.
      </p>
    </div>
  );
}
