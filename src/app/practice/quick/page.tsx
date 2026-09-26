import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    </div>
  );
}
