import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, ArrowRight, ClipboardCheck, Lock, Mic } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCategory, getExam, isAvailable, MIN_QUESTIONS_PER_LEVEL } from "@/lib/catalogue";
import { DIFFICULTIES, DIFFICULTY_LABELS, getModeBySlug, type Difficulty } from "@/lib/practice-taxonomy";
import { getEffectivePlan, PLAN_DIFFICULTY_ACCESS } from "@/lib/entitlements";
import { LEGACY_QUESTION_TYPES } from "@/lib/question-validation";
import { Icon } from "@/components/ui/Icon";
import { TrademarkDisclaimer } from "@/components/exam/TrademarkDisclaimer";

type Params = Promise<{ category: string; exam: string }>;

const LEVEL_SUMMARY: Record<Difficulty, string> = {
  BEGINNER: "Fundamentals and straightforward questions.",
  INTERMEDIATE: "More varied questions that need real understanding.",
  ADVANCED: "Complex, multi-step questions and stronger knowledge.",
  EXPERT: "Exam-level difficulty: nuance, speed and mastery.",
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category, exam } = await params;
  const e = getExam(category, exam);
  return e ? { title: `${e.name} practice - VocalisAi`, description: e.summary } : {};
}

// Questions per practice category and level, counted the way practice
// sessions pick them (active, and a type the practice screen can show).
async function questionCounts(categories: string[]): Promise<Map<string, number> | null> {
  if (categories.length === 0) return new Map();
  try {
    const rows = await db.practiceQuestion.groupBy({
      by: ["category", "difficulty"],
      where: { category: { in: categories }, isActive: true, type: { in: LEGACY_QUESTION_TYPES } },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [`${r.category}:${r.difficulty}`, r._count._all]));
  } catch (err) {
    console.error("explore: question counts failed", err);
    return null;
  }
}

async function mockFamilies(slugs: string[]) {
  if (slugs.length === 0) return [];
  try {
    return await db.examFamily.findMany({ where: { slug: { in: slugs }, isActive: true }, select: { slug: true, name: true } });
  } catch (err) {
    console.error("explore: exam families failed", err);
    return [];
  }
}

// Steps three and four: choose a level, then a subject. The level decides
// which question bank every subject opens.
export default async function ExploreExamPage({ params, searchParams }: { params: Params; searchParams: Promise<{ level?: string }> }) {
  const { category: categoryId, exam: examId } = await params;
  const category = getCategory(categoryId);
  const exam = getExam(categoryId, examId);
  if (!category || !exam) notFound();

  const wanted = (await searchParams).level?.toUpperCase();
  const level: Difficulty = DIFFICULTIES.find((d) => d === wanted) ?? "BEGINNER";

  const session = await getServerSession(authOptions);
  const allowed: readonly Difficulty[] = session?.user ? PLAN_DIFFICULTY_ACCESS[await getEffectivePlan(session.user.id)] : PLAN_DIFFICULTY_ACCESS.FREE;
  const levelAllowed = allowed.includes(level);

  const subjects = exam.subjects.map((slug) => getModeBySlug(slug)).filter((m) => m !== undefined);
  const [counts, families] = await Promise.all([questionCounts(subjects.map((m) => m.category)), mockFamilies(exam.mockFamilies ?? [])]);
  const brandStyle = /-style/.test(exam.name);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-6 sm:pt-10">
      <Link href={`/explore/${category.id}`} className="btn-ghost btn-sm -ml-3">
        <Icon as={ArrowLeft} />
        {category.name}
      </Link>
      <h1 className="headline mt-4 text-3xl text-ink-950 sm:text-4xl">{exam.name}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">{exam.summary}</p>

      {isAvailable(exam) && (
        <nav aria-label="Level" className="mt-8">
          <p className="text-sm font-semibold text-ink-950">Choose your level</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {DIFFICULTIES.map((d) => {
              const active = d === level;
              return (
                <li key={d}>
                  <Link
                    href={`?level=${d.toLowerCase()}`}
                    scroll={false}
                    aria-current={active ? "true" : undefined}
                    className={`flex h-full flex-col rounded-xl border p-4 transition-colors ${
                      active ? "border-ink-950 bg-ink-950 text-white" : "border-slate-200 bg-white text-ink-950 hover:border-slate-400"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2 font-semibold">
                      {DIFFICULTY_LABELS[d]}
                      {!allowed.includes(d) && <Icon as={Lock} className={active ? "text-amber-300" : "text-slate-400"} />}
                    </span>
                    <span className={`mt-1 text-xs leading-relaxed ${active ? "text-slate-300" : "text-slate-500"}`}>{LEVEL_SUMMARY[d]}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {!levelAllowed && (
            <p className="mt-3 text-sm text-slate-600">
              {DIFFICULTY_LABELS[level]} is included on paid plans.{" "}
              <Link href={session ? "/billing" : "/signup"} className="font-semibold text-brand-700 hover:underline">
                {session ? "See plans" : "Sign up"} &rarr;
              </Link>
            </p>
          )}
        </nav>
      )}

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="subjects-heading" className="min-w-0">
          <h2 id="subjects-heading" className="eyebrow text-slate-500">
            {isAvailable(exam) ? `Subjects at ${DIFFICULTY_LABELS[level]}` : "Subjects"}
          </h2>
          <ul className="sheet mt-3 divide-y divide-slate-100 overflow-hidden">
            {subjects.map((m) => {
              const count = counts?.get(`${m.category}:${level}`) ?? null;
              const ready = counts === null || (count ?? 0) >= MIN_QUESTIONS_PER_LEVEL;
              return (
                <li key={m.slug} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                  <span className="min-w-0 flex-1 basis-60">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink-950">{m.label}</span>
                      {m.requiresVoice && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                          <Icon as={Mic} size="xs" />
                          Speaking
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">{m.description}</span>
                    {count !== null && ready && <span className="num mt-1 block text-xs text-slate-400">{count} questions at this level</span>}
                  </span>
                  {!ready ? (
                    <span className="text-xs font-semibold text-slate-500">Coming soon at {DIFFICULTY_LABELS[level]}</span>
                  ) : levelAllowed ? (
                    <Link href={`/practice/${m.slug}?level=${level.toLowerCase()}`} className="btn-primary btn-sm">
                      Practise
                      <Icon as={ArrowRight} />
                    </Link>
                  ) : (
                    <Link href={session ? "/billing" : "/signup"} className="btn-secondary btn-sm">
                      <Icon as={Lock} />
                      Unlock
                    </Link>
                  )}
                </li>
              );
            })}
            {(exam.upcoming ?? []).map((name) => (
              <li key={name} className="flex items-center gap-4 px-5 py-4">
                <span className="min-w-0 flex-1 font-semibold text-slate-400">{name}</span>
                <span className="text-xs font-semibold text-slate-400">Coming soon</span>
              </li>
            ))}
          </ul>
          {brandStyle && <TrademarkDisclaimer className="mt-4" />}
        </section>

        <aside aria-label="Mock exams" className="grid gap-4">
          {families.length > 0 && (
            <div className="panel-ink overflow-hidden rounded-[1.25rem] p-6 text-white">
              <p className="eyebrow eyebrow-on-ink">Full mock exams</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">Timed and proctored, in the format of the real test.</p>
              <ul className="mt-4 grid gap-2">
                {families.map((f) => (
                  <li key={f.slug}>
                    <Link href={`/mock-tests?type=${f.slug}`} className="btn-dark btn-sm w-full justify-between">
                      {f.name}
                      <Icon as={ClipboardCheck} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="sheet p-6 text-sm leading-relaxed text-slate-600">
            <p className="font-semibold text-ink-950">How levels work</p>
            <p className="mt-2">Each level has its own questions. Beginner and Intermediate are on the Free plan; Advanced and Expert are on paid plans.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
