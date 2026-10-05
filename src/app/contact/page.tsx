import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { CineVideo } from "@/components/cine/CineVideo";
import { Container } from "@/components/cine/sections";
import { SiteFooter } from "@/components/cine/SiteFooter";
import { scene } from "@/config/mediaLibrary";

export const metadata: Metadata = {
  title: "Contact - VocalisAi",
  description: "Get in touch with VocalisAi about your account, billing, or using VocalisAi with a college or company.",
};

// The same address as the privacy policy (src/app/privacy/page.tsx).
const EMAIL = "pcircuit@yahoo.com";

const TOPICS = [
  ["Help with your account", "Signing in, practice, results or anything that isn't working."],
  ["Plans and billing", "Questions about what each plan includes."],
  ["Colleges and companies", "Using VocalisAi for placement preparation or training."],
];

export default function ContactPage() {
  return (
    <div className="cine overflow-x-hidden">
      <section className="py-16 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div className="cine-copy min-w-0">
            <p className="cine-eyebrow">Contact</p>
            <h1 className="cine-display mt-5 text-5xl text-fg sm:text-7xl">
              Let&rsquo;s <span className="serif-accent">talk</span>.
            </h1>
            <div>
              <p className="cine-lede mt-6 max-w-md">Write to us and a person will read it. Tell us a little about what you&rsquo;re preparing for, so we can help faster.</p>
              <a
                href={`mailto:${EMAIL}`}
                className="mt-10 inline-flex items-center gap-3 rounded-full border border-line bg-surface-muted px-6 py-4 text-lg text-fg transition-colors hover:border-accent-line hover:bg-surface-muted"
              >
                <Icon as={Mail} className="text-accent-strong" />
                <span className="select-all">{EMAIL}</span>
              </a>
              <dl className="mt-12 grid gap-6 border-t border-line pt-10">
                {TOPICS.map(([t, d]) => (
                  <div key={t}>
                    <dt className="font-medium text-fg">{t}</dt>
                    <dd className="mt-1 text-sm text-fg-muted">{d}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-10 text-sm text-fg-subtle">
                Looking for how plans work? See <Link href="/pricing" className="text-accent-strong hover:text-accent-strong">pricing</Link>.
              </p>
            </div>
          </div>
          <div className="cine-media aspect-[4/5]">
            <CineVideo name={scene("contact.hero")} priority />
          </div>
        </Container>
      </section>
      <SiteFooter />
    </div>
  );
}
