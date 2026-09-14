import type { ReactNode } from "react";

const BRAND_POINTS = [
  "Realistic proctored mock assessments",
  "Real transcription and speech analysis - not guesses",
  "Practice pronunciation, grammar, fluency and customer handling",
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-65px)] lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink-950 p-12 text-white lg:flex">
        <div className="text-lg font-bold">
          Pro<span className="text-brand-400">Acting</span>
        </div>
        <div>
          <h2 className="text-2xl font-semibold leading-snug">
            Practice with purpose. Walk into the real assessment prepared.
          </h2>
          <ul className="mt-8 space-y-4">
            {BRAND_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-slate-300">
                <svg
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L8.99 11.6l6.3-6.3a1 1 0 011.4 0z"
                    clipRule="evenodd"
                  />
                </svg>
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
