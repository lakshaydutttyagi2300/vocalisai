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
    <footer className="border-t border-white/[0.08] bg-night-950 text-sm">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))]">
        <div>
          <p className="font-display text-lg font-semibold tracking-tight text-mist-50">
            Vocalis<span className="text-champagne-300">Ai</span>
          </p>
          <p className="mt-3 max-w-xs leading-relaxed text-mist-500">Practise speaking, interviews and hiring tests, with AI feedback on every answer.</p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-mist-500">{c.title}</p>
            <ul className="mt-4 grid gap-2.5">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-mist-300 transition-colors hover:text-mist-50">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/[0.06]">
        <p className="mx-auto max-w-7xl px-5 py-6 text-xs text-mist-500 sm:px-8">
          © 2026 VocalisAi. Practice material is written by VocalisAi; we are not affiliated with or endorsed by the employers, test providers or exam bodies named on this site.
        </p>
      </div>
    </footer>
  );
}
