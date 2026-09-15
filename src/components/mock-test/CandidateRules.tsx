"use client";

import { useState } from "react";

const TIPS = [
  "Stay visible on camera for the full assessment",
  "Use a quiet environment with minimal background noise",
  "Keep your microphone enabled throughout",
  "Answer naturally, in your own words - there's no single \"correct\" delivery",
  "Complete every section; you can't go back once you move on",
  "Your performance will be analyzed after the test, not while you're taking it",
];

const RULES = [
  "Your camera must remain enabled and visible throughout the test.",
  "You must remain visible in the camera frame at all times.",
  "Your microphone must remain enabled whenever a question requires speaking.",
  "No additional person should be present in the room with you.",
  "Do not leave or switch away from the assessment window.",
  "Do not use prohibited external assistance - notes, other people, other devices, or AI tools.",
  "This session's audio and video may be recorded for proctoring and practice-review purposes.",
];

export function CandidateRules({ onConfirm }: { onConfirm: () => void }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="font-display text-2xl font-bold text-ink-950">Before you begin</h1>
      <p className="mt-1 text-sm text-slate-600">A quick checklist, then the formal candidate rules.</p>

      <ul className="card mt-6 space-y-3 p-6">
        {TIPS.map((tip) => (
          <li key={tip} className="flex gap-3 text-sm text-ink-700">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L8.99 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd" />
            </svg>
            {tip}
          </li>
        ))}
      </ul>

      <h2 className="mt-8 font-display text-base font-bold text-ink-950">Candidate rules</h2>
      <p className="mt-1 text-sm text-slate-600">Please read carefully before starting.</p>

      <ul className="card mt-3 space-y-3 p-6">
        {RULES.map((rule) => (
          <li key={rule} className="flex gap-3 text-sm text-slate-700">
            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
            {rule}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-slate-500">
        Note: automated monitoring for these rules (face detection, tab-switch detection, and similar) is
        built in a later phase of this project. Right now, this step confirms you&apos;ve read and agreed
        to them.
      </p>

      <label className="mt-6 flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
        />
        I have read and agree to these rules, and I consent to this session being recorded.
      </label>

      <button onClick={onConfirm} disabled={!agreed} className="btn-primary mt-6 w-full">
        Start test
      </button>
    </div>
  );
}
