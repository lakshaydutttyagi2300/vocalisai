import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const RECOGNITION = [
  "I know English, but I struggle when I have to speak under pressure.",
  "I don't actually know which pronunciation mistakes I'm making.",
  "I speak too fast - or too slowly - and I don't realize it in the moment.",
  "I use a lot of filler words without noticing.",
  "My answers sound rehearsed instead of natural.",
  "I keep getting rejected in Voice & Accent rounds and I don't know why.",
  "I want realistic speaking practice, not just grammar exercises.",
  "I want to know what I sound like before someone else is judging it.",
];

const JOURNEY = [
  {
    step: "Practice",
    text: "Choose a skill - pronunciation, fluency, grammar, customer-service roleplay, and more - and answer a realistic question.",
  },
  {
    step: "Record",
    text: "Speak naturally into your own microphone. No scripts, no typing your answer instead of saying it.",
  },
  {
    step: "Analyze",
    text: "Your actual recording is transcribed and analyzed - real speech, not a guess at what you probably sound like.",
  },
  {
    step: "Understand",
    text: "See exactly where your communication needs work - a mispronounced word, a filler habit, a grammar slip - with real detail, not just a vague score.",
  },
  {
    step: "Improve",
    text: "Review the feedback, see a stronger version of your own answer, and practice the same skill again.",
  },
  {
    step: "Build confidence",
    text: "Repeat realistic practice until speaking under interview pressure feels familiar instead of frightening.",
  },
];

const FEATURES = [
  {
    title: "AI Speech Analysis",
    what: "Record any spoken answer and get a real analysis of it - pronunciation, fluency, grammar, vocabulary, pace and delivery.",
    matters: "Most people fail Voice & Accent rounds without ever finding out exactly why. This tells you.",
    get: "A transcript of what you actually said, specific pronunciation notes, and a category-by-category look at your response.",
    when: "After any voice practice exercise, whenever you want to know how you really sounded.",
  },
  {
    title: "Improve My Answer",
    what: "See a stronger version of the answer you just gave, side by side with the original.",
    matters: "It's one thing to be told 'your grammar needs work.' It's another to see the exact fix.",
    get: "A rewritten version of your own answer, plus a plain-language note on what actually changed and why.",
    when: "Right after reviewing a speech analysis, before you try the same type of question again.",
  },
  {
    title: "Interview Simulation",
    what: "A real back-and-forth spoken conversation with an AI playing a customer, an interviewer, a supervisor, or a casual conversation partner.",
    matters: "Reading a question on a screen isn't the same as someone actually talking to you. This is a practice environment for answering spontaneously, thinking on your feet, and keeping your composure - not a scripted quiz.",
    get: "A live conversation that responds to what you actually say, followed by feedback on how you handled it.",
    when: "When you want practice that feels closer to a real interview or a real customer call than a list of questions.",
  },
  {
    title: "Full Mock Assessment",
    what: "A complete, timed, proctored practice test - camera and microphone checks, clear instructions, multiple sections, and a full result at the end.",
    matters: "The unfamiliar parts of a real assessment (being on camera, working against a clock, not knowing what's next) can throw people off as much as the questions themselves. Practicing the format matters, not just the content.",
    get: "A realistic run-through of a full assessment, plus a complete results breakdown afterward.",
    when: "Before an actual Voice & Accent or hiring assessment, to practice the format as well as the content. This is a practice environment, not an official examination.",
  },
  {
    title: "Personal AI Coach",
    what: "A chat you can ask directly - 'what should I focus on?' - that answers based on your own real practice history.",
    matters: "Generic advice doesn't tell you what YOU specifically need to work on.",
    get: "Answers grounded in your own recorded performance, not a generic English-learning tip.",
    when: "Whenever you're not sure what to practice next.",
  },
  {
    title: "AI-Generated Scenarios",
    what: "Request a fresh practice scenario on a topic of your choice, instead of only working from a fixed set of questions.",
    matters: "Real interviews and real calls don't repeat the same question twice.",
    get: "A new, realistic scenario built for the skill and topic you ask for.",
    when: "When you've worked through the standard questions and want new material to practice on.",
  },
];

const VOICE_ACCENT_TERMS = [
  { term: "Pronunciation", text: "Whether individual words are said clearly enough to be understood." },
  { term: "Clarity", text: "How easy your speech is to follow overall, not just word by word." },
  { term: "Fluency", text: "Speaking with a natural flow, without long hesitations breaking up your answer." },
  { term: "Pace", text: "Whether you're speaking at a speed a listener can comfortably follow." },
  { term: "Grammar", text: "Sentence structure, tense and agreement in what you actually said." },
  { term: "Vocabulary", text: "Whether your word choice fits a professional, clear conversation." },
  { term: "Filler words", text: "Habits like 'um,' 'like,' or 'you know' that can distract from your answer." },
  { term: "Answer quality", text: "Whether your response actually addresses what was asked, clearly and completely." },
];

const WHO_FOR = [
  {
    title: "Recruitment Candidates",
    text: "Prepare for spoken-English and communication rounds at international companies, whatever the interview format.",
  },
  {
    title: "Students & Study Abroad",
    text: "Build the speaking, listening and proficiency skills needed for academic and international life.",
  },
  {
    title: "Working Professionals",
    text: "Sharpen your spoken English for meetings, presentations, and everyday professional communication.",
  },
  {
    title: "Freshers",
    text: "Build real speaking confidence before your first interview, in a low-pressure practice environment.",
  },
  {
    title: "Voice & Accent / BPO Candidates",
    text: "Prepare specifically for Voice & Accent rounds and voice-process interviews - one of many assessment types VocalisAi supports.",
  },
  {
    title: "Anyone Improving Spoken English",
    text: "Practice real speaking, listening and communication skills for whatever goal brought you here.",
  },
];

const WHY = [
  {
    title: "Built around the actual interview, not general English",
    text: "Every exercise is modeled on real Voice & Accent and voice-process demands - not vocabulary lists or grammar drills disconnected from the job.",
  },
  {
    title: "Practice before you're evaluated, not during",
    text: "The proctored mock assessment and interview simulation exist so the first time you experience that format isn't in front of a recruiter.",
  },
  {
    title: "Feedback on what you actually said",
    text: "Every analysis comes from your own recording - a real transcript and real measurements, not an estimate.",
  },
  {
    title: "Built for repetition",
    text: "You're not meant to use each exercise once. The same skills are practiced again with new material until they feel familiar.",
  },
  {
    title: "Your own progress, tracked",
    text: "See your real scores across sessions - where you're improving and where you're not, based on your own history.",
  },
];

const FAQS = [
  {
    q: "What is VocalisAi?",
    a: "An AI-powered platform for English communication, Voice & Accent, and spoken-English proficiency practice - real speaking exercises, real recordings, and real AI-supported feedback, for recruitment assessments, proficiency exams, study abroad, or everyday professional communication.",
  },
  {
    q: "Is VocalisAi an English-learning app?",
    a: "No. VocalisAi doesn't teach English from scratch. It's built for people who already speak English and want realistic, job-focused speaking practice with feedback on their actual performance.",
  },
  {
    q: "Will this change my accent?",
    a: "No, and that's not the goal. VocalisAi focuses on clear, professional, understandable communication - not eliminating your natural accent or making you sound like someone else.",
  },
  {
    q: "How does the AI feedback work?",
    a: "You record a real spoken answer. It's transcribed, measured (things like speaking pace and filler words), and reviewed by AI for pronunciation, fluency, grammar, vocabulary and delivery. The feedback is based on what you actually said and how you actually said it.",
  },
  {
    q: "Is the Full Mock Assessment an official exam?",
    a: "No. It's a realistic practice environment - camera/microphone checks, timed sections, and a full results breakdown - designed to feel similar to a real assessment. It is not an official examination and doesn't connect to any employer.",
  },
  {
    q: "Can VocalisAi guarantee I'll pass my interview or get a job?",
    a: "No. No practice platform can guarantee an interview or hiring outcome, and we won't claim otherwise. What VocalisAi can do is give you realistic practice and honest feedback on your own performance, so you walk in more prepared.",
  },
  {
    q: "Do I need a microphone?",
    a: "Yes, for any speaking exercise, the interview simulation, or the mock assessment. Text-based practice (like grammar or vocabulary questions) doesn't require one.",
  },
  {
    q: "Do I need a camera?",
    a: "Only for the Full Mock Assessment, which includes a camera check to mirror a real proctored assessment. Voice practice and interview simulation only need a microphone.",
  },
  {
    q: "Can I practice more than once?",
    a: "Yes - the same skills are meant to be practiced repeatedly, with new material each time, so you can build familiarity rather than memorizing one answer.",
  },
  {
    q: "What kinds of assessments and roles can I prepare for?",
    a: "Recruitment interviews and Voice & Accent rounds at international companies, English proficiency and study-abroad assessments, and voice-process/BPO/ITES roles - along with general spoken-English and communication improvement for work or study.",
  },
  {
    q: "Which countries can use VocalisAi?",
    a: "VocalisAi is built for anyone preparing for an English speaking, listening, or communication assessment internationally - whatever your goal and wherever you're applying or studying from.",
  },
];

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
          <span className="badge badge-skill">AI Voice &amp; Accent Coach</span>

          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            Walk into your Voice &amp; Accent interview
            <span className="block text-brand-600">already knowing what you sound like.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            VocalisAi is a practice platform for anyone who needs to demonstrate or improve their
            spoken English - recruitment assessments, Voice &amp; Accent rounds, study-abroad and
            proficiency exams, or everyday professional communication. Record real spoken answers,
            get real AI feedback on your pronunciation, fluency and grammar, and practice -
            repeatedly - until speaking under pressure feels familiar instead of frightening.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {session ? (
              <Link href="/dashboard" className="btn-primary px-6 py-3 text-base">
                Go to your dashboard
              </Link>
            ) : (
              <>
                <Link href="/signup" className="btn-primary px-6 py-3 text-base">
                  Start Practicing
                </Link>
                <Link href="#how-it-works" className="btn-secondary px-6 py-3 text-base">
                  See How It Works
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Problem recognition */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="text-center font-display text-2xl font-bold text-ink-950">Does this sound familiar?</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600">
          Most candidates who struggle in Voice &amp; Accent rounds aren&apos;t missing knowledge -
          they&apos;re missing practice under real speaking conditions, and honest feedback on what&apos;s
          actually happening.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {RECOGNITION.map((line) => (
            <li key={line} className="card flex gap-3 p-4 text-sm text-ink-700">
              <svg className="mt-0.5 h-4 w-4 flex-none text-brand-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M18 10c0 4.418-3.582 8-8 8a7.96 7.96 0 01-4.06-1.11L2 18l1.11-3.94A7.96 7.96 0 012 10c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
              </svg>
              &ldquo;{line}&rdquo;
            </li>
          ))}
        </ul>
      </section>

      {/* How it works / journey */}
      <section id="how-it-works" className="bg-ink-950 py-20 text-white">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-display text-2xl font-bold">How VocalisAi works</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-300">
            The same simple loop, every time - designed to build real speaking confidence through
            repetition, not a one-time lesson.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {JOURNEY.map((j, i) => (
              <div key={j.step} className="rounded-xl border border-white/10 bg-white/5 p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-display font-bold">{j.step}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{j.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center font-display text-2xl font-bold text-ink-950">What you&apos;ll actually use</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-600">
          Practicing without knowing what you&apos;re doing wrong can only take you so far. Every
          feature below exists to close that gap - real feedback on your real performance, not a
          guess.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <h3 className="font-display font-bold text-ink-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.what}</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                <span className="font-semibold text-brand-700">Why it matters: </span>
                {f.matters}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                <span className="font-semibold text-ink-900">You get: </span>
                {f.get}
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">{f.when}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Voice & Accent explainer */}
      <section className="border-y border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-display text-2xl font-bold text-ink-950">
            What &ldquo;Voice &amp; Accent&rdquo; practice actually means here
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-600">
            VocalisAi is not about changing who you are or where you&apos;re from. There is no
            &ldquo;correct&rdquo; accent, and practicing here won&apos;t ask you to sound like anyone but a
            clearer version of yourself. The goal is confident, professional, easily understood
            communication - the kind international voice roles are actually evaluated on.
          </p>
          <dl className="mt-10 grid gap-5 sm:grid-cols-2">
            {VOICE_ACCENT_TERMS.map((v) => (
              <div key={v.term} className="rounded-lg border border-slate-200 p-4">
                <dt className="font-display font-bold text-ink-900">{v.term}</dt>
                <dd className="mt-1 text-sm text-slate-600">{v.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Progress */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="font-display text-2xl font-bold text-ink-950">Improvement you can see, not just feel</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Every mock assessment produces a real Interview Readiness score, and your Progress page
          tracks it across every session - alongside a category-by-category breakdown of where
          you&apos;re genuinely improving and where you still need work. It&apos;s calculated from
          your own completed assessments, never invented.
        </p>
      </section>

      {/* Who it's for */}
      <section className="border-y border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-display text-2xl font-bold text-ink-950">Who VocalisAi is for</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHO_FOR.map((w) => (
              <div key={w.title} className="card p-5">
                <h3 className="font-display font-bold text-ink-900">{w.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why VocalisAi */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="text-center font-display text-2xl font-bold text-ink-950">Why VocalisAi</h2>
        <div className="mt-10 space-y-6">
          {WHY.map((w) => (
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

      {/* Trust */}
      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-2xl font-bold text-ink-950">Built to be honest with you</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            Your practice account and recordings are private to you. Every score you see is
            calculated from something you actually did - never invented, and never inflated to make
            you feel better. When there isn&apos;t enough data for a score yet, VocalisAi says so
            instead of guessing. And no practice platform, including this one, can promise you a job
            or a passed interview - what it can do is make sure you&apos;re not walking in without
            having practiced.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="text-center font-display text-2xl font-bold text-ink-950">Frequently asked questions</h2>
        <div className="mt-10 space-y-6">
          {FAQS.map((f) => (
            <div key={f.q}>
              <h3 className="font-display font-semibold text-ink-900">{f.q}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      {!session && (
        <section className="hero-gradient">
          <div className="mx-auto max-w-2xl px-6 py-16 text-center">
            <h2 className="font-display text-2xl font-bold text-ink-950">
              Your next Voice &amp; Accent round doesn&apos;t have to be a guess.
            </h2>
            <div className="mt-6">
              <Link href="/signup" className="btn-primary px-6 py-3 text-base">
                Start Practicing
              </Link>
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-slate-200 py-8">
        <p className="text-center text-sm text-slate-500">
          Vocalis<span className="font-semibold text-ink-900">Ai</span> - practice with
          purpose.
        </p>
        <nav className="mt-3 flex justify-center gap-4 text-xs text-slate-400">
          <Link href="/terms" className="hover:text-slate-600">Terms</Link>
          <Link href="/privacy" className="hover:text-slate-600">Privacy</Link>
          <Link href="/refund-policy" className="hover:text-slate-600">Refunds</Link>
        </nav>
      </footer>
    </div>
  );
}
