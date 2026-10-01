import Link from "next/link";
import { ArrowUpRight, Mic } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { PRACTICE_MODES } from "@/lib/practice-taxonomy";

// Spoken English is recorded and analysed by the speaking practice modes
// (src/app/practice/[slug]), not answered as multiple choice, so it links there.
const SPOKEN = ["speaking", "pronunciation", "fluency", "reading", "customer-service", "supervisor", "conversation-partner"];

export function SpeakingPracticeLinks() {
  const modes = SPOKEN.map((slug) => PRACTICE_MODES.find((m) => m.slug === slug)).filter((m) => m !== undefined);
  return (
    <section aria-labelledby="speaking-heading" className="panel-ink overflow-hidden rounded-[1.25rem] p-6 text-white sm:p-8">
      <p className="eyebrow eyebrow-on-ink">Spoken English &amp; communication</p>
      <h2 id="speaking-heading" className="headline mt-3 text-2xl">
        Answer out loud, get AI feedback
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Record your answer and see pronunciation, fluency, grammar and pace - the spoken rounds of interviews and communication assessments.</p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {modes.map((m) => (
          <li key={m.slug}>
            <Link href={`/practice/${m.slug}`} className="btn-dark btn-sm w-full justify-between">
              <span className="flex items-center gap-2">
                <Icon as={Mic} size="xs" />
                {m.label}
              </span>
              <Icon as={ArrowUpRight} size="xs" />
            </Link>
          </li>
        ))}
        <li>
          <Link href="/practice/conversation" className="btn-dark btn-sm w-full justify-between">
            <span className="flex items-center gap-2">
              <Icon as={Mic} size="xs" />
              AI interview &amp; role-play
            </span>
            <Icon as={ArrowUpRight} size="xs" />
          </Link>
        </li>
      </ul>
    </section>
  );
}
