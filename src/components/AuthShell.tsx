import type { ReactNode } from "react";
import { CircleCheck } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { CineVideo } from "@/components/cine/CineVideo";

const BRAND_POINTS = [
  "Feedback on pronunciation, fluency, grammar and pace",
  "AI interviews that reply to what you actually say",
  "Timed mock tests for company assessments and exams",
];

// Sign-in and sign-up: a cinematic clip with the promise on the left (large
// screens), the form on the right.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-65px)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-bg lg:block">
        <CineVideo name="portrait" alt="A woman speaking to the camera with a warm smile" priority />
        <div aria-hidden="true" className="scrim-bottom absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-fg">
          <h2 className="cine-headline max-w-md text-4xl">
            Give every answer a <span className="serif-accent">confident</span> voice.
          </h2>
          <ul className="mt-8 space-y-3">
            {BRAND_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-fg-muted">
                <Icon as={CircleCheck} className="mt-0.5 text-accent-strong" />
                {point}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-xs text-fg-subtle">Assessment activity may be recorded for practice and proctoring purposes.</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
