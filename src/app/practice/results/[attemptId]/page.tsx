"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PACE_LABELS, FILLER_WORDS, type PaceClassification } from "@/lib/speech-metrics";
import { RATING_SCORE, PACE_SCORE } from "@/lib/scoring-engine";
import { getModeByCategory } from "@/lib/practice-taxonomy";
import { SyncedTranscript, type TranscriptSegment } from "@/components/practice/SyncedTranscript";
import { ScoreRing } from "@/components/ui/ScoreRing";

type Rating = "strong" | "adequate" | "weak";

interface AnalysisResult {
  transcript: string;
  recordingId: string | null;
  category: string;
  hasImprovedAnswer: boolean;
  deterministic: {
    wordCount: number;
    durationSeconds: number;
    wpm: number;
    pace: PaceClassification;
    fillerCount: number;
    fillerBreakdown: Record<string, number>;
    repetitionCount: number;
    repetitionExamples: string[];
    longPauses: { afterText: string; beforeText: string; gapSeconds: number; atSeconds: number }[];
    segments: TranscriptSegment[];
  };
  ai: {
    pronunciation: { rating: Rating; mispronouncedWords: { word: string; note: string; phoneticHint?: string }[]; articulation: string; difficultSounds: string[]; intelligibility: string };
    fluency: { rating: Rating; hesitations: string; fillers: string; repetitions: string; longPauses: string; smoothness: string };
    grammar: { rating: Rating; issues: { excerpt: string; problem: string; correction: string }[]; overallComment: string };
    vocabulary: { rating: Rating; assessment: string; professionalTermsUsed: string[]; repetitiveWords: string[] };
    voiceClarity: { rating: Rating; articulation: string; volumeComment: string; clarity: string; intelligibility: string };
    delivery: { rating: Rating; confidenceIndicators: string; vocalVariation: string; engagement: string; responseCompleteness: string };
  };
}

interface ImprovedAnswer {
  improvedAnswer: string;
  improvements: { grammar: boolean; sentenceStructure: boolean; vocabulary: boolean; professionalTone: boolean; clarity: boolean };
  summary: string;
}

type Stage = "loading" | "not-analyzed" | "analyzing" | "ready" | "error";

const IMPROVEMENT_LABELS: Record<keyof ImprovedAnswer["improvements"], string> = {
  grammar: "Grammar",
  sentenceStructure: "Sentence structure",
  vocabulary: "Vocabulary",
  professionalTone: "Professional tone",
  clarity: "Clarity",
};

export default function AttemptResultsPage() {
  const params = useParams<{ attemptId: string }>();
  const [stage, setStage] = useState<Stage>("loading");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/practice/attempts/${params.attemptId}/analyze`)
      .then((res) => res.json())
      .then((data) => {
        if (data.analyzed) {
          setResult(data.result);
          setStage("ready");
        } else {
          setStage("not-analyzed");
        }
      })
      .catch(() => setStage("error"));
  }, [params.attemptId]);

  async function runAnalysis() {
    setStage("analyzing");
    setError(null);
    try {
      const res = await fetch(`/api/practice/attempts/${params.attemptId}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "We couldn't analyze your recording.");
        setStage("error");
        return;
      }
      setResult(data.result);
      setStage("ready");
    } catch {
      setError("We couldn't analyze your recording.");
      setStage("error");
    }
  }

  if (stage === "loading") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-32 animate-pulse rounded-lg bg-slate-200" />
      </div>
    );
  }

  if (stage === "not-analyzed" || stage === "analyzing") {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <span className="badge badge-skill">Speech Analysis</span>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink-950">Recording ready to analyze</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Find out exactly how your pronunciation, fluency, grammar and delivery came across - from
          real transcription and AI analysis of your actual recording. It only runs when you ask.
        </p>
        <button onClick={runAnalysis} disabled={stage === "analyzing"} className="btn-primary mt-6">
          {stage === "analyzing" ? "Analyzing... this can take a moment" : "Analyze this recording"}
        </button>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="font-display text-xl font-bold text-ink-950">We couldn&apos;t analyze your recording</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your recording was saved successfully, but the analysis service didn&apos;t respond.
          {error && error !== "We couldn't analyze your recording." ? ` (${error})` : ""}
        </p>
        <button onClick={runAnalysis} className="btn-secondary mt-4">
          Try Analysis Again
        </button>
      </div>
    );
  }

  if (!result) return null;
  const { deterministic: d, ai } = result;
  const modeDef = getModeByCategory(result.category);

  const categoryScores = [
    { label: "Pronunciation", score: RATING_SCORE[ai.pronunciation.rating] },
    { label: "Fluency", score: RATING_SCORE[ai.fluency.rating] },
    { label: "Grammar", score: RATING_SCORE[ai.grammar.rating] },
    { label: "Vocabulary", score: RATING_SCORE[ai.vocabulary.rating] },
    { label: "Pace", score: PACE_SCORE[d.pace] },
    { label: "Clarity", score: RATING_SCORE[ai.voiceClarity.rating] },
  ];
  const overallScore = Math.round(categoryScores.reduce((sum, c) => sum + c.score, 0) / categoryScores.length);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/practice" className="text-sm text-slate-500 hover:text-ink-900">
        &larr; Back to Practice
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink-950">Your Speaking Analysis</h1>
      <p className="mt-1 text-sm text-slate-600">
        Deterministic measurements are calculated directly from your recording. AI ratings are real
        indicators for you to review, not certainties.
      </p>

      <div className="card mt-6 grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex justify-center">
          <ScoreRing value={overallScore} label="Overall" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {categoryScores.map((c) => (
            <div key={c.label}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-ink-900">{c.label}</span>
                <span className="font-mono text-sm font-semibold text-slate-600">{c.score}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${c.score >= 75 ? "bg-brand-500" : c.score >= 55 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${c.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Section title="Your Response">
        <SyncedTranscript
          recordingId={result.recordingId}
          segments={d.segments}
          fallbackText={result.transcript}
          fillerWords={FILLER_WORDS}
          issueExcerpts={ai.grammar.issues.map((i) => i.excerpt)}
        />
        {d.segments.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">Click any word to jump the audio there.</p>
        )}
      </Section>

      <ImproveAnswerSection
        attemptId={params.attemptId}
        transcript={result.transcript}
        hasImprovedAnswer={result.hasImprovedAnswer}
        practiceSlug={modeDef?.slug}
      />

      <Section title="Rate of Speech" badge={`Calculated - ${PACE_SCORE[d.pace]}`}>
        <div className="flex flex-wrap gap-6">
          <Stat label="Duration" value={`${d.durationSeconds.toFixed(1)}s`} />
          <Stat label="Words" value={String(d.wordCount)} />
          <Stat label="Words per minute" value={String(d.wpm)} />
          <Stat label="Pace" value={PACE_LABELS[d.pace]} />
        </div>
      </Section>

      <Section title="Fluency" badge={`AI rating: ${ai.fluency.rating} - ${RATING_SCORE[ai.fluency.rating]}`}>
        <div className="mb-3 flex flex-wrap gap-6">
          <Stat label="Filler words" value={String(d.fillerCount)} sub={Object.entries(d.fillerBreakdown).map(([w, c]) => `${w} (${c})`).join(", ") || "none detected"} />
          <Stat label="Word repetitions" value={String(d.repetitionCount)} sub={d.repetitionExamples.join(", ") || "none detected"} />
          <Stat label="Long pauses" value={String(d.longPauses.length)} sub={d.longPauses.map((p) => `${p.gapSeconds}s at ${p.atSeconds}s`).join(", ") || "none detected"} />
        </div>
        <AiText label="Hesitations" text={ai.fluency.hesitations} />
        <AiText label="Smoothness" text={ai.fluency.smoothness} />
      </Section>

      <Section title="Pronunciation Improvement" badge={`AI rating: ${ai.pronunciation.rating} - ${RATING_SCORE[ai.pronunciation.rating]}`}>
        {ai.pronunciation.mispronouncedWords.length > 0 ? (
          <div className="mb-4 space-y-3">
            {ai.pronunciation.mispronouncedWords.map((w, i) => (
              <MispronouncedWordCard key={i} word={w} practiceSlug="pronunciation" />
            ))}
          </div>
        ) : (
          <p className="mb-3 text-sm text-slate-600">No specific pronunciation issues flagged.</p>
        )}
        <AiText label="Articulation" text={ai.pronunciation.articulation} />
        <AiText label="Difficult sounds" text={ai.pronunciation.difficultSounds.join(", ") || "None noted"} />
        <AiText label="Intelligibility" text={ai.pronunciation.intelligibility} />
      </Section>

      <Section title="Grammar" badge={`AI rating: ${ai.grammar.rating} - ${RATING_SCORE[ai.grammar.rating]}`}>
        {ai.grammar.issues.length > 0 ? (
          <ul className="mb-3 space-y-2 text-sm">
            {ai.grammar.issues.map((issue, i) => (
              <li key={i} className="rounded-md bg-red-50 p-3">
                <p className="text-slate-700">
                  <span className="font-medium">&quot;{issue.excerpt}&quot;</span> - {issue.problem}
                </p>
                <p className="mt-1 text-green-700">Correction: {issue.correction}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-sm text-slate-600">No specific grammar issues flagged.</p>
        )}
        <AiText label="Overall" text={ai.grammar.overallComment} />
      </Section>

      <Section title="Vocabulary" badge={`AI rating: ${ai.vocabulary.rating} - ${RATING_SCORE[ai.vocabulary.rating]}`}>
        <AiText label="Assessment" text={ai.vocabulary.assessment} />
        <AiText label="Professional terms used" text={ai.vocabulary.professionalTermsUsed.join(", ") || "None noted"} />
        <AiText label="Repetitive words" text={ai.vocabulary.repetitiveWords.join(", ") || "None noted"} />
      </Section>

      <Section title="Voice Clarity" badge={`AI rating: ${ai.voiceClarity.rating} - ${RATING_SCORE[ai.voiceClarity.rating]}`}>
        <AiText label="Articulation" text={ai.voiceClarity.articulation} />
        <AiText label="Volume" text={ai.voiceClarity.volumeComment} />
        <AiText label="Clarity" text={ai.voiceClarity.clarity} />
      </Section>

      <Section title="Delivery" badge={`AI rating: ${ai.delivery.rating} - ${RATING_SCORE[ai.delivery.rating]}`}>
        <AiText label="Confidence indicators" text={ai.delivery.confidenceIndicators} />
        <AiText label="Vocal variation" text={ai.delivery.vocalVariation} />
        <AiText label="Engagement" text={ai.delivery.engagement} />
        <AiText label="Response completeness" text={ai.delivery.responseCompleteness} />
        <p className="mt-3 text-xs text-slate-400">
          These are AI-derived indicators meant to prompt reflection, not certainties or psychological
          conclusions about you.
        </p>
      </Section>
    </div>
  );
}

function MispronouncedWordCard({
  word,
  practiceSlug,
}: {
  word: { word: string; note: string; phoneticHint?: string };
  practiceSlug?: string;
}) {
  function speak() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display font-bold text-ink-900">&quot;{word.word}&quot;</span>
        {word.phoneticHint && <span className="font-mono text-sm text-amber-700">{word.phoneticHint}</span>}
      </div>
      <p className="mt-1 text-sm text-slate-700">{word.note}</p>
      <div className="mt-3 flex gap-2">
        <button onClick={speak} className="btn-secondary btn-sm text-xs">
          Listen
        </button>
        {practiceSlug && (
          <Link href={`/practice/${practiceSlug}`} className="btn-primary text-xs" style={{ padding: "0.4rem 0.9rem" }}>
            Try again
          </Link>
        )}
      </div>
    </div>
  );
}

function ImproveAnswerSection({
  attemptId,
  transcript,
  hasImprovedAnswer,
  practiceSlug,
}: {
  attemptId: string;
  transcript: string;
  hasImprovedAnswer: boolean;
  practiceSlug?: string;
}) {
  const [improved, setImproved] = useState<ImprovedAnswer | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!hasImprovedAnswer) {
      setChecked(true);
      return;
    }
    fetch(`/api/practice/attempts/${attemptId}/improve`)
      .then((res) => res.json())
      .then((data) => {
        if (data.generated) setImproved(data.result);
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, [attemptId, hasImprovedAnswer]);

  async function generate() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/practice/attempts/${attemptId}/improve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't improve your answer.");
        setStatus("error");
        return;
      }
      setImproved(data.result);
      setStatus("idle");
    } catch {
      setError("Couldn't improve your answer.");
      setStatus("error");
    }
  }

  const activeImprovements = improved
    ? (Object.entries(improved.improvements) as [keyof ImprovedAnswer["improvements"], boolean][]).filter(([, v]) => v)
    : [];

  return (
    <div className="card mt-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-ink-900">Improve My Answer</h2>
        {!improved && checked && (
          <button onClick={generate} disabled={status === "loading"} className="btn-primary btn-sm text-xs disabled:opacity-60">
            {status === "loading" ? "Rewriting..." : "Improve My Answer"}
          </button>
        )}
      </div>

      {!checked && <div className="mt-3 h-4 w-40 animate-pulse rounded bg-slate-200" />}

      {checked && !improved && status !== "error" && (
        <p className="mt-2 text-sm text-slate-500">
          See a stronger version of your own answer - same content, better grammar, vocabulary and
          tone. This calls a paid AI model, so it only runs when you ask.
        </p>
      )}

      {status === "error" && (
        <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {improved && (
        <div className="mt-3 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Original Answer</p>
            <p className="mt-1 rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{transcript}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Improved Answer</p>
            <p className="mt-1 rounded-md bg-brand-50 p-3 text-sm leading-relaxed text-ink-900">{improved.improvedAnswer}</p>
          </div>
          {activeImprovements.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-ink-900">What improved?</p>
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {activeImprovements.map(([key]) => (
                  <li key={key} className="badge badge-skill">
                    {IMPROVEMENT_LABELS[key]}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-slate-600">{improved.summary}</p>
            </div>
          )}
          {practiceSlug && (
            <Link href={`/practice/${practiceSlug}`} className="btn-secondary text-sm">
              Practice the improved answer &rarr;
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="card mt-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-bold text-ink-900">{title}</h2>
        {badge && (
          <span className="whitespace-nowrap rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{badge}</span>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-ink-900">{value}</p>
      {sub && <p className="max-w-[16rem] text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function AiText({ label, text }: { label: string; text: string }) {
  return (
    <p className="mb-2 text-sm text-slate-600">
      <span className="font-medium text-slate-700">{label}: </span>
      {text}
    </p>
  );
}
