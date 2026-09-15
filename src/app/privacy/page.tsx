export const metadata = { title: "Privacy Policy - VocalisAi" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold text-ink-950">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-2xl font-bold text-ink-950">Privacy Policy</h1>
      <p className="mt-1 text-sm text-slate-500">Last updated: September 15, 2026</p>

      <p className="mt-6 text-sm leading-relaxed text-slate-700">
        This Privacy Policy explains what data VocalisAi (&quot;we&quot;, &quot;us&quot;) collects
        when you use the Service, why, and what you can do about it. VocalisAi is operated by
        Lakshay Dutt Tyagi, doing business as VocalisAi. If you have questions, contact{" "}
        <a href="mailto:pcircuit@yahoo.com" className="text-brand-600 hover:underline">
          pcircuit@yahoo.com
        </a>
        .
      </p>

      <Section title="1. What we collect">
        <p>
          <strong>Account information:</strong> your name, email address, and password (stored
          only as a one-way hash - we cannot see or recover your actual password).
        </p>
        <p>
          <strong>Profile information:</strong> anything you choose to add, such as a target job
          role or a short bio.
        </p>
        <p>
          <strong>Practice activity:</strong> your answers, written responses, and scores on
          practice questions and mock assessments.
        </p>
        <p>
          <strong>Voice recordings and transcripts:</strong> audio you record while practicing or
          taking a mock assessment, the text transcript generated from it, and AI-generated
          analysis of your speech (pace, filler words, pauses, grammar, and similar).
        </p>
        <p>
          <strong>Proctoring signals:</strong> during a proctored mock assessment, we may use your
          camera and microphone to detect signals like whether a face is visible, whether you
          switched away from the assessment tab, or whether you copied/pasted text. We do not
          perform facial recognition or identify who you are from camera data beyond these basic
          signals.
        </p>
        <p>
          <strong>Usage data:</strong> which features you've used and how many times, so we can
          apply your plan's limits correctly.
        </p>
        <p>
          <strong>Billing data:</strong> if you subscribe to a paid plan, our payment processor
          Paddle collects and processes your payment details directly - we receive confirmation
          that you're subscribed and to which plan, but never your full card number.
        </p>
      </Section>

      <Section title="2. Why we collect it">
        <ul className="list-disc space-y-1 pl-5">
          <li>To create and secure your account, and let you log in.</li>
          <li>To generate the AI feedback, scoring, and coaching the Service is built around.</li>
          <li>To show proctoring signals during a mock assessment.</li>
          <li>To enforce the usage limits of your plan.</li>
          <li>To send you account-related email (like a password reset link).</li>
          <li>To process payment for paid plans.</li>
        </ul>
        <p>We do not sell your data, and we do not use it to serve you advertising.</p>
      </Section>

      <Section title="3. Who we share it with">
        <p>
          We use a small number of third-party service providers ("subprocessors") to run the
          Service. Each one only receives the data it needs to do its job:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Groq</strong> - transcribes your voice recordings into text.
          </li>
          <li>
            <strong>Google (Gemini)</strong> - analyzes your transcripts and responses to generate
            feedback, scenarios, and coaching replies.
          </li>
          <li>
            <strong>Paddle.com</strong> - processes payment for paid plans and acts as merchant of
            record.
          </li>
          <li>
            <strong>Resend</strong> - delivers transactional email, such as password reset links.
          </li>
        </ul>
        <p>
          If you're a candidate whose mock assessment results are visible to an administrator on
          your organization's account, that administrator can see your scores, recordings, and
          usage - the same real data you see yourself, never a separately fabricated summary.
        </p>
        <p>
          We don't currently use third-party analytics or advertising trackers. If that changes,
          we'll update this policy first.
        </p>
      </Section>

      <Section title="4. Cookies">
        <p>
          We use one essential cookie to keep you logged in (a session token). We don't use
          cookies for advertising or cross-site tracking.
        </p>
      </Section>

      <Section title="5. How long we keep it">
        <p>
          We keep your account data and practice history for as long as your account is active,
          so your progress and history stay available to you. If you ask us to delete your
          account, we will delete your personal data and recordings within a reasonable time,
          except where we're required to keep certain records (for example, billing records) for
          legal or tax purposes.
        </p>
      </Section>

      <Section title="6. Your rights">
        <p>
          Depending on where you live, you may have rights to access, correct, export, or delete
          your personal data. You can exercise most of these yourself from your account, or by
          emailing{" "}
          <a href="mailto:pcircuit@yahoo.com" className="text-brand-600 hover:underline">
            pcircuit@yahoo.com
          </a>{" "}
          - we'll respond within a reasonable time.
        </p>
      </Section>

      <Section title="7. Security">
        <p>
          We take reasonable technical measures to protect your data, including hashing
          passwords and restricting who can access recordings and scores to you and, where
          applicable, your organization's administrator. No system is perfectly secure, and we
          can't guarantee absolute security.
        </p>
      </Section>

      <Section title="8. Children">
        <p>VocalisAi is not directed at, and should not be used by, anyone under 18.</p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. If we make a material change,
          we'll make a reasonable effort to notify you before it takes effect.
        </p>
      </Section>
    </div>
  );
}
