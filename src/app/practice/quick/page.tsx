import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { getModeBySlug } from "@/lib/practice-taxonomy";

// A small, curated set of fast entry points - not every category, per the
// "don't overwhelm with choices" rule. Each still goes through the normal,
// already-tested practice flow (difficulty pick, then questions) - this
// page is just a faster way to land on a mode, not a new test system.
const QUICK_DRILLS = [
  { slug: "speaking", label: "Quick Speaking Drill", minutes: 5 },
  { slug: "listening", label: "Quick Listening Drill", minutes: 5 },
  { slug: "pronunciation", label: "Quick Pronunciation Drill", minutes: 5 },
  { slug: "grammar", label: "Quick Grammar Drill", minutes: 5 },
  { slug: "vocabulary", label: "Quick Vocabulary Drill", minutes: 5 },
  { slug: "writing", label: "Quick Writing Drill", minutes: 10 },
];

// Skills platform: instantly-marked drills on one skill area, aimed at the
// candidate's level (see /skills for every skill).
const SKILL_DRILLS = [
  { skillId: "QNT", label: "Numerical Aptitude Drill", description: "Percentages, ratios, averages, interest, time and distance." },
  { skillId: "REA", label: "Logical Reasoning Drill", description: "Series, coding, directions, blood relations, syllogisms." },
  { skillId: "VRB", label: "Verbal Reasoning Drill", description: "True / false / cannot say, critical reasoning, sentence order." },
];

export default function QuickPracticePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/practice" className="btn-ghost btn-sm -ml-3">
        <Icon as={ArrowLeft} />
        Back to Practice
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink-950">Quick Practice</h1>
      <p className="mt-1 text-sm text-slate-600">
        No full session, no browsing - jump straight into a short drill. Pick a difficulty on the
        next screen and go.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {QUICK_DRILLS.map((drill) => {
          const mode = getModeBySlug(drill.slug);
          if (!mode) return null;
          return (
            <Link
              key={drill.slug}
              href={`/practice/${drill.slug}`}
              className="card block p-5 transition hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display font-bold text-ink-900">{drill.label}</h2>
                <span className="badge badge-neutral flex-none">~{drill.minutes} min</span>
              </div>
              <p className="mt-1.5 text-sm text-slate-600">{mode.description}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-950">Quick Skill Drills</h2>
          <p className="mt-0.5 text-sm text-slate-600">5-10 questions, instant feedback, pitched at your level.</p>
        </div>
        <Link href="/skills" className="btn-ghost btn-sm flex-none">
          All my skills
          <Icon as={ArrowRight} />
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SKILL_DRILLS.map((drill) => (
          <Link key={drill.skillId} href={`/skills/drill/${drill.skillId}`} className="card block p-5 transition hover:border-brand-300 hover:shadow-md">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-bold text-ink-900">{drill.label}</h3>
              <span className="badge badge-neutral flex-none">~5 min</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-600">{drill.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
