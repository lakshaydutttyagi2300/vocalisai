import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CATALOGUE, isAvailable } from "@/lib/catalogue";
import { Icon } from "@/components/ui/Icon";
import { ExploreSearch } from "@/components/explore/ExploreSearch";
import { CATEGORY_ICONS } from "@/components/explore/categoryIcons";

export const metadata: Metadata = {
  title: "Explore exams - VocalisAi",
  description: "Browse exam practice by category, exam, subject and level: government exams, study abroad English, campus placements, interviews, aptitude and more.",
};

// Category -> Exam -> Subject -> Level, step one. Public, so visitors can see
// what's covered before signing up; starting practice needs an account.
export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-6 sm:pt-10">
      <p className="eyebrow">Explore</p>
      <h1 className="headline mt-3 text-3xl text-ink-950 sm:text-4xl">Find your exam</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
        Pick a category, then your exam. Every subject comes in four levels, Beginner to Expert, each with its own questions.
      </p>

      <div className="mt-8">
        <ExploreSearch />
      </div>

      <ul aria-label="Categories" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATALOGUE.map((c, i) => {
          const ready = c.exams.filter(isAvailable).length;
          const soon = c.exams.length - ready;
          return (
            // First and last tiles span two columns so ten tiles fill four rows of three.
            <li key={c.id} className={i === 0 || i === CATALOGUE.length - 1 ? "lg:col-span-2" : undefined}>
              <Link href={`/explore/${c.id}`} className="sheet group flex h-full flex-col p-6 transition-colors hover:border-brand-200">
                <span className="flex items-start justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon as={CATEGORY_ICONS[c.id]} size="md" />
                  </span>
                  <Icon as={ArrowUpRight} className="text-slate-300 transition-colors group-hover:text-brand-600" />
                </span>
                <span className="mt-5 block font-display text-lg font-bold text-ink-950">{c.name}</span>
                <span className="mt-1.5 block flex-1 text-sm leading-relaxed text-slate-600">{c.summary}</span>
                <span className="mt-4 block text-xs font-semibold text-slate-500">
                  {ready > 0 ? `${ready} exam${ready === 1 ? "" : "s"} ready` : "Coming soon"}
                  {ready > 0 && soon > 0 && <span className="font-normal text-slate-400"> · {soon} coming soon</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
