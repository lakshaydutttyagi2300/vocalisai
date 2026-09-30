import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { catalogTree } from "@/lib/catalog-queries";
import { Icon } from "@/components/ui/Icon";
import { ExploreSearch, type SearchItem } from "@/components/explore/ExploreSearch";
import { categoryIcon } from "@/components/explore/categoryIcons";

export const metadata: Metadata = {
  title: "Explore exams - VocalisAi",
  description: "Practise for banking, SSC, railway, UPSC, state, defence, teaching, entrance and campus placement exams by subject, skill and level.",
};

// Step one of Category -> Exam -> Subject/Skill -> Level -> Mode. Public, so
// visitors can see what's covered; starting a test needs an account.
export default async function ExplorePage() {
  const tree = await catalogTree().catch((err) => {
    console.error("explore: catalogue failed", err);
    return [];
  });
  const items: SearchItem[] = tree.flatMap((c) =>
    c.exams.map((e) => {
      const subjects = e.subjects.map((s) => s.subject.name);
      return {
        href: `/explore/${c.slug}/${e.slug}`,
        name: e.name,
        category: c.name,
        subjects,
        text: [e.name, c.name, e.description ?? "", e.keywords ?? "", ...subjects].join(" ").toLowerCase(),
      };
    })
  );
  const popular = tree.flatMap((c) => c.exams.filter((e) => e.isPopular).map((e) => ({ ...e, categorySlug: c.slug })));

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-6 sm:pt-10">
      <p className="eyebrow">Explore</p>
      <h1 className="headline mt-3 text-3xl text-ink-950 sm:text-4xl">Find your exam</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
        Choose a category and your exam, then practise by subject or skill at the level that suits you, from Beginner to Expert.
      </p>

      <div className="mt-8">
        <ExploreSearch items={items} />
      </div>

      {popular.length > 0 && (
        <section aria-labelledby="popular-heading" className="mt-10">
          <h2 id="popular-heading" className="eyebrow text-slate-500">
            Popular exams
          </h2>
          <ul className="rail mt-3 [grid-auto-columns:max-content]">
            {popular.map((e) => (
              <li key={e.id}>
                <Link href={`/explore/${e.categorySlug}/${e.slug}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink-950 hover:border-brand-300 hover:text-brand-700">
                  <Icon as={Star} size="xs" className="text-amber-500" />
                  {e.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="categories-heading" className="mt-10">
        <h2 id="categories-heading" className="eyebrow text-slate-500">
          All categories
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tree.map((c) => (
            <li key={c.id}>
              <Link href={`/explore/${c.slug}`} className="sheet group flex h-full items-start gap-4 p-5 transition-colors hover:border-brand-200">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon as={categoryIcon(c.slug)} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink-950 group-hover:text-brand-700">{c.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {c.exams.length} exam{c.exams.length === 1 ? "" : "s"}
                    {c.exams.length > 0 && ` · ${c.exams.slice(0, 3).map((e) => e.name).join(", ")}${c.exams.length > 3 ? "…" : ""}`}
                  </span>
                </span>
                <Icon as={ArrowUpRight} className="mt-0.5 flex-none text-slate-300 transition-colors group-hover:text-brand-600" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
