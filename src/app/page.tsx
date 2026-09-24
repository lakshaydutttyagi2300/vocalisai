import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PLAN_LIMITS, FEATURE_LABELS_PLURAL, PLAN_DIFFICULTY_ACCESS } from "@/lib/entitlements";
import { PRACTICE_MODES } from "@/lib/practice-taxonomy";
import Reveal from "@/components/Reveal";

// Unsplash License (free to use, no permission required) - chosen for
// direct relevance to online assessment/proctoring, not generic stock.
const IMG_HERO = "https://images.unsplash.com/photo-1573166364489-49b728b7817b"; // candidate wearing a headset, taking a test on a laptop
const IMG_TRUST = "https://images.unsplash.com/photo-1720723652002-dc1f2fb0527b"; // professional candidate speaking at a laptop with a microphone
const IMG_PROCTOR = "https://images.unsplash.com/photo-1762681290673-ba1ad4ea0875"; // webcam mounted on a monitor - proctoring
const IMG_CTA = "https://images.unsplash.com/photo-1513258496099-48168024aec0"; // candidate with headset in front of a laptop

const HOW_IT_WORKS = [
  {
    step: "Choose Practice",
    text: "Pick a skill - pronunciation, fluency, grammar, customer-service roleplay, and more - and get a realistic question.",
  },
  {
    step: "Take the Test",
    text: "Answer for real: record your spoken response, or answer written questions, under the same conditions as the real thing.",
  },
  {
    step: "Get AI Analysis",
    text: "Your actual recording and transcript are analyzed for pronunciation, fluency, grammar, vocabulary, pace and delivery.",
  },
  {
    step: "Improve & Retake",
    text: "Review exactly what to fix, see a stronger version of your own answer, and practice the same skill again with new material.",
  },
];

const KEY_FEATURES = [
  {
    title: "AI Voice & Accent Analysis",
    text: "Real audio, genuinely listened to - pronunciation, articulation and delivery scored from your actual recording, not guessed from a transcript.",
  },
  {
    title: "Practice Tests",
    text: "Short, focused exercises across 13 skill categories, from grammar and vocabulary to customer-service roleplay.",
  },
  {
    title: "Full Mock Assessments",
    text: "A complete, timed, proctored practice test with camera and microphone checks and a full results breakdown at the end.",
  },
  {
    title: "Speech & Pronunciation Analysis",
    text: "Mispronounced words with a plain-language phonetic hint, plus notes on articulation and intelligibility.",
  },
  {
    title: "Interview Simulation",
    text: "A live, spoken back-and-forth with an AI playing an interviewer, a customer, a supervisor, or a casual conversation partner.",
  },
  {
    title: "Question Bank",
    text: "A growing bank of real practice questions across grammar, vocabulary, reading, listening, writing and spoken skills.",
  },
  {
    title: "Performance Reports",
    text: "A category-by-category breakdown of every response - what was strong, what needs work, and why.",
  },
  {
    title: "Progress Tracking",
    text: "Your real scores across every completed mock assessment, tracked over time so improvement is something you can see.",
  },
  {
    title: "Proctored Exam Experience",
    text: "Camera and microphone checks, timed sections and a fixed question order once started - the same format as a real assessment.",
  },
];

const SHOWCASE = [
  {
    label: "Practice mode",
    title: "Skill-by-skill practice",
    text: "13 focused categories - grammar, vocabulary, reading comprehension, listening, situational judgement, interview questions, writing, read-aloud, pronunciation, fluency, speaking, customer-service roleplay and casual conversation.",
    meta: "Untimed by default · answer at your own pace · repeatable with new material",
  },
  {
    label: "Interview simulation",
    title: "Live spoken conversation",
    text: "A real-time back-and-forth with an AI playing an interviewer, customer, supervisor or conversation partner - not a fixed list of questions.",
    meta: "Spoken, spontaneous responses · feedback after the conversation ends",
  },
  {
    label: "Full mock assessment",
    title: "Complete proctored exam",
    text: "A timed, multi-section assessment built from an admin-configured template - camera and microphone checks first, then a fixed question order for the rest of the session.",
    meta: "Camera + microphone check · timed sections · no going back once started",
  },
];

const AI_METRICS = [
  { name: "Pronunciation", text: "Mispronounced words, difficult sounds, and a simple phonetic hint for each - from your actual audio." },
  { name: "Fluency", text: "Hesitations, filler words, repetitions and long pauses, measured from your real recording." },
  { name: "Grammar", text: "Specific issues quoted from your own transcript, each with the exact correction." },
  { name: "Vocabulary", text: "Word choice and professional terms used, with any repetitive phrasing flagged." },
  { name: "Pace", text: "Words-per-minute, classified as too slow, balanced, fast or very fast - a real, calculated number." },
  { name: "Voice clarity & delivery", text: "Articulation, volume, confidence indicators and how complete your response was." },
];

const WHY_CANDIDATES = [
  {
    title: "Lack of practice",
    text: "Most candidates walk into a Voice & Accent round having read about it, never having actually done it. Every exercise here is real practice, not a description of one.",
  },
  {
    title: "Interview anxiety",
    text: "The proctored mock assessment and interview simulation exist so the first time you experience that format isn't in front of a recruiter.",
  },
  {
    title: "Pronunciation issues you can't hear yourself",
    text: "It's hard to know which words you're mispronouncing until someone - or something - actually listens and tells you.",
  },
  {
    title: "No feedback loop",
    text: "Most practice ends with no idea what went wrong. Every response here comes back with specific, grounded feedback on what you actually said.",
  },
  {
    title: "Not knowing when you're ready",
    text: "Your Progress page tracks your real scores across every mock assessment, so \"am I ready?\" has an answer based on your own history, not a guess.",
  },
];

const PLAN_ORDER = ["FREE", "STARTER", "PROFESSIONAL", "PREMIUM"] as const;
const PLAN_DISPLAY: Record<(typeof PLAN_ORDER)[number], { label: string; blurb: string }> = {
  FREE: { label: "Free", blurb: "A one-time sample of the platform, at your own pace." },
  STARTER: { label: "Starter", blurb: "For candidates actively preparing for an upcoming round." },
  PROFESSIONAL: { label: "Professional", blurb: "For serious, repeated practice across every skill." },
  PREMIUM: { label: "Premium", blurb: "Full access, for the most thorough preparation." },
};
const PLAN_HIGHLIGHT_FEATURES = ["PRACTICE_SESSION", "SPEECH_ANALYSIS", "MOCK_ASSESSMENT", "INTERVIEW_SIMULATION"] as const;

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="overflow-x-hidden">
      {/* 1. Hero - full-bleed photo of a candidate testing, dark navy scrim
          for a "secure assessment platform" feel rather than a plain
          light gradient. */}
      <section className="relative isolate overflow-hidden bg-ink-950">
        <Image
          src={IMG_HERO}
          alt="A candidate wearing a headset, taking an online assessment on a laptop"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-60"
        />
        <div className="hero-dark-scrim absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 sm:py-32 lg:grid-cols-[1.1fr_0.9fr] lg:py-40">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              <svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 1.5a1 1 0 01.894.553l1.53 3.1 3.42.497a1 1 0 01.554 1.706l-2.475 2.412.584 3.406a1 1 0 01-1.451 1.054L10 12.48l-3.056 1.748a1 1 0 01-1.451-1.054l.584-3.406-2.475-2.412a1 1 0 01.554-1.706l3.42-.497 1.53-3.1A1 1 0 0110 1.5z" clipRule="evenodd" />
              </svg>
              Secure AI-Powered Assessments
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Practice speaking under pressure
              <span className="block text-brand-300">before someone else is judging it.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-200">
              VocalisAi is an AI-powered practice platform for BPO and voice-process job seekers.
              Record real spoken answers, get real AI feedback on your pronunciation, fluency and
              grammar, and take full proctored mock assessments - so your next Voice &amp; Accent
              round isn&apos;t the first time you&apos;ve done any of this.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              {session ? (
                <Link href="/dashboard" className="btn-primary px-6 py-3 text-base shadow-[var(--shadow-premium)]">
                  Go to your dashboard
                </Link>
              ) : (
                <>
                  <Link href="/signup" className="btn-primary px-6 py-3 text-base shadow-[var(--shadow-premium)]">
                    Start Practising
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-[0.625rem] border border-white/25 bg-white/10 px-6 py-3 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
                  >
                    Take a Free Mock Test
                  </Link>
                </>
              )}
            </div>
            <p className="mt-4 text-xs text-slate-300">No credit card required to start on the Free plan.</p>
          </div>

          {/* Premium product-in-action visual */}
          <Reveal delayMs={150} className="relative">
            <div className="card mx-auto max-w-md overflow-hidden p-0 shadow-[var(--shadow-card-lg)]">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                <span className="text-xs font-semibold text-ink-700">Speech Analysis · Customer Service</span>
                <span className="badge badge-ai">AI Analyzed</span>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-900">Fluency</span>
                    <span className="font-semibold text-brand-700">Strong</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[85%] rounded-full bg-brand-500" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-900">Pronunciation</span>
                    <span className="font-semibold text-amber-700">Adequate</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[62%] rounded-full bg-amber-500" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-900">Grammar</span>
                    <span className="font-semibold text-brand-700">Strong</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[90%] rounded-full bg-brand-500" />
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                  <span className="font-semibold text-ink-900">Pace: </span>
                  148 WPM · Balanced
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute -bottom-6 -left-6 hidden h-28 w-28 rounded-full bg-brand-400/30 blur-2xl sm:block" />
            <div className="pointer-events-none absolute -right-8 -top-8 hidden h-32 w-32 rounded-full bg-amber-300/30 blur-2xl sm:block" />
          </Reveal>
        </div>
      </section>

      {/* Trust strip - reassurance directly under the hero, the way
          exam/certification vendors lead with credibility signals. */}
      <div className="border-b border-slate-200 bg-white py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-brand-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a5 5 0 00-5 5v2H4a1 1 0 00-1 1v8a2 2 0 002 2h10a2 2 0 002-2V9a1 1 0 00-1-1h-1V6a5 5 0 00-5-5zm3 7V6a3 3 0 10-6 0v2h6z" clipRule="evenodd" /></svg>
            Private &amp; secure
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-brand-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
            Real proctored format
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-brand-600" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2H4z" /></svg>
            AI-analyzed feedback
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-brand-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
            Honest, grounded scoring
          </span>
        </div>
      </div>

      {/* 2. Trust / Value */}
      <section className="border-b border-slate-200 bg-white py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal className="relative order-2 lg:order-1">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-[var(--shadow-card-lg)]">
              <Image
                src={IMG_TRUST}
                alt="A professional candidate completing an online assessment at a laptop"
                fill
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-5 -right-5 hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-card-lg)] sm:block">
              <p className="text-xs font-semibold text-ink-900">Interview Readiness</p>
              <p className="font-display text-2xl font-bold text-brand-600">82<span className="text-sm text-slate-400">/100</span></p>
            </div>
          </Reveal>
          <div className="order-1 lg:order-2">
            <h2 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">
              Why candidates use VocalisAi
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {[
                { title: "AI-powered practice", text: "Every exercise is built around real Voice & Accent and voice-process demands." },
                { title: "Realistic assessments", text: "Timed, proctored mock tests with camera and microphone checks - the real format, not a preview of it." },
                { title: "Real speech analysis", text: "Feedback grounded in your actual audio and transcript, never a generic estimate." },
                { title: "Progress tracking", text: "Your real scores across every mock assessment, tracked over time." },
              ].map((v) => (
                <div key={v.title}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L8.99 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="mt-3 font-display font-bold text-ink-900">{v.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{v.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works */}
      <section id="how-it-works" className="bg-ink-950 py-20 text-white">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-display text-2xl font-bold">How it works</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-300">
            The same simple loop, every time - designed to build real speaking confidence through
            repetition, not a one-time lesson.
          </p>
          <div className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((j, i) => (
              <Reveal key={j.step} delayMs={i * 90}>
                <div className="h-full rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-brand-400/40 hover:bg-white/[0.08]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 font-display font-bold">{j.step}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{j.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Key Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-display text-2xl font-bold text-ink-950">Key features</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-600">
          Everything you need to practice, get real feedback, and walk in prepared.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {KEY_FEATURES.map((f, i) => (
            <Reveal key={f.title} delayMs={(i % 3) * 80}>
              <div className="card h-full p-6 hover:-translate-y-1 hover:shadow-[var(--shadow-card-lg)]">
                <h3 className="font-display font-bold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 5. Practice / Exam Showcase */}
      <section className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-display text-2xl font-bold text-ink-950">
            Practice modes &amp; exam types
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-600">
            Three ways to practice, from a quick skill-focused exercise to a full proctored
            assessment.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {SHOWCASE.map((s, i) => (
              <Reveal key={s.title} delayMs={i * 100}>
                <div className="card h-full overflow-hidden p-0">
                  {s.label === "Full mock assessment" && (
                    <div className="relative h-36 w-full">
                      <Image
                        src={IMG_PROCTOR}
                        alt="A webcam mounted on a monitor, used for proctored online exams"
                        fill
                        sizes="(min-width: 1024px) 33vw, 90vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <span className="badge badge-neutral">{s.label}</span>
                    <h3 className="mt-3 font-display font-bold text-ink-900">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
                    <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">{s.meta}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {PRACTICE_MODES.map((m) => (
              <span key={m.slug} className="badge badge-skill">
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 6. AI Analysis Preview */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink-950">
              Feedback grounded in what you actually said
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Your recording is transcribed and genuinely analyzed - the AI listens to your actual
              audio for pronunciation and delivery, and reads your actual transcript for grammar
              and vocabulary. Every claim is grounded in something real, quoted directly from your
              response.
            </p>
            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              {AI_METRICS.map((m) => (
                <div key={m.name}>
                  <dt className="font-display text-sm font-bold text-ink-900">{m.name}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-600">{m.text}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-700">Grammar</span>
              <span className="badge badge-ai">AI Analyzed</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Excerpt</p>
                <p className="mt-1 text-sm text-ink-900">&ldquo;I will helping the customer with that.&rdquo;</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-700">Issue</p>
                <p className="mt-1 text-sm text-ink-900">Incorrect verb form after &ldquo;will&rdquo;.</p>
              </div>
              <div className="rounded-lg border border-brand-100 bg-brand-50 p-3">
                <p className="text-xs font-semibold text-brand-700">Correction</p>
                <p className="mt-1 text-sm text-ink-900">&ldquo;I will help the customer with that.&rdquo;</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">Illustrative example - your own feedback is generated from your own recording.</p>
          </div>
        </div>
      </section>

      {/* 7. Candidate Results / Progress */}
      <section className="border-y border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-display text-2xl font-bold text-ink-950">Track real improvement, not a feeling</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            Every mock assessment produces a real Interview Readiness score, and your Progress page
            tracks it across every attempt - alongside a category-by-category breakdown of where
            you&apos;re genuinely improving and where you still need work. It&apos;s calculated from
            your own completed sessions, never invented.
          </p>
          <div className="card mx-auto mt-10 max-w-lg p-6 text-left">
            <div className="flex items-center justify-between text-xs font-semibold text-ink-700">
              <span>Overall trend</span>
              <span className="text-slate-400">Last 5 attempts</span>
            </div>
            <div className="mt-4 flex h-24 items-end gap-3">
              {[42, 51, 58, 55, 69].map((v, i) => (
                <div key={i} className="flex-1 rounded-t bg-brand-500/80" style={{ height: `${v}%` }} />
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">Illustrative example - your own trend is built from your own attempts.</p>
          </div>
        </div>
      </section>

      {/* 8. Why Candidates Use It */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="text-center font-display text-2xl font-bold text-ink-950">
          Built for the problems candidates actually have
        </h2>
        <div className="mt-10 space-y-6">
          {WHY_CANDIDATES.map((w) => (
            <div key={w.title} className="flex gap-4">
              <svg className="mt-1 h-5 w-5 flex-none text-brand-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L8.99 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-display font-bold text-ink-900">{w.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{w.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9. Pricing / Plans */}
      <section className="border-y border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-display text-2xl font-bold text-ink-950">Plans</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-600">
            Every plan includes every practice mode. What changes is how much you can do each
            month, and which difficulty levels are unlocked.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_ORDER.map((plan) => {
              const limits = PLAN_LIMITS[plan];
              const difficulties = PLAN_DIFFICULTY_ACCESS[plan];
              const featured = plan === "PROFESSIONAL";
              return (
                <div
                  key={plan}
                  className={`card flex flex-col p-6 ${featured ? "border-2 border-brand-500 shadow-lg shadow-brand-900/10" : ""}`}
                >
                  {featured && <span className="badge badge-ai mb-3 w-fit">Most popular</span>}
                  <h3 className="font-display text-lg font-bold text-ink-900">{PLAN_DISPLAY[plan].label}</h3>
                  <p className="mt-1 text-xs text-slate-500">{PLAN_DISPLAY[plan].blurb}</p>
                  <ul className="mt-5 flex-1 space-y-2.5 text-sm text-ink-700">
                    {PLAN_HIGHLIGHT_FEATURES.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <svg className="mt-0.5 h-4 w-4 flex-none text-brand-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L8.99 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd" />
                        </svg>
                        <span>
                          {limits[feature]} {FEATURE_LABELS_PLURAL[feature]}
                          {plan === "FREE" ? " (lifetime)" : "/month"}
                        </span>
                      </li>
                    ))}
                    <li className="flex items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 flex-none text-brand-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L8.99 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd" />
                      </svg>
                      <span>
                        {difficulties.length === 4 ? "All difficulty levels" : `${difficulties.map((d) => d.charAt(0) + d.slice(1).toLowerCase()).join(" & ")} difficulty`}
                      </span>
                    </li>
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-6 text-center ${featured ? "btn-primary" : "btn-secondary"} py-2.5 text-sm`}
                  >
                    {plan === "FREE" ? "Start free" : `Choose ${PLAN_DISPLAY[plan].label}`}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-slate-500">
            Full feature-by-feature limits for every plan are shown on your account page after
            signup.
          </p>
        </div>
      </section>

      {/* 10. Final CTA */}
      {!session && (
        <section className="relative isolate overflow-hidden bg-ink-950">
          <Image
            src={IMG_CTA}
            alt="A candidate wearing a headset, practicing on a laptop"
            fill
            sizes="100vw"
            className="object-cover object-center opacity-50"
          />
          <div className="hero-dark-scrim absolute inset-0" />
          <div className="relative mx-auto max-w-2xl px-6 py-24 text-center">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              Your next Voice &amp; Accent round doesn&apos;t have to be a guess.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-200">
              Create a free account and take your first practice session in minutes.
            </p>
            <div className="mt-8">
              <Link href="/signup" className="btn-primary px-8 py-3.5 text-base shadow-[var(--shadow-premium)]">
                Start Practising Now
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 11. Footer */}
      <footer className="border-t border-white/10 bg-ink-950 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-slate-300">
              Vocalis<span className="font-semibold text-white">Ai</span> - practice with purpose.
            </p>
            <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-slate-400">
              <Link href="/dashboard" className="hover:text-brand-300">Dashboard</Link>
              <Link href="/practice" className="hover:text-brand-300">Practice</Link>
              <Link href="/terms" className="hover:text-brand-300">Terms</Link>
              <Link href="/privacy" className="hover:text-brand-300">Privacy</Link>
              <Link href="/refund-policy" className="hover:text-brand-300">Refunds</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
