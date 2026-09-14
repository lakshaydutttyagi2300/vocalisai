"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PACE_LABELS, type PaceClassification } from "@/lib/speech-metrics";
import { SyncedTranscript, type TranscriptSegment } from "@/components/practice/SyncedTranscript";

interface AnalysisResult {
  transcript: string;
  recordingId: string | null;
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
    pronunciation: { mispronouncedWords: { word: string; note: string }[]; articulation: string; difficultSounds: string[]; intelligibility: string };
    fluency: { hesitations: string; fillers: string; repetitions: string; longPauses: string; smoothness: string };
    grammar: { issues: { excerpt: string; problem: string; correction: string }[]; overallComment: string };
    vocabulary: { assessment: string; professionalTermsUsed: string[]; repetitiveWords: string[] };
    voiceClarity: { articulation: string; volumeComment: string; clarity: string; intelligibility: string };
    delivery: { confidenceIndicators: string; vocalVariation: string; engagement: string; responseCompleteness: string };
  };
}

type Stage = "loading" | "not-analyzed" | "analyzing" | "ready" | "error";

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
        setError(data.error || "Analysis failed.");
        setStage("error");
        return;
      }
      setResult(data.result);
      setStage("ready");
    } catch {
      setError("Network error while analyzing.");
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
        <h1 className="text-2xl font-semibold text-ink-950">Recording ready to analyze</h1>
        <p className="mt-3 text-sm text-slate-600">
          This sends your recording for real transcription and AI analysis. It only runs when you ask -
          nothing is analyzed automatically.
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
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error || "Something went wrong."}
        </p>
        <button onClick={runAnalysis} className="btn-secondary mt-4">
          Try again
        </button>
      </div>
    );
  }

  if (!result) return null;
  const { deterministic: d, ai } = result;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/practice" className="text-sm text-slate-500 hover:text-ink-900">
        &larr; Back to Practice
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-ink-950">Recording analysis</h1>
      <p className="mt-1 text-sm text-slate-600">
        Deterministic measurements are calculated directly from your recording. AI sections are
        indicators for you to review, not certainties.
      </p>

      <Section title="Transcript">
        <SyncedTranscript recordingId={result.recordingId} segments={d.segments} fallbackText={result.transcript} />
        {d.segments.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">Click any word to jump the audio there.</p>
        )}
      </Section>

      <Section title="Rate of Speech" badge="Calculated">
        <div className="flex flex-wrap gap-6">
          <Stat label="Duration" value={`${d.durationSeconds.toFixed(1)}s`} />
          <Stat label="Words" value={String(d.wordCount)} />
          <Stat label="Words per minute" value={String(d.wpm)} />
          <Stat label="Pace" value={PACE_LABELS[d.pace]} />
        </div>
      </Section>

      <Section title="Fluency">
        <div className="mb-3 flex flex-wrap gap-6">
          <Stat label="Filler words" value={String(d.fillerCount)} sub={Object.entries(d.fillerBreakdown).map(([w, c]) => `${w} (${c})`).join(", ") || "none detected"} />
          <Stat label="Word repetitions" value={String(d.repetitionCount)} sub={d.repetitionExamples.join(", ") || "none detected"} />
          <Stat label="Long pauses" value={String(d.longPauses.length)} sub={d.longPauses.map((p) => `${p.gapSeconds}s at ${p.atSeconds}s`).join(", ") || "none detected"} />
        </div>
        <AiText label="Hesitations" text={ai.fluency.hesitations} />
        <AiText label="Smoothness" text={ai.fluency.smoothness} />
      </Section>

      <Section title="Pronunciation" badge="AI-assessed from audio">
        {ai.pronunciation.mispronouncedWords.length > 0 && (
          <ul className="mb-3 space-y-1 text-sm">
            {ai.pronunciation.mispronouncedWords.map((w, i) => (
              <li key={i}>
                <span className="font-medium text-ink-900">{w.word}:</span> <span className="text-slate-600">{w.note}</span>
              </li>
            ))}
          </ul>
        )}
        <AiText label="Articulation" text={ai.pronunciation.articulation} />
        <AiText label="Difficult sounds" text={ai.pronunciation.difficultSounds.join(", ") || "None noted"} />
        <AiText label="Intelligibility" text={ai.pronunciation.intelligibility} />
      </Section>

      <Section title="Grammar" badge="AI-assessed from transcript">
        {ai.grammar.issues.length > 0 ? (
          <ul className="mb-3 space-y-2 text-sm">
            {ai.grammar.issues.map((issue, i) => (
              <li key={i} className="rounded-md bg-slate-50 p-3">
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

      <Section title="Vocabulary" badge="AI-assessed from transcript">
        <AiText label="Assessment" text={ai.vocabulary.assessment} />
        <AiText label="Professional terms used" text={ai.vocabulary.professionalTermsUsed.join(", ") || "None noted"} />
        <AiText label="Repetitive words" text={ai.vocabulary.repetitiveWords.join(", ") || "None noted"} />
      </Section>

      <Section title="Voice Clarity" badge="AI-assessed from audio">
        <AiText label="Articulation" text={ai.voiceClarity.articulation} />
        <AiText label="Volume" text={ai.voiceClarity.volumeComment} />
        <AiText label="Clarity" text={ai.voiceClarity.clarity} />
      </Section>

      <Section title="Delivery" badge="AI-derived indicators, not facts">
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

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="card mt-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink-900">{title}</h2>
        {badge && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{badge}</span>
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
