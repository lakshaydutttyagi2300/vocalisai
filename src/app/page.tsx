import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight, ArrowUpRight, Check, Lock, Mic, MonitorCheck, ScanFace, Timer } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS, PLAN_LIMITS, FEATURE_LABELS, FEATURE_LABELS_PLURAL, PLAN_DIFFICULTY_ACCESS, type Plan } from "@/lib/entitlements";
import { PRACTICE_MODES } from "@/lib/practice-taxonomy";
import { TRACK_COPY } from "@/lib/goal-tracks";
import { Icon } from "@/components/ui/Icon";
import HeroAnalysis from "@/components/landing/HeroAnalysis";
import LessonsSlider, { type Lesson } from "@/components/landing/LessonsSlider";
import GoalExplorer, { type GoalOption } from "@/components/landing/GoalExplorer";

const STEPS = [
  { title: "Pick a skill or an exam", text: `${PRACTICE_MODES.length} practice modes, short skill drills, or a full timed exam.` },
  { title: "Answer for real", text: "Speak into your microphone or write, under the same timing as the real test." },
  { title: "Get specific feedback", text: "Your recording and transcript are analysed; every point quotes what you said." },
  { title: "Practise what's weak", text: "Your skill scores update, and the next questions target the gaps." },
];

// Micro-lessons written for VocalisAi (docs/MEDIA_SOURCES.md). Videos are
// our own screen recordings of the product.
const LESSONS: Lesson[] = [
  {
    topic: "Speaking",
    title: "Answer, give one reason, add one example",
    body: "Interviewers and examiners listen for shape before vocabulary. Three short parts beat one long ramble.",
    video: { src: "/media/practice-question.webm", poster: "/media/practice-question.jpg", label: "Answering a practice question in VocalisAi" },
  },
  {
    topic: "Fluency",
    title: "Swap the filler for a pause",
    body: "Half a second of silence sounds more confident than “um” or “like”. Your analysis counts fillers, so you can watch the number fall.",
  },
  {
    topic: "Pronunciation",
    title: "Stress the words that carry the meaning",
    body: "In “I can help you with that today”, lean on help and today. Flat stress makes clear English sound unsure.",
  },
  {
    topic: "Listening",
    title: "Read the question before the audio starts",
    body: "Use the preview time to decide what you are listening for: a number, a name, a reason. Then listen only for that.",
    video: { src: "/media/listening-exam.webm", poster: "/media/listening-exam.jpg", label: "A timed listening paper in VocalisAi" },
  },
  {
    topic: "Listening",
    title: "Listen for signpost words",
    body: "However, actually, so, in the end. The answer usually comes straight after them.",
  },
  {
    topic: "Interviews",
    title: "Use STAR for “tell me about a time”",
    body: "Situation, Task, Action, Result, in about a minute. Spend most of it on what you did.",
  },
  {
    topic: "Grammar",
    title: "“Will” takes the base verb",
    body: "“I will help you”, not “I will helping you”. A small slip that stands out in a spoken assessment.",
  },
  {
    topic: "Exam strategy",
    title: "In a timed paper, flag it and move on",
    body: "A question you can't crack in its time is costing you two you could answer. Mark it, keep going, come back.",
    video: { src: "/media/mock-exam-check.webm", poster: "/media/mock-exam-check.jpg", label: "The camera and microphone check before a mock exam" },
  },
];

const PLAN_DISPLAY: Record<Plan, { label: string; blurb: string }> = {
  FREE: { label: "Free", blurb: "A one-time sample, at your own pace." },
  STARTER: { label: "Starter", blurb: "For an exam or interview coming up soon." },
  PROFESSIONAL: { label: "Professional", blurb: "Regular practice across every skill." },
  PREMIUM: { label: "Premium", blurb: "The most practice, for the most thorough preparation." },
};
const PLAN_HIGHLIGHT_FEATURES = ["PRACTICE_SESSION", "SPEECH_ANALYSIS", "MOCK_ASSESSMENT", "INTERVIEW_SIMULATION"] as const;

// Live figures and catalogue for the page. The landing page must never fail
// because the database is unreachable, so it renders without them instead.
async function loadCatalogue() {
  try {
    const [questions, families, tracks] = await Promise.all([
      db.practiceQuestion.count({ where: { isActive: true } }),
      db.examFamily.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { slug: true, name: true, description: true, variants: { where: { isActive: true }, select: { id: true } } },
      }),
      db.goalTrack.findMany({ where: { enabled: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    ]);
    const examTypes = families.filter((f) => f.variants.length > 0).map((f) => ({ slug: f.slug, name: f.name, description: f.description, exams: f.variants.length }));
    const goals: GoalOption[] = tracks.filter((t) => TRACK_COPY[t.slug]).map((t) => ({ slug: t.slug, name: t.name, ...TRACK_COPY[t.slug] }));
    return { questions, examTypes, exams: examTypes.reduce((n, t) => n + t.exams, 0), goals };
  } catch (err) {
    console.error("landing page: catalogue unavailable", err);
    return null;
  }
}

// A stylised recording of one spoken answer: filler words (amber) and a long
// pause (gap) marked the way the analysis marks them. Deterministic heights.
function AnswerWaveform() {
  const bars = Array.from({ length: 64 }, (_, i) => 18 + Math.round(Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)) * 70));
  const fillers = new Set([9, 10, 41, 42]);
  const pause = new Set([26, 27, 28, 29, 30]);
  return (
    <figure className="my-8 flex flex-1 flex-col justify-center" aria-label="Example: a spoken answer with two filler words and one long pause">
      <div className="flex h-24 items-center gap-[3px]" aria-hidden="true">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`flex-1 rounded-full ${pause.has(i) ? "bg-transparent" : fillers.has(i) ? "bg-amber-400" : "bg-brand-200"}`}
            style={{ height: pause.has(i) ? "2px" : `${h}%` }}
          />
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> 2 fillers
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-slate-300" /> 1 long pause
        </span>
        <span className="num">142 wpm · balanced</span>
      </figcaption>
    </figure>
  );
}

function roundDown(n: number, step: number) {
  return n >= step ? `${(Math.floor(n / step) * step).toLocaleString("en-US")}+` : String(n);
}

export default async function LandingPage() {
  const [session, catalogue] = await Promise.all([getServerSession(authOptions), loadCatalogue()]);
  const startHref = session ? "/dashboard" : "/signup";
  const free = PLAN_LIMITS.FREE;

  const facts = catalogue
    ? [
        { value: roundDown(catalogue.questions, 100), label: "practice questions, fresh ones first" },
        { value: String(catalogue.exams), label: `timed exams across ${catalogue.examTypes.length} exam types` },
        { value: String(PRACTICE_MODES.length), label: "practice modes, from grammar to role-play" },
      ]
    : null;

  return (
    <div className="overflow-x-hidden">
      {/* Hero: headline, then the product itself. */}
      <section className="panel-ink">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16 lg:pt-24">
          <div className="min-w-0">
            <p className="eyebrow eyebrow-on-ink">English exams · Workplace assessments · Interviews</p>
            <h1 className="display mt-6 text-[2.6rem] text-white sm:text-6xl lg:text-[4.25rem]">
              Rehearse the real test <span className="text-amber-300">before it counts.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">
              Timed, camera-checked mock exams and AI feedback on the way you actually speak.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={startHref} className="btn-primary btn-lg">
                {session ? "Go to your dashboard" : "Start free"}
                <Icon as={ArrowRight} />
              </Link>
              <a href="#how-it-works" className="btn-dark btn-lg">
                See how it works
              </a>
            </div>
            {!session && (
              <p className="mt-5 text-sm text-slate-400">
                Free plan: {free.PRACTICE_SESSION} practice sessions and {free.SPEECH_ANALYSIS} speech analyses. No card needed.
              </p>
            )}
          </div>
          <HeroAnalysis />
        </div>

        {facts && (
          <div className="border-t border-white/10">
            <dl className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:grid-cols-3 sm:px-6">
              {facts.map((f) => (
                <div key={f.label} className="flex items-baseline gap-3 sm:block">
                  <dt className="sr-only">{f.label}</dt>
                  <dd className="num text-3xl font-semibold text-white sm:text-4xl">{f.value}</dd>
                  <dd className="text-sm text-slate-400 sm:mt-1">{f.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>

      {/* How a session works: a real sequence. */}
      <section id="how-it-works" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="eyebrow">How it works</p>
              <h2 className="headline mt-4 text-3xl text-ink-950 sm:text-4xl">One loop, repeated until it feels easy.</h2>
            </div>
            <ol className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-5 bg-white p-6 sm:p-8">
                  <span className="num flex-none text-sm font-semibold text-brand-600">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold text-ink-950">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Capabilities as a bento, each tile showing the thing itself. */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
          <p className="eyebrow">What you can do</p>
          <h2 className="headline mt-4 max-w-2xl text-3xl text-ink-950 sm:text-4xl">Practice that listens, and exams that feel like the real thing.</h2>

          <div className="mt-12 grid gap-4 lg:grid-cols-6">
            <article className="sheet flex flex-col p-7 lg:col-span-4 lg:row-span-2 sm:p-9">
              <h3 className="headline text-2xl text-ink-950">Feedback on how you actually sound</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                Your recording is transcribed and rated on six dimensions. Every comment quotes your own words.
              </p>
              <AnswerWaveform />
              <dl className="mt-8 grid gap-x-8 gap-y-5 border-t border-slate-100 pt-7 sm:grid-cols-2">
                {[
                  ["Pronunciation", "Words you mispronounced, with a simple sound-it-out hint"],
                  ["Fluency", "Hesitations, fillers, repetitions and long pauses"],
                  ["Grammar", "Quoted from your transcript, each with the correction"],
                  ["Vocabulary", "Word choice, professional terms, repetition"],
                  ["Pace", "Words per minute, measured, not guessed"],
                  ["Delivery", "Clarity, confidence and how complete the answer was"],
                ].map(([name, text]) => (
                  <div key={name} className="min-w-0">
                    <dt className="text-sm font-semibold text-ink-950">{name}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-slate-600">{text}</dd>
                  </div>
                ))}
              </dl>
            </article>

            <article className="panel-ink overflow-hidden rounded-[1.25rem] p-7 lg:col-span-2">
              <h3 className="headline text-xl">Proctored mock exams</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">Timed sections and a fixed question order, like the real test.</p>
              <ul className="mt-6 grid gap-2.5 text-sm">
                {[
                  [ScanFace, "One person in frame"],
                  [Mic, "Microphone checked"],
                  [MonitorCheck, "Tab switches noticed"],
                  [Timer, "Timed papers"],
                ].map(([Glyph, text]) => (
                  <li key={text as string} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-slate-200">
                    <Icon as={Glyph as typeof Mic} className="text-amber-300" />
                    {text as string}
                  </li>
                ))}
              </ul>
            </article>

            <article className="sheet p-7 lg:col-span-2">
              <h3 className="headline text-xl text-ink-950">Role-play out loud</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">An AI interviewer, customer or manager replies to what you actually said.</p>
              <div className="mt-6 grid gap-2 text-sm">
                <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 px-4 py-2.5 text-ink-800">Tell me about a time you handled an upset customer.</p>
                <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-white">Last month a customer&apos;s order arrived damaged, so I…</p>
              </div>
            </article>

            <article className="sheet p-7 lg:col-span-3">
              <h3 className="headline text-xl text-ink-950">Know which skills are weak</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Every answer updates a mastery score per skill; recent and harder answers count more.</p>
              <ul className="mt-6 grid gap-3">
                {[
                  { skill: "Tenses", band: "Mastered", value: 92, tone: "bg-brand-600" },
                  { skill: "Listening for detail", band: "Proficient", value: 74, tone: "bg-brand-400" },
                  { skill: "Word stress", band: "Weak", value: 38, tone: "bg-amber-500" },
                ].map((s) => (
                  <li key={s.skill} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 text-sm">
                    <span className="truncate font-medium text-ink-800">{s.skill}</span>
                    <span className="text-xs font-semibold text-slate-500">{s.band}</span>
                    <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <span className={`block h-full rounded-full ${s.tone}`} style={{ width: `${s.value}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-slate-400">Example scores.</p>
            </article>

            <article className="sheet flex flex-col p-7 lg:col-span-3">
              <h3 className="headline text-xl text-ink-950">No repeated questions</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Practice, drills and exams pick questions you haven&apos;t seen before, until a topic runs out.
              </p>
              <div className="mt-auto flex items-end justify-between gap-4 pt-8">
                <p className="num text-5xl font-semibold text-ink-950">{catalogue ? roundDown(catalogue.questions, 100) : "—"}</p>
                <p className="max-w-[10rem] text-right text-xs leading-relaxed text-slate-500">questions, every one tagged to a skill and level</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* The exam library as a horizontal rail. */}
      {catalogue && catalogue.examTypes.length > 0 && (
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Exam library</p>
                <h2 className="headline mt-4 max-w-xl text-3xl text-ink-950 sm:text-4xl">Practise the format you&apos;ll actually face.</h2>
              </div>
              <Link href={session ? "/mock-tests" : "/signup"} className="btn-secondary flex-none self-start sm:self-auto">
                Browse exams
                <Icon as={ArrowUpRight} />
              </Link>
            </div>
            <ul className="rail mt-10 [grid-auto-columns:minmax(15rem,17rem)]" aria-label="Exam types">
              {catalogue.examTypes.map((t) => (
                <li key={t.slug} className="flex min-h-[11rem] flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-brand-300 hover:bg-white">
                  <p className="num text-xs text-slate-500">
                    {t.exams} exam{t.exams === 1 ? "" : "s"}
                  </p>
                  <h3 className="mt-3 font-display text-lg font-bold text-ink-950">{t.name}</h3>
                  {t.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{t.description}</p>}
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-2xl text-xs leading-relaxed text-slate-400">
              &ldquo;-style&rdquo; exams are original practice material in the format of those tests. VocalisAi is not affiliated with or endorsed by their owners.
            </p>
          </div>
        </section>
      )}

      {/* Micro-lessons: short, specific, and some show the product. */}
      <section className="panel-ink">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-end">
            <div>
              <p className="eyebrow eyebrow-on-ink">Micro-lessons</p>
              <h2 className="headline mt-4 text-3xl text-white sm:text-4xl">Small habits that examiners notice.</h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">One idea each, under a minute to read. Practise it straight away in the matching mode.</p>
          </div>
          <div className="mt-10">
            <LessonsSlider lessons={LESSONS} />
          </div>
        </div>
      </section>

      {/* Goals as tabs. */}
      {catalogue && catalogue.goals.length > 0 && (
        <section className="bg-slate-50">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
            <p className="eyebrow">Built around your goal</p>
            <h2 className="headline mt-4 max-w-2xl text-3xl text-ink-950 sm:text-4xl">Tell us what you&apos;re preparing for. Get a plan for it.</h2>
            <div className="mt-12">
              <GoalExplorer goals={catalogue.goals} ctaHref={session ? "/goal/choose" : "/signup"} />
            </div>
          </div>
        </section>
      )}

      {/* Plans: one comparison, not four floating boxes. */}
      <section id="plans" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end">
            <div>
              <p className="eyebrow">Plans</p>
              <h2 className="headline mt-4 text-3xl text-ink-950 sm:text-4xl">Every mode on every plan. Pay for more of it.</h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">Plans differ in how much you can do each month and which difficulty levels unlock. Free limits are a one-time sample.</p>
          </div>

          <div className="mt-12 grid overflow-hidden rounded-2xl border border-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan, i) => {
              const limits = PLAN_LIMITS[plan];
              const difficulties = PLAN_DIFFICULTY_ACCESS[plan];
              const featured = plan === "PROFESSIONAL";
              return (
                <div
                  key={plan}
                  className={`flex flex-col p-7 ${featured ? "bg-ink-950 text-white" : "bg-white"} ${i > 0 ? "border-t border-slate-200 sm:border-t-0" : ""} ${
                    i % 2 === 1 ? "sm:border-l sm:border-slate-200" : ""
                  } ${i >= 2 ? "sm:border-t lg:border-t-0" : ""} ${i > 0 ? "lg:border-l lg:border-slate-200" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className={`font-display text-lg font-bold ${featured ? "text-white" : "text-ink-950"}`}>{PLAN_DISPLAY[plan].label}</h3>
                    {featured && <span className="rounded-full bg-amber-300 px-2.5 py-0.5 text-[0.7rem] font-bold text-ink-950">Recommended</span>}
                  </div>
                  <p className={`mt-2 min-h-[2.5rem] text-sm ${featured ? "text-slate-300" : "text-slate-600"}`}>{PLAN_DISPLAY[plan].blurb}</p>
                  <ul className={`mt-6 flex-1 space-y-3 border-t pt-6 text-sm ${featured ? "border-white/10 text-slate-200" : "border-slate-100 text-ink-800"}`}>
                    {PLAN_HIGHLIGHT_FEATURES.map((feature) => {
                      const count = limits[feature];
                      if (count === 0) {
                        return (
                          <li key={feature} className={`flex items-start gap-2.5 ${featured ? "text-slate-400" : "text-slate-500"}`}>
                            <Icon as={Lock} className="mt-0.5" />
                            <span>{FEATURE_LABELS_PLURAL[feature]} on paid plans</span>
                          </li>
                        );
                      }
                      return (
                        <li key={feature} className="flex items-start gap-2.5">
                          <Icon as={Check} className={`mt-0.5 ${featured ? "text-amber-300" : "text-brand-600"}`} />
                          <span>
                            <span className="num font-semibold">{count}</span> {count === 1 ? FEATURE_LABELS[feature] : FEATURE_LABELS_PLURAL[feature]}
                            <span className={featured ? "text-slate-400" : "text-slate-500"}>{plan === "FREE" ? " (lifetime)" : "/month"}</span>
                          </span>
                        </li>
                      );
                    })}
                    <li className="flex items-start gap-2.5">
                      <Icon as={Check} className={`mt-0.5 ${featured ? "text-amber-300" : "text-brand-600"}`} />
                      <span>
                        {difficulties.length === 4 ? "All difficulty levels" : `${difficulties.map((d) => d.charAt(0) + d.slice(1).toLowerCase()).join(" & ")} difficulty`}
                      </span>
                    </li>
                  </ul>
                  <Link href={session ? "/billing" : "/signup"} className={`mt-8 w-full ${featured ? "btn-primary" : "btn-secondary"}`}>
                    {plan === "FREE" ? "Start free" : `Choose ${PLAN_DISPLAY[plan].label}`}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Closing call to action. */}
      {!session && (
        <section className="panel-ink">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-20 sm:px-6 sm:py-24 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="display max-w-2xl text-4xl text-white sm:text-5xl">Make exam day the second time you&apos;ve done it.</h2>
            <Link href="/signup" className="btn-primary btn-lg flex-none self-start lg:self-auto">
              Start free
              <Icon as={ArrowRight} />
            </Link>
          </div>
        </section>
      )}

      <footer className="border-t border-white/10 bg-ink-950 text-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-slate-400">
            <span className="font-display font-bold text-white">
              Vocalis<span className="text-amber-300">Ai</span>
            </span>{" "}
            · Practice with purpose.
          </p>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-slate-400">
            <Link href="/practice" className="hover:text-white">Practice</Link>
            <Link href="/mock-tests" className="hover:text-white">Mock exams</Link>
            <a href="#plans" className="hover:text-white">Plans</a>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/refund-policy" className="hover:text-white">Refunds</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
