import { Camera, Check, Clock, Flame, Mic, Target } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import type { HeroDemoName } from "@/config/heroMedia";

// Product UI shown as one of a hero's slides (src/config/heroMedia.ts). Each
// demo appears in one hero only and is labelled "Example": it shows what the
// screen looks like, never anyone's real data.

function Example() {
  return <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[0.68rem] font-medium text-fg-muted">Example</span>;
}

function Stage({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="img" aria-label={label} className="absolute inset-0 overflow-hidden bg-[radial-gradient(60rem_30rem_at_80%_20%,var(--accent-soft),transparent_70%),linear-gradient(180deg,var(--surface-muted),var(--bg))]">
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="absolute inset-x-4 top-6 flex justify-center sm:inset-x-auto sm:right-[6%] sm:top-1/2 sm:w-[min(26rem,44%)] sm:-translate-y-1/2">{children}</div>
    </div>
  );
}

const card = "w-full max-w-[26rem] rounded-2xl border border-line bg-surface/95 p-5 text-left shadow-[var(--shadow-lg)] backdrop-blur";

function DashboardDemo({ label }: { label: string }) {
  const steps = [
    { name: "Listening · Intermediate", note: "8 questions", done: true },
    { name: "Speaking: tell me about yourself", note: "1 recording", done: true },
    { name: "Logical reasoning drill", note: "10 questions", done: false },
  ];
  return (
    <Stage label={label}>
      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-accent-strong">Today&apos;s plan</p>
          <Example />
        </div>
        <ul className="mt-4 grid gap-2.5">
          {steps.map((s) => (
            <li key={s.name} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
              <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full ${s.done ? "bg-accent text-on-ink" : "border border-line-strong text-fg-subtle"}`}>
                {s.done && <Icon as={Check} size="xs" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm ${s.done ? "text-fg-muted line-through" : "font-semibold text-fg"}`}>{s.name}</span>
                <span className="block text-xs text-fg-subtle">{s.note}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-surface-muted px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs text-fg-muted">
              <Icon as={Flame} size="xs" /> Streak
            </p>
            <p className="num mt-0.5 text-lg font-semibold text-fg">6 days</p>
          </div>
          <div className="rounded-xl bg-surface-muted px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs text-fg-muted">
              <Icon as={Target} size="xs" /> Readiness
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full w-[68%] rounded-full bg-accent" />
            </div>
          </div>
        </div>
      </div>
    </Stage>
  );
}

function CompanyTestsDemo({ label }: { label: string }) {
  const tests = [
    { name: "AMCAT", sections: "Quant · Logical · English" },
    { name: "TCS NQT", sections: "Numerical · Reasoning · Verbal" },
    { name: "eLitmus (pH Test)", sections: "Quant · Reasoning · Verbal" },
    { name: "Infosys", sections: "Reasoning · Maths · Verbal" },
  ];
  return (
    <Stage label={label}>
      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-accent-strong">Company tests</p>
          <Example />
        </div>
        <ul className="mt-4 divide-y divide-line">
          {tests.map((t) => (
            <li key={t.name} className="flex items-center gap-3 py-2.5">
              <span className="num flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-accent-soft text-[0.7rem] font-semibold text-accent-strong">{t.name.slice(0, 2).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{t.name}</span>
                <span className="block truncate text-xs text-fg-subtle">{t.sections}</span>
              </span>
              <span className="text-xs font-semibold text-accent-strong">Practise</span>
            </li>
          ))}
        </ul>
      </div>
    </Stage>
  );
}

function ExamRoomDemo({ label }: { label: string }) {
  return (
    <Stage label={label}>
      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-accent-strong">Section 2 of 4 · Logical reasoning</p>
          <Example />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm text-fg-muted">
            <Icon as={Clock} /> Time left
          </span>
          <span className="num text-lg font-semibold text-fg">14:32</span>
        </div>
        <p className="mt-4 text-sm font-semibold text-fg">Question 7 of 20</p>
        <p className="mt-1 text-sm leading-relaxed text-fg-muted">All pens are bags. Some bags are boxes. Does &ldquo;some pens are boxes&rdquo; follow?</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {["Follows", "Does not follow"].map((o, i) => (
            <span key={o} className={`rounded-lg border px-3 py-2 text-center text-xs font-semibold ${i === 1 ? "border-accent bg-accent-soft text-fg" : "border-line text-fg-muted"}`}>
              {o}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-line pt-3 text-xs text-fg-muted">
          <span className="flex items-center gap-1.5">
            <Icon as={Camera} size="xs" /> Camera on
          </span>
          <span className="flex items-center gap-1.5">
            <Icon as={Mic} size="xs" /> Microphone ready
          </span>
        </div>
      </div>
    </Stage>
  );
}

export function HeroDemo({ name, label }: { name: HeroDemoName; label: string }) {
  if (name === "dashboard") return <DashboardDemo label={label} />;
  if (name === "companyTests") return <CompanyTestsDemo label={label} />;
  return <ExamRoomDemo label={label} />;
}
