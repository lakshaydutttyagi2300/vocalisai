import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getJobRole, JOB_ROLES, ROLE_GROUPS, stepHref, type RoleStep } from "@/lib/job-roles";
import { Icon } from "@/components/ui/Icon";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return JOB_ROLES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const role = getJobRole((await params).slug);
  return role ? { title: `${role.title} preparation - VocalisAi`, description: `Prepare for a ${role.title} job: ${role.summary}` } : {};
}

const KIND_LABEL: Record<RoleStep["kind"], string> = { mode: "Practice", subject: "Skill practice", talk: "Live AI conversation", mock: "Mock exam" };

export default async function RolePage({ params }: { params: Params }) {
  const role = getJobRole((await params).slug);
  if (!role) notFound();
  const group = ROLE_GROUPS.find((g) => g.id === role.group);
  const steps = role.steps.filter((s, i) => role.steps.findIndex((t) => t.label === s.label) === i);

  return (
    <div className="page-container pb-20 pt-10 sm:pt-14">
      <Link href="/roles" className="text-sm font-medium text-brand-700 hover:underline">
        All job roles
      </Link>
      <p className="eyebrow mt-6 text-slate-500">{group?.name}</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{role.title}</h1>
      <p className="mt-3 max-w-2xl text-fg-muted">{role.summary}</p>
      {role.group === "bpo" && (
        <Link href="/readiness" className="sheet group mt-6 flex items-center justify-between gap-4 p-5 transition-colors hover:border-brand-200">
          <span className="min-w-0">
            <span className="block font-semibold text-ink-950 group-hover:text-brand-700">How ready are you? See your International Process readiness score</span>
            <span className="mt-1 block text-sm text-slate-500">One score from your test and practice results, with the areas to work on next.</span>
          </span>
          <Icon as={ArrowUpRight} className="flex-none text-fg-muted transition-colors group-hover:text-brand-600" />
        </Link>
      )}

      <h2 className="mt-10 font-display text-xl font-semibold text-fg">Your preparation plan</h2>
      <p className="mt-1 text-sm text-fg-muted">Work through these in order. Each one opens the practice for that step.</p>
      <ol className="mt-5 grid gap-3">
        {steps.map((s, i) => (
          <li key={s.label}>
            <Link href={stepHref(s)} className="sheet group flex items-start gap-4 p-5 transition-colors hover:border-brand-200">
              <span className="num flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent-softer text-sm font-semibold text-accent-strong">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-slate-500">{KIND_LABEL[s.kind]}</span>
                <span className="block font-semibold text-ink-950 group-hover:text-brand-700">{s.label}</span>
                <span className="mt-1 block text-sm text-slate-500">{s.why}</span>
              </span>
              <Icon as={ArrowUpRight} className="mt-1 flex-none text-fg-muted transition-colors group-hover:text-brand-600" />
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-10 text-xs text-slate-500">VocalisAi is a practice tool. Questions are written by VocalisAi; it is not affiliated with or endorsed by any employer.</p>
    </div>
  );
}
