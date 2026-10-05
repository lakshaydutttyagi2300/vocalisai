import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { CineVideo } from "./CineVideo";
import { FadeIn } from "./FadeIn";
import type { SceneName } from "@/config/mediaLibrary";

// Building blocks for the cinematic pages: every section pairs words with a
// picture or a demo (docs/UI_DESIGN_SYSTEM.md: never several text-only
// sections in a row).

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function SectionIntro({ eyebrow, title, text, className = "" }: { eyebrow: string; title: ReactNode; text?: string; className?: string }) {
  return (
    <FadeIn className={`max-w-3xl ${className}`}>
      <p className="cine-eyebrow">{eyebrow}</p>
      <h2 className="cine-headline mt-5 text-4xl text-fg sm:text-6xl">{title}</h2>
      {text && <p className="cine-lede mt-6 max-w-2xl">{text}</p>}
    </FadeIn>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2 text-sm font-medium text-accent-strong transition-colors hover:text-accent-strong">
      {children}
      <Icon as={ArrowRight} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Words on one side, a clip (or any media) on the other. */
export function MediaSplit({
  eyebrow,
  title,
  text,
  points,
  link,
  media,
  reverse = false,
}: {
  eyebrow: string;
  title: ReactNode;
  text: string;
  points?: string[];
  link?: { href: string; label: string };
  media: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
      <FadeIn className={reverse ? "lg:order-2" : ""}>{media}</FadeIn>
      <FadeIn delay={120} className="min-w-0">
        <p className="cine-eyebrow">{eyebrow}</p>
        <h2 className="cine-headline mt-5 text-4xl text-fg sm:text-5xl">{title}</h2>
        <p className="cine-lede mt-6">{text}</p>
        {points && (
          <ul className="mt-8 grid gap-3 border-t border-line pt-8 text-sm text-fg-muted sm:grid-cols-2">
            {points.map((p) => (
              <li key={p} className="flex gap-3">
                <span className="mt-2 h-1 w-1 flex-none rounded-full bg-accent" />
                {p}
              </li>
            ))}
          </ul>
        )}
        {link && (
          <div className="mt-8">
            <TextLink href={link.href}>{link.label}</TextLink>
          </div>
        )}
      </FadeIn>
    </div>
  );
}

/** A rounded frame holding a clip, optionally with something floating over it. */
export function ClipFrame({ name, alt, ratio = "aspect-[4/3]", children, mode = "view", className = "" }: { name: SceneName; alt?: string; ratio?: string; children?: ReactNode; mode?: "view" | "hover"; className?: string }) {
  return (
    <div className={`cine-media ${ratio} ${className}`}>
      <CineVideo name={name} alt={alt} mode={mode} />
      {children}
    </div>
  );
}

/** Top of an inner page: a big clip with the page title over it. */
export function PageHero({ name, alt, eyebrow, title, text, actions }: { name: SceneName; alt?: string; eyebrow: string; title: ReactNode; text: string; actions?: ReactNode }) {
  return (
    <section className="px-2 pt-2 sm:px-3 sm:pt-3">
      <div className="relative h-[72svh] min-h-[30rem] max-h-[48rem] overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-line">
        <div className="cine-zoom absolute inset-0">
          <CineVideo name={name} alt={alt} priority />
        </div>
        <div aria-hidden="true" className="scrim-left pointer-events-none absolute inset-0 hidden sm:block" />
        <div aria-hidden="true" className="scrim-bottom pointer-events-none absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-10 sm:px-12 sm:pb-14 lg:px-16">
          <div className="cine-copy max-w-3xl">
            <p className="cine-eyebrow">{eyebrow}</p>
            <h1 className="cine-display mt-5 text-[2.6rem] text-fg sm:text-6xl lg:text-7xl">{title}</h1>
            <div>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg">{text}</p>
              {actions && <div className="mt-8 flex flex-col gap-3 sm:flex-row">{actions}</div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Full-width clip with a closing call to action over it. */
export function FinalCta({ name, alt, title, text, primary, secondary }: { name: SceneName; alt?: string; title: ReactNode; text: string; primary: { href: string; label: string }; secondary?: { href: string; label: string } }) {
  return (
    <section className="px-2 pb-2 sm:px-3 sm:pb-3">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-line">
        <div className="absolute inset-0">
          <CineVideo name={name} alt={alt} />
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-surface-muted/55" />
        <div className="relative px-6 py-28 text-center sm:px-12 sm:py-40">
          <FadeIn>
            <h2 className="cine-display mx-auto max-w-4xl text-5xl text-fg sm:text-7xl">{title}</h2>
            <p className="mx-auto mt-6 max-w-xl text-fg-muted sm:text-lg">{text}</p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={primary.href} className="btn-primary btn-lg">
                {primary.label}
                <Icon as={ArrowRight} />
              </Link>
              {secondary && (
                <Link href={secondary.href} className="btn-secondary btn-lg">
                  {secondary.label}
                </Link>
              )}
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
