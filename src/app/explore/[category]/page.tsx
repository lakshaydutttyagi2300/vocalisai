import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { CATALOGUE, getCategory, isAvailable } from "@/lib/catalogue";
import { PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { Icon } from "@/components/ui/Icon";
import { CATEGORY_ICONS } from "@/components/explore/categoryIcons";

const MODE_LABELS = new Map(PRACTICE_MODES.map((m) => [m.slug, m.label]));

export function generateStaticParams() {
  return CATALOGUE.map((c) => ({ category: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const category = getCategory((await params).category);
  return category ? { title: `${category.name} - VocalisAi`, description: category.summary } : {};
}

// Step two: the exams in one category.
export default async function ExploreCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const category = getCategory((await params).category);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-6 sm:pt-10">
      <Link href="/explore" className="btn-ghost btn-sm -ml-3">
        <Icon as={ArrowLeft} />
        All categories
      </Link>
      <div className="mt-4 flex items-start gap-4">
        <span className="hidden h-12 w-12 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:flex">
          <Icon as={CATEGORY_ICONS[category.id]} size="md" />
        </span>
        <div className="min-w-0">
          <h1 className="headline text-3xl text-ink-950 sm:text-4xl">{category.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">{category.summary}</p>
        </div>
      </div>

      <ul aria-label="Exams" className="sheet mt-8 divide-y divide-slate-100 overflow-hidden">
        {category.exams.map((e) => {
          const ready = isAvailable(e);
          return (
            <li key={e.id}>
              <Link href={`/explore/${category.id}/${e.id}`} className="group flex items-start gap-4 px-5 py-5 transition-colors hover:bg-slate-50 sm:px-6">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-display text-lg font-bold text-ink-950 group-hover:text-brand-700">{e.name}</span>
                    {!ready && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Coming soon</span>}
                    {e.mockFamilies && e.mockFamilies.length > 0 && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Mock exams</span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-600">{e.summary}</span>
                  <span className="mt-2 block text-xs text-slate-500">
                    {ready ? e.subjects.map((s) => MODE_LABELS.get(s) ?? s).join(" · ") : (e.upcoming ?? []).join(" · ")}
                  </span>
                </span>
                <Icon as={ArrowUpRight} className="mt-1 flex-none text-slate-300 transition-colors group-hover:text-brand-600" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
