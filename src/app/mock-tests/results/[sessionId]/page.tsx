"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getModeByCategory } from "@/lib/practice-taxonomy";
import { SCORE_CATEGORIES, CATEGORY_LABELS, type ScoreCategory } from "@/lib/scoring-engine";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { CircleCheck } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

interface SectionSummary {
  category: string;
  difficulty: string;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  scoredCount: number;
  attempts: {
    attemptId: string;
    prompt: string;
    isCorrect: boolean | null;
    score: number | null;
    hasRecording: boolean;
    voiceRating: "strong" | "adequate" | "weak" | null;
  }[];
}

interface Summary {
  sessionId: string;
  startedAt: string;
  endedAt: string | null;
  templateName: string | null;
  totalQuestions: number;
  proctoringEventCount: number;
  sections: SectionSummary[];
}

interface CategoryScore {
  score: number | null;
  basis: string;
}

interface ScoreReport {
  overallScore: number | null;
  categories: Record<ScoreCategory, CategoryScore>;
}

interface ResultsReport {
  summary: string;
  strengths: { point: string; evidence: string }[];
  improvements: { point: string; evidence: string; tip: string }[];
}

// Maps a scoring category to the closest practice mode a candidate could
// actually go drill - real, existing modes only. PROCTORING_INTEGRITY has
// no mapping since it's a rules-compliance signal, not a practicable skill.
const CATEGORY_TO_PRACTICE: Partial<Record<ScoreCategory, string>> = {
  PRONUNCIATION: "PRONUNCIATION",
  FLUENCY: "FLUENCY",
  RATE_OF_SPEECH: "SPEAKING",
  GRAMMAR: "GRAMMAR",
  VOCABULARY: "VOCABULARY",
  VOICE_CLARITY: "PRONUNCIATION",
  LISTENING: "LISTENING",
  COMPREHENSION: "READING_COMPREHENSION",
  CUSTOMER_HANDLING: "CUSTOMER_SERVICE",
  RESPONSE_QUALITY: "SPEAKING",
};

const VOICE_RATING_STYLE: Record<"strong" | "adequate" | "weak", string> = {
  strong: "bg-green-50 text-green-700",
  adequate: "bg-amber-50 text-amber-700",
  weak: "bg-red-50 text-red-700",
};

const VOICE_RATING_LABEL: Record<"strong" | "adequate" | "weak", string> = {
  strong: "Strong",
  adequate: "Adequate",
  weak: "Weak",
};

function readinessLine(score: number | null): string {
  if (score === null) return "Analyze more responses to see your readiness.";
  if (score >= 80) return "You're interview ready.";
  if (score >= 60) return "You're nearly ready.";
  return "Keep practicing - you're building toward ready.";
}

export default function MockTestResultsPage() {
  const params = useParams<{ sessionId: string }>();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [scoreReport, setScoreReport] = useState<ScoreReport | null>(null);
  const [scoreReportError, setScoreReportError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [resultsReport, setResultsReport] = useState<ResultsReport | null>(null);
  const [reportChecked, setReportChecked] = useState(false);
  const [reportStatus, setReportStatus] = useState<"idle" | "loading" | "error">("idle");
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/mock-tests/sessions/${params.sessionId}/summary`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setSummary(data);
      })
      .catch(() => setError("Couldn't load results."));

    fetch(`/api/mock-tests/sessions/${params.sessionId}/score`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setScoreReportError(data.error);
        else setScoreReport(data);
      })
      .catch(() => setScoreReportError("Couldn't load your score."));

    // Only checks whether a report already exists - never generates one.
    // Generation is a paid AI call, so it only ever happens on an explicit
    // click below.
    fetch(`/api/mock-tests/sessions/${params.sessionId}/report`)
      .then((res) => res.json())
      .then((data) => {
        if (data.generated) setResultsReport(data.result);
      })
      .catch(() => {})
      .finally(() => setReportChecked(true));
  }, [params.sessionId]);

  async function generateReport() {
    setReportStatus("loading");
    setReportError(null);
    try {
      const res = await fetch(`/api/mock-tests/sessions/${params.sessionId}/report`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setReportError(data.error ?? "Couldn't generate the report.");
        setReportStatus("error");
        return;
      }
      setResultsReport(data.result);
      setReportStatus("idle");
    } catch {
      setReportError("Couldn't generate the report.");
      setReportStatus("error");
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-64 animate-pulse rounded-lg bg-slate-200" />
      </div>
    );
  }

  const totalScored = summary.sections.reduce((sum, s) => sum + s.scoredCount, 0);
  const totalCorrect = summary.sections.reduce((sum, s) => sum + s.correctCount, 0);

  const scoredCategories = scoreReport
    ? SCORE_CATEGORIES.map((cat) => ({ cat, score: scoreReport.categories[cat].score })).filter(
        (c): c is { cat: ScoreCategory; score: number } => c.score !== null
      )
    : [];
  const strongAreas = scoredCategories.filter((c) => c.score >= 75).sort((a, b) => b.score - a.score);
  const weakAreas = scoredCategories.filter((c) => c.score < 60).sort((a, b) => a.score - b.score);
  const recommended = weakAreas[0] ?? null;
  const recommendedPracticeCategory = recommended ? CATEGORY_TO_PRACTICE[recommended.cat] : null;
  const recommendedSlug = recommendedPracticeCategory ? getModeByCategory(recommendedPracticeCategory)?.slug : undefined;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink-950">Interview Performance</h1>
      <p className="mt-1 text-sm text-slate-600">{summary.templateName ?? "Assessment"}</p>

      {scoreReportError && !scoreReport && (
        <p role="alert" className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {scoreReportError}
        </p>
      )}

      {scoreReport && (
        <>
          <div className="card mt-6 grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex justify-center">
              <ScoreRing value={scoreReport.overallScore} label="Readiness" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-ink-900">{readinessLine(scoreReport.overallScore)}</p>
              <p className="mt-1 text-xs text-slate-500">
                Average of every category below with data. Each category is computed from real
                measurements and structured AI ratings, never a single AI-invented number.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {strongAreas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Strong areas</p>
                    <ul className="mt-1.5 space-y-1 text-sm text-ink-900">
                      {strongAreas.map((c) => (
                        <li key={c.cat} className="flex items-center gap-1.5">
                          <Icon as={CircleCheck} className="text-green-600" />
                          {CATEGORY_LABELS[c.cat]}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {weakAreas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Improve before your next interview
                    </p>
                    <ul className="mt-1.5 space-y-1 text-sm text-ink-900">
                      {weakAreas.map((c) => (
                        <li key={c.cat}>&bull; {CATEGORY_LABELS[c.cat]}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {recommended && recommendedSlug && (
            <div className="card mt-4 flex items-center justify-between gap-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended next practice</p>
                <p className="mt-1 font-display font-bold text-ink-900">
                  {getModeByCategory(recommendedPracticeCategory!)?.label} Drill
                </p>
                <p className="mt-0.5 text-sm text-slate-600">
                  Your {CATEGORY_LABELS[recommended.cat]} score was {recommended.score} this session.
                </p>
              </div>
              <Link href={`/practice/${recommendedSlug}`} className="btn-primary flex-none">
                Start Recommended Practice
              </Link>
            </div>
          )}

          <details className="card mt-4 p-6">
            <summary className="cursor-pointer font-display font-bold text-ink-900">
              Full category breakdown
            </summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {SCORE_CATEGORIES.map((cat) => {
                const c = scoreReport.categories[cat];
                return (
                  <div key={cat} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink-900">{CATEGORY_LABELS[cat]}</span>
                      <span className="text-sm font-semibold text-ink-900">{c.score ?? "N/A"}</span>
                    </div>
                    {c.score !== null && (
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-brand-500" style={{ width: `${c.score}%` }} />
                      </div>
                    )}
                    <p className="mt-1 text-xs text-slate-500">{c.basis}</p>
                  </div>
                );
              })}
            </div>
          </details>
        </>
      )}

      <div className="card mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-ink-900">AI Coaching Report</h2>
          {reportChecked && !resultsReport && (
            <button
              type="button"
              onClick={generateReport}
              disabled={reportStatus === "loading"}
              className="btn-primary text-sm disabled:opacity-60"
            >
              {reportStatus === "loading" ? "Generating..." : "Generate AI report"}
            </button>
          )}
        </div>

        {!reportChecked && <div className="mt-3 h-4 w-40 animate-pulse rounded bg-slate-200" />}

        {reportChecked && !resultsReport && reportStatus !== "error" && (
          <p className="mt-2 text-sm text-slate-500">
            Get a written summary of your strengths and areas to improve, generated from your real
            scores and response notes above. This calls a paid AI model, so it only runs when you ask.
          </p>
        )}

        {reportStatus === "error" && (
          <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {reportError}
          </p>
        )}

        {resultsReport && (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-slate-700">{resultsReport.summary}</p>

            {resultsReport.strengths.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-green-700">Strengths</h3>
                <ul className="mt-2 space-y-2">
                  {resultsReport.strengths.map((s, i) => (
                    <li key={i} className="rounded-md bg-green-50 p-3">
                      <p className="text-sm font-medium text-ink-900">{s.point}</p>
                      <p className="mt-1 text-xs text-slate-600">{s.evidence}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {resultsReport.improvements.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-amber-700">Areas to improve</h3>
                <ul className="mt-2 space-y-2">
                  {resultsReport.improvements.map((imp, i) => (
                    <li key={i} className="rounded-md bg-amber-50 p-3">
                      <p className="text-sm font-medium text-ink-900">{imp.point}</p>
                      <p className="mt-1 text-xs text-slate-600">{imp.evidence}</p>
                      <p className="mt-1 text-xs font-medium text-amber-800">Tip: {imp.tip}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card mt-4 grid grid-cols-3 gap-6 p-6 text-center">
        <div>
          <p className="text-xs text-slate-500">Questions answered</p>
          <p className="text-xl font-semibold text-ink-900">{summary.totalQuestions}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Scored correct</p>
          <p className="text-xl font-semibold text-ink-900">
            {totalScored > 0 ? `${totalCorrect} / ${totalScored}` : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Proctoring events</p>
          <p className="text-xl font-semibold text-ink-900">{summary.proctoringEventCount}</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {summary.sections.map((section) => {
          const modeDef = getModeByCategory(section.category);
          return (
            <div key={section.category} className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-ink-900">{modeDef?.label ?? section.category}</h2>
                <span className="text-sm text-slate-500">
                  {section.answeredCount}/{section.questionCount} answered
                  {section.scoredCount > 0 && ` - ${section.correctCount}/${section.scoredCount} correct`}
                </span>
              </div>
              <ul className="mt-3 space-y-1">
                {section.attempts.map((a) => (
                  <li key={a.attemptId} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{a.prompt}</span>
                    {a.hasRecording ? (
                      <span className="flex items-center gap-2">
                        {a.voiceRating && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VOICE_RATING_STYLE[a.voiceRating]}`}>
                            {VOICE_RATING_LABEL[a.voiceRating]}
                          </span>
                        )}
                        <Link href={`/practice/results/${a.attemptId}`} className="text-brand-600 hover:underline">
                          View analysis &rarr;
                        </Link>
                      </span>
                    ) : a.score !== null ? (
                      <span className={a.isCorrect ? "font-medium text-green-700" : "font-medium text-red-700"}>
                        {a.isCorrect ? "Correct" : "Incorrect"}
                      </span>
                    ) : (
                      <span className="text-slate-500">Saved</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Proctoring flags from this session are signals for review, not proof of anything.
        {scoreReport && Object.values(scoreReport.categories).some((c) => c.basis.includes("not yet analyzed")) && (
          <>
            {" "}Some categories are still missing analyzed responses and are excluded from the score
            above until analysis finishes - reload this page in a moment.
          </>
        )}
      </p>

      <Link href="/dashboard" className="btn-primary mt-6 inline-block">
        Back to dashboard
      </Link>
    </div>
  );
}
