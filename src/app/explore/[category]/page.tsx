import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Star } from "lucide-react";
import { db } from "@/lib/db";
import { Icon } from "@/components/ui/Icon";
import { categoryIcon } from "@/components/explore/categoryIcons";

async function loadCategory(slug: string) {
  return db.catalogCategory.findFirst({
    where: { slug, isActive: true },
    select: {
      slug: true,
      name: true,
      description: true,
      exams: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { slug: true, name: true, description: true, isPopular: true, subjects: { where: { subject: { isActive: true } }, orderBy: { sortOrder: "asc" }, select: { subject: { select: { name: true } } } } },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const category = await loadCategory((await params).category).catch(() => null);
  return category ? { title: `${category.name} - VocalisAi`, description: category.description ?? undefined } : {};
}

// Step two: the exams in one category.
export default async function ExploreCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const category = await loadCategory((await params).category);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-6 sm:pt-10">
      <Link href="/explore" className="btn-ghost btn-sm -ml-3">
        <Icon as={ArrowLeft} />
        All categories
      </Link>
      <div className="mt-4 flex items-start gap-4">
        <span className="hidden h-12 w-12 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:flex">
          <Icon as={categoryIcon(category.slug)} size="md" />
        </span>
        <div className="min-w-0">
          <h1 className="headline text-3xl text-ink-950 sm:text-4xl">{category.name}</h1>
          {category.description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">{category.description}</p>}
        </div>
      </div>

      {category.exams.length === 0 ? (
        <p className="sheet mt-8 p-6 text-sm text-slate-600">Exams in this category are coming soon.</p>
      ) : (
        <ul aria-label="Exams" className="sheet mt-8 divide-y divide-slate-100 overflow-hidden">
          {category.exams.map((e) => (
            <li key={e.slug}>
              <Link href={`/explore/${category.slug}/${e.slug}`} className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-slate-50 sm:px-6">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold text-ink-950 group-hover:text-brand-700">{e.name}</span>
                    {e.isPopular && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        <Icon as={Star} size="xs" />
                        Popular
                      </span>
                    )}
                  </span>
                  {e.description && <span className="mt-1 block text-sm text-slate-600">{e.description}</span>}
                  <span className="mt-1 block text-xs text-slate-500">{e.subjects.map((s) => s.subject.name).join(" · ")}</span>
                </span>
                <Icon as={ArrowUpRight} className="mt-1 flex-none text-slate-300 transition-colors group-hover:text-brand-600" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
