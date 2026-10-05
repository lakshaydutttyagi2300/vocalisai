import type { ReactNode } from "react";
import { CircleCheck, KeyRound, MailCheck } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { CineVideo } from "@/components/cine/CineVideo";
import { scene } from "@/config/mediaLibrary";

const BRAND_POINTS = [
  "Feedback on pronunciation, fluency, grammar and pace",
  "AI interviews that reply to what you actually say",
  "Timed mock tests for company assessments and exams",
];

// Sign-in and sign-up: a picture with the promise on the left (large
// screens), the form on the right. Each page has its own picture: the login
// page a photo from the media library, the others a preview of their own step.
type Panel = "login" | "signup" | "forgot" | "reset";

const GOALS = ["BPO / Customer Support", "Campus Placement", "Interview Preparation", "Study Abroad"];

function StepPreview({ panel }: { panel: Exclude<Panel, "login"> }) {
  const card = "w-[min(24rem,80%)] rounded-2xl border border-line bg-surface/95 p-5 text-left shadow-[var(--shadow-lg)] backdrop-blur";
  return (
    <div className="absolute inset-0 bg-[radial-gradient(50rem_26rem_at_70%_15%,var(--accent-soft),transparent_70%),linear-gradient(180deg,var(--surface-muted),var(--bg))]">
      <div className="absolute inset-x-0 top-[14%] flex justify-center">
        {panel === "signup" ? (
          <div className={card} role="img" aria-label="Example of choosing your goal after signing up">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-accent-strong">Next: choose your goal</p>
            <ul className="mt-4 grid gap-2">
              {GOALS.map((g, i) => (
                <li key={g} className={`rounded-lg border px-3 py-2 text-sm ${i === 0 ? "border-accent bg-accent-soft font-semibold text-fg" : "border-line text-fg-muted"}`}>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className={card} role="img" aria-label={panel === "forgot" ? "Example of the reset email step" : "Example of choosing a new password"}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
              <Icon as={panel === "forgot" ? MailCheck : KeyRound} size="lg" />
            </span>
            <p className="mt-4 font-semibold text-fg">{panel === "forgot" ? "Check your inbox" : "Choose a new password"}</p>
            <p className="mt-1 text-sm text-fg-muted">
              {panel === "forgot" ? "We send a one-time link that works for one hour." : "Use at least 8 characters, then sign in with it."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function AuthShell({ children, panel = "login" }: { children: ReactNode; panel?: Panel }) {
  return (
    <div className="grid min-h-[calc(100vh-65px)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-bg lg:block">
        {panel === "login" ? <CineVideo name={scene("auth.panel")} priority /> : <StepPreview panel={panel} />}
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
