import Link from "next/link";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "Product",
    links: [
      ["Speaking practice", "/product/speaking"],
      ["AI interviews", "/product/interviews"],
      ["Personalised practice", "/product/personalised"],
      ["Explore exams", "/explore"],
    ],
  },
  {
    title: "Solutions",
    links: [
      ["All use cases", "/use-cases"],
      ["Campus placements", "/use-cases#campus-placements"],
      ["Customer service", "/use-cases#customer-service"],
      ["Company assessments", "/use-cases#company-assessments"],
    ],
  },
  {
    title: "Company",
    links: [
      ["Pricing", "/pricing"],
      ["About", "/about"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Terms", "/terms"],
      ["Privacy", "/privacy"],
      ["Refunds", "/refund-policy"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface-muted text-sm">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))]">
        <div>
          <p className="font-display text-lg font-semibold tracking-tight text-fg">
            Vocalis<span className="text-accent-strong">Ai</span>
          </p>
          <p className="mt-3 max-w-xs leading-relaxed text-fg-subtle">Practise speaking, interviews and hiring tests, with AI feedback on every answer.</p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-fg-subtle">{c.title}</p>
            <ul className="mt-4 grid gap-2.5">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-fg-muted transition-colors hover:text-fg">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-5 py-6 text-xs text-fg-subtle sm:px-8">
          © 2026 VocalisAi. Practice material is written by VocalisAi; we are not affiliated with or endorsed by the employers, test providers or exam bodies named on this site.
        </p>
      </div>
    </footer>
  );
}
