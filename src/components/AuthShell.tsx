import type { ReactNode } from "react";
import { CircleCheck } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

const BRAND_POINTS = [
  "Realistic, proctored mock speaking assessments",
  "Real transcription and AI speech analysis - never a guess",
  "Practice pronunciation, fluency, grammar and vocabulary",
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-65px)] lg:grid-cols-2">
      <div className="hidden flex-col justify-between panel-ink p-12 text-white lg:flex">
        <div className="font-display text-lg font-bold">
          Vocalis<span className="text-white/75">Ai</span>
        </div>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- a ~25 KB WebP poster from /public/media/hero (docs/MEDIA_SOURCES.md) */}
          <img src="/media/hero/celebrate.webp" alt="Colleagues high-fiving in an office" width={960} height={540} loading="lazy" className="mb-10 aspect-video w-full rounded-2xl object-cover shadow-xl ring-1 ring-white/20" />
          <h2 className="font-display text-2xl font-semibold leading-snug">
            Practice smarter. Speak clearer. Walk into your next assessment ready.
          </h2>
          <ul className="mt-8 space-y-4">
            {BRAND_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-slate-300">
                <Icon as={CircleCheck} className="mt-0.5 text-white" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-500">
          Assessment activity may be recorded for practice/proctoring purposes.
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
