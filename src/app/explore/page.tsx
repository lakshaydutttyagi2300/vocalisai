import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Building2, Layers3 } from "lucide-react";
import { db } from "@/lib/db";
import { catalogTree, HIRING_CATEGORY, sectionNames, skillFirstAreas } from "@/lib/catalog-queries";
import { Icon } from "@/components/ui/Icon";
import { ExploreSearch, type SearchItem } from "@/components/explore/ExploreSearch";
import { categoryIcon } from "@/components/explore/categoryIcons";
import { ExamMonogram } from "@/components/explore/ExamMonogram";
import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";

export const metadata: Metadata = {
  title: "Explore assessments - VocalisAi",
  description: "Prepare for company assessments, interviews and workplace skills: AMCAT, eLitmus, CoCubes, TCS NQT, Infosys, Accenture and more, or practise aptitude, reasoning and English skill by skill.",
};

async function searchableSkills() {
  return db.catalogSubject.findMany({
    where: { isActive: true, exams: { some: { exam: { isActive: true, category: { isActive: true } } } } },
    select: { slug: true, name: true, skills: { where: { isActive: true }, select: { slug: true, name: true } } },
  });
}

// Explore: company/assessment-first and skill-first routes into the same
// question bank. Public, so visitors see what's covered; starting needs an account.
export default async function ExplorePage() {
  const [tree, areas, subjects] = await Promise.all([catalogTree(), skillFirstAreas(), searchableSkills()]).catch((err) => {
    console.error("explore: catalogue failed", err);
    return [[], [], []] as [Awaited<ReturnType<typeof catalogTree>>, Awaited<ReturnType<typeof skillFirstAreas>>, Awaited<ReturnType<typeof searchableSkills>>];
  });

  const items: SearchItem[] = [
    ...tree.flatMap((c) =>
      c.exams.map((e) => {
        const sections = sectionNames(e.subjects);
        return {
          href: `/explore/${c.slug}/${e.slug}`,
          name: e.name,
          kind: e.groupName === "Assessment providers" ? "Assessment provider" : e.groupName === "Company assessments" ? "Company assessment" : c.name,
          detail: sections.slice(0, 3).join(", "),
          text: [e.name, c.name, e.groupName ?? "", e.description ?? "", e.keywords ?? "", ...sections, ...e.subjects.map((s) => s.subject.name)].join(" ").toLowerCase(),
        };
      })
    ),
    ...subjects.map((s) => ({ href: `/explore/skills/${s.slug}`, name: s.name, kind: "Practice area", text: `${s.name} ${s.skills.map((k) => k.name).join(" ")}`.toLowerCase() })),
    ...subjects.flatMap((s) => s.skills.map((k) => ({ href: `/explore/skills/${s.slug}?skill=${k.slug}`, name: k.name, kind: `Skill · ${s.name}`, text: `${k.name} ${s.name}`.toLowerCase() }))),
  ];
  const featured = tree.flatMap((c) => c.exams.filter((e) => e.isPopular).map((e) => ({ ...e, categorySlug: c.slug })));
  const hiring = tree.find((c) => c.slug === HIRING_CATEGORY);
  const hiringGroups = hiring ? [...new Set(hiring.exams.map((e) => e.groupName ?? ""))].map((name) => ({ name, exams: hiring.exams.filter((e) => (e.groupName ?? "") === name) })) : [];
  const otherCategories = tree.filter((c) => c.slug !== HIRING_CATEGORY);

  return (
    <div className="pb-20">
      <MediaHero {...HEROES.explore}>
        <ExploreSearch items={items} />
      </MediaHero>
      <div className="page-container">

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href={`/explore/${HIRING_CATEGORY}`} className="panel-ink lift group flex items-start gap-4 overflow-hidden rounded-xl p-6">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-fg/10 text-accent-strong">
            <Icon as={Building2} size="md" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-bold">By company or assessment</span>
            <span className="mt-1 block text-sm text-fg-muted">AMCAT, eLitmus, TCS NQT, Infosys, Accenture and more, section by section.</span>
          </span>
          <Icon as={ArrowRight} className="mt-1 text-accent-strong transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link href="/explore/skills" className="sheet group flex items-start gap-4 p-6 transition-colors hover:border-brand-200">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon as={Layers3} size="md" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-bold text-ink-950">By skill</span>
            <span className="mt-1 block text-sm text-slate-600">Quantitative aptitude, reasoning, English, situational judgement - no company needed.</span>
          </span>
          <Icon as={ArrowRight} className="mt-1 text-brand-600 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {featured.length > 0 && (
        <section aria-labelledby="featured-heading" className="mt-10">
          <h2 id="featured-heading" className="eyebrow text-slate-500">
            Featured assessments
          </h2>
          <ul className="rail mt-3 [grid-auto-columns:max-content]">
            {featured.map((e) => (
              <li key={e.id}>
                <Link href={`/explore/${e.categorySlug}/${e.slug}`} className="inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-4 text-sm font-semibold text-ink-950 hover:border-brand-300 hover:text-brand-700">
                  <ExamMonogram name={e.name} size="sm" />
                  {e.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hiring && (
        <section aria-labelledby="hiring-heading" className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="hiring-heading" className="headline text-2xl text-ink-950">
              {hiring.name}
            </h2>
            <Link href={`/explore/${hiring.slug}`} className="text-sm font-semibold text-brand-700 hover:underline">
              See all &rarr;
            </Link>
          </div>
          {hiringGroups.map((g) => (
            <div key={g.name || "all"} className="mt-5">
              {g.name && <h3 className="eyebrow text-slate-500">{g.name}</h3>}
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {g.exams.map((e) => (
                  <li key={e.id}>
                    <Link href={`/explore/${hiring.slug}/${e.slug}`} className="sheet group flex h-full items-center gap-3 p-3 transition-colors hover:border-brand-200">
                      <ExamMonogram name={e.name} size="sm" />
                      <span className="min-w-0 truncate text-sm font-semibold text-ink-950 group-hover:text-brand-700">{e.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {areas.length > 0 && (
        <section aria-labelledby="skills-heading" className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="skills-heading" className="headline text-2xl text-ink-950">
              Practice by skill
            </h2>
            <Link href="/explore/skills" className="text-sm font-semibold text-brand-700 hover:underline">
              All skills &rarr;
            </Link>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {areas.flatMap((g) => g.subjects).map((s) => (
              <li key={s.slug}>
                <Link href={`/explore/skills/${s.slug}`} className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink-950 hover:border-brand-300 hover:text-brand-700">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="categories-heading" className="mt-12">
        <h2 id="categories-heading" className="headline text-2xl text-ink-950">
          More categories
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {otherCategories.map((c) => (
            <li key={c.id}>
              <Link href={`/explore/${c.slug}`} className="sheet group flex h-full items-start gap-4 p-5 transition-colors hover:border-brand-200">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon as={categoryIcon(c.slug)} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink-950 group-hover:text-brand-700">{c.name}</span>
                  {c.description && <span className="mt-1 block text-xs leading-relaxed text-slate-500">{c.description}</span>}
                </span>
                <Icon as={ArrowUpRight} className="mt-0.5 flex-none text-fg-muted transition-colors group-hover:text-brand-600" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      </div>
    </div>
  );
}
