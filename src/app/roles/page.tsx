import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { JOB_ROLES, ROLE_GROUPS } from "@/lib/job-roles";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Prepare for your job - VocalisAi",
  description: "Pick the job you want, such as Customer Support Executive, Phone Banking Officer or Retention Specialist, and practise exactly what its hiring tests and interview ask.",
};

// Role-first practice: pick a job, get the practice that matters for it.
export default function RolesPage() {
  return (
    <div className="page-container pb-20 pt-10 sm:pt-14">
      <p className="eyebrow text-slate-500">Prepare by job role</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">Which job are you preparing for?</h1>
      <p className="mt-3 max-w-2xl text-fg-muted">
        Pick a role and we&apos;ll show you the practice that matters for it: the tests, the skills and the interview. {JOB_ROLES.length} roles to choose from.
      </p>

      {ROLE_GROUPS.map((g) => (
        <section key={g.id} aria-labelledby={`roles-${g.id}`} className="mt-10">
          <h2 id={`roles-${g.id}`} className="eyebrow text-slate-500">
            {g.name}
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {JOB_ROLES.filter((r) => r.group === g.id).map((r) => (
              <li key={r.slug}>
                <Link href={`/roles/${r.slug}`} className="sheet group flex h-full items-start justify-between gap-4 p-5 transition-colors hover:border-brand-200">
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink-950 group-hover:text-brand-700">{r.title}</span>
                    <span className="mt-1 block text-xs text-slate-500">{r.summary}</span>
                  </span>
                  <Icon as={ArrowUpRight} className="mt-0.5 flex-none text-fg-muted transition-colors group-hover:text-brand-600" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="mt-12 text-xs text-slate-500">VocalisAi is a practice tool. It is not affiliated with or endorsed by the employers named.</p>
    </div>
  );
}
