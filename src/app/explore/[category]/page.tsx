import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { db } from "@/lib/db";
import { sectionNames, SKILL_FIRST_CATEGORIES } from "@/lib/catalog-queries";
import { Icon } from "@/components/ui/Icon";
import { categoryIcon } from "@/components/explore/categoryIcons";
import { ExamMonogram } from "@/components/explore/ExamMonogram";

async function loadCategory(slug: string) {
  return db.catalogCategory.findFirst({
    where: { slug },
    select: {
      slug: true,
      name: true,
      description: true,
      isActive: true,
      exams: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          slug: true,
          name: true,
          description: true,
          groupName: true,
          isPopular: true,
          subjects: { where: { subject: { isActive: true } }, orderBy: { sortOrder: "asc" }, select: { sectionName: true, subject: { select: { name: true } } } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const category = await loadCategory((await params).category).catch(() => null);
  return category?.isActive ? { title: `${category.name} - VocalisAi`, description: category.description ?? undefined } : {};
}

// The assessments in one category, under their sub-headings.
export default async function ExploreCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const category = await loadCategory((await params).category);
  if (!category) notFound();
  if (!category.isActive) redirect("/explore"); // a category that's no longer offered

  const groups = [...new Set(category.exams.map((e) => e.groupName ?? ""))].map((name) => ({ name, exams: category.exams.filter((e) => (e.groupName ?? "") === name) }));

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-6 sm:pt-10">
      <Link href="/explore" className="btn-ghost btn-sm -ml-3">
        <Icon as={ArrowLeft} />
        Explore
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

      {SKILL_FIRST_CATEGORIES.includes(category.slug) && (
        <Link href="/explore/skills" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
          Or practise one skill at a time
          <Icon as={ArrowRight} />
        </Link>
      )}

      {category.exams.length === 0 ? (
        <p className="sheet mt-8 p-6 text-sm text-slate-600">Assessments in this category are coming soon.</p>
      ) : (
        groups.map((g) => (
          <section key={g.name || "all"} aria-label={g.name || "Assessments"} className="mt-10">
            {g.name && <h2 className="eyebrow text-slate-500">{g.name}</h2>}
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.exams.map((e) => (
                <li key={e.slug}>
                  <Link href={`/explore/${category.slug}/${e.slug}`} className="sheet group flex h-full items-start gap-4 p-5 transition-colors hover:border-brand-200">
                    <ExamMonogram name={e.name} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink-950 group-hover:text-brand-700">{e.name}</span>
                        {e.isPopular && <Icon as={Star} size="xs" className="text-amber-500" label="Featured" />}
                      </span>
                      {e.description && <span className="mt-1 block text-sm text-slate-600">{e.description}</span>}
                      <span className="mt-1.5 block text-xs leading-relaxed text-slate-500">{sectionNames(e.subjects).join(" · ")}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
