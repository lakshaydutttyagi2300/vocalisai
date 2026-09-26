"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SystemCheck } from "@/components/system-check/SystemCheck";
import { useMicLevel } from "@/hooks/useMicLevel";
import { uploadRecording } from "@/lib/upload-recording-client";
import { StimulusView } from "@/components/questions/StimulusView";
import { ArrowLeft, ArrowRight, AudioLines, Check, Mic, RotateCcw, Sparkles, Square } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import type { Stimulus } from "@/lib/question-stimulus";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  type Difficulty,
  type PracticeModeDef,
} from "@/lib/practice-taxonomy";

type Question = {
  id: string;
  category: string;
  difficulty: string;
  type: string;
  prompt: string;
  passage: string | null;
  stimulus?: Stimulus;
  timeLimitSeconds: number;
  source?: string;
};

type Feedback = {
  scoringCriteria: string | null;
  durationSeconds: number;
  attemptId: string;
};

type Stage =
  | "system-check"
  | "pick-difficulty"
  | "loading"
  | "in-progress"
  | "finished"
  | "error";

type RecordingState = "idle" | "recording" | "recorded" | "uploading";

// Only these voice categories support on-demand AI scenario generation
// (Phase 18) - see gemini-scenario-provider.ts for why MCQ/comprehension
// categories are excluded.
const AI_SCENARIO_CATEGORIES = new Set(["READING", "PRONUNCIATION", "FLUENCY", "SPEAKING", "CUSTOMER_SERVICE"]);
const MAX_TOPIC_LENGTH = 100;

export function VoicePracticeSession({ mode }: { mode: PracticeModeDef }) {
  const [stage, setStage] = useState<Stage>("system-check");
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);

  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [completedAttemptIds, setCompletedAttemptIds] = useState<string[]>([]);

  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const recordStartRef = useRef<number>(0);
  const questionStartRef = useRef<number>(Date.now());

  const micLevel = useMicLevel(recordingState === "recording" ? micStream : null);
  const currentQuestion = questions[index];

  useEffect(() => {
    if (stage !== "in-progress" || !currentQuestion) return;
    setSecondsLeft(currentQuestion.timeLimitSeconds);
    questionStartRef.current = Date.now();

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          if (recorderRef.current?.state === "recording") stopRecording();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, index]);

  useEffect(() => {
    return () => {
      micStream?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSystemReady({ micStream: stream }: { cameraStream: MediaStream | null; micStream: MediaStream | null }) {
    setMicStream(stream);
    setStage("pick-difficulty");
  }

  async function startSession(chosen: Difficulty) {
    setDifficulty(chosen);
    setStage("loading");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/practice/questions?category=${mode.category}&difficulty=${chosen}&count=5`);
      const data = await res.json();

      if (!res.ok || !data.questions?.length) {
        setErrorMessage(data.error || "No questions available for this difficulty yet.");
        setStage("error");
        return;
      }

      setQuestions(data.questions);
      setIndex(0);
      setCompletedCount(0);
      resetRecordingUi();
      setStage("in-progress");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStage("error");
    }
  }

  async function generateAndStart(chosen: Difficulty) {
    setDifficulty(chosen);
    setGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/practice/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: mode.category, difficulty: chosen, topic: topic.trim() || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setGenerateError(data.error || "Couldn't generate a scenario. Please try again.");
        return;
      }

      setQuestions([data.question]);
      setIndex(0);
      setCompletedCount(0);
      resetRecordingUi();
      setStage("in-progress");
    } catch {
      setGenerateError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function resetRecordingUi() {
    setRecordingState("idle");
    setFeedback(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    recordedBlobRef.current = null;
    chunksRef.current = [];
  }

  function startRecording() {
    if (!micStream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(micStream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      recordedBlobRef.current = blob;
      setAudioUrl(URL.createObjectURL(blob));
      setRecordingState("recorded");
    };
    recorder.start();
    recorderRef.current = recorder;
    recordStartRef.current = Date.now();
    setRecordingState("recording");
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  function reRecord() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    recordedBlobRef.current = null;
    setRecordingState("idle");
  }

  async function submitRecording() {
    if (!recordedBlobRef.current || !currentQuestion) return;
    setRecordingState("uploading");

    const recordedDurationSeconds = Math.max(1, Math.round((Date.now() - recordStartRef.current) / 1000));

    try {
      let recordingId: string;
      try {
        recordingId = await uploadRecording(recordedBlobRef.current, recordedDurationSeconds);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Couldn't save your recording.");
        setStage("error");
        return;
      }

      const timeTakenSeconds = Math.round((Date.now() - questionStartRef.current) / 1000);

      const attemptRes = await fetch("/api/practice/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          recordingId,
          timeTakenSeconds,
        }),
      });
      const attemptData = await attemptRes.json();

      if (!attemptRes.ok) {
        setErrorMessage(attemptData.error || "Couldn't save your attempt.");
        setStage("error");
        return;
      }

      setFeedback({
        scoringCriteria: attemptData.scoringCriteria,
        durationSeconds: recordedDurationSeconds,
        attemptId: attemptData.attemptId,
      });
      setCompletedCount((c) => c + 1);
      setCompletedAttemptIds((ids) => [...ids, attemptData.attemptId]);
    } catch {
      setErrorMessage("Network error while saving your recording.");
      setStage("error");
    } finally {
      setRecordingState("recorded");
    }
  }

  function nextQuestion() {
    if (index + 1 >= questions.length) {
      setStage("finished");
      return;
    }
    setIndex((i) => i + 1);
    resetRecordingUi();
  }

  if (stage === "system-check") {
    return <SystemCheck requireCamera={false} onReady={handleSystemReady} />;
  }

  if (stage === "pick-difficulty") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <Link href="/practice" className="btn-ghost btn-sm -ml-3">
          <Icon as={ArrowLeft} />
          Back to Practice
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-ink-950">{mode.label}</h1>
        <p className="mt-1 text-sm text-slate-600">{mode.description}</p>

        <p className="mt-8 text-sm font-medium text-slate-700">Choose a difficulty</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {DIFFICULTIES.map((d) => (
            <button key={d} onClick={() => startSession(d)} className="btn-secondary btn-lg justify-between">
              {DIFFICULTY_LABELS[d]}
              <Icon as={ArrowRight} />
            </button>
          ))}
        </div>

        {AI_SCENARIO_CATEGORIES.has(mode.category) && (
          <div className="card mt-8 p-5">
            <h2 className="text-sm font-semibold text-ink-900">Or generate a custom AI scenario</h2>
            <p className="mt-1 text-xs text-slate-500">
              Get a fresh, one-off scenario on a topic of your choice instead of the standard question bank.
              This calls a paid AI model, so it only runs when you ask.
            </p>
            <input
              type="text"
              aria-label="Optional topic for the AI-generated scenario"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={MAX_TOPIC_LENGTH}
              placeholder="Optional topic, e.g. flight delay complaint"
              disabled={generating}
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:opacity-60"
            />
            {generateError && (
              <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {generateError}
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => generateAndStart(d)}
                  disabled={generating && difficulty !== d}
                  data-loading={(generating && difficulty === d) || undefined}
                  className="btn-primary btn-sm"
                >
                  <Icon as={Sparkles} />
                  {generating && difficulty === d ? "Generating..." : `Generate (${DIFFICULTY_LABELS[d]})`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-32 animate-pulse rounded-lg bg-slate-200" />
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
        <button onClick={() => setStage("pick-difficulty")} className="btn-secondary mt-4">
          <Icon as={RotateCcw} />
          Try again
        </button>
      </div>
    );
  }

  if (stage === "finished") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-ink-950">Session complete</h1>
        <p className="mt-3 text-slate-600">
          {completedCount} recording{completedCount === 1 ? "" : "s"} saved at{" "}
          {difficulty ? DIFFICULTY_LABELS[difficulty] : ""} level. Open a recording below to run real
          transcription and AI analysis on it - pronunciation, fluency, grammar, vocabulary and delivery.
        </p>
        {completedAttemptIds.length > 0 && (
          <ul className="card mx-auto mt-6 max-w-xs space-y-1 p-4 text-left text-sm">
            {completedAttemptIds.map((id, i) => (
              <li key={id}>
                <Link href={`/practice/results/${id}`} className="text-brand-600 hover:underline">
                  Recording {i + 1} analysis &rarr;
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={() => setStage("pick-difficulty")} className="btn-secondary">
            <Icon as={RotateCcw} />
            Practice again
          </button>
          <Link href="/dashboard" className="btn-primary">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // in-progress
  if (!currentQuestion) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <span className={secondsLeft <= 10 ? "font-semibold text-red-600" : ""}>{secondsLeft}s left</span>
      </div>

      <div className="card mt-4 p-6">
        {currentQuestion.source === "AI_GENERATED" && (
          <span className="mb-3 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
            AI-generated scenario
          </span>
        )}
        {/* Only the parsed stimulus is ever shown - never the raw passage. */}
        <StimulusView stimulus={currentQuestion.stimulus} resetKey={currentQuestion.id} />
        <h2 className="font-medium text-ink-900">{currentQuestion.prompt}</h2>

        <div className="mt-6">
          {recordingState === "idle" && (
            <button onClick={startRecording} className="btn-primary">
              <Icon as={Mic} />
              Start recording
            </button>
          )}

          {recordingState === "recording" && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
                Recording...
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-red-400 transition-all duration-100" style={{ width: `${micLevel}%` }} />
              </div>
              <button onClick={stopRecording} className="btn-danger mt-4">
                <Icon as={Square} />
                Stop recording
              </button>
            </div>
          )}

          {(recordingState === "recorded" || recordingState === "uploading") && !feedback && (
            <div>
              {audioUrl && <audio controls src={audioUrl} className="w-full" />}
              <div className="mt-4 flex gap-3">
                <button onClick={reRecord} disabled={recordingState === "uploading"} className="btn-secondary">
                  <Icon as={RotateCcw} />
                  Re-record
                </button>
                <button onClick={submitRecording} data-loading={recordingState === "uploading" || undefined} className="btn-primary">
                  {recordingState === "uploading" ? "Saving..." : "Submit"}
                  <Icon as={Check} />
                </button>
              </div>
            </div>
          )}

          {feedback && (
            <div>
              {audioUrl && <audio controls src={audioUrl} className="w-full" />}
              <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                Recording saved ({feedback.durationSeconds}s).
              </p>
              {feedback.scoringCriteria && (
                <p className="mt-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-700">What this is assessed on: </span>
                  {feedback.scoringCriteria}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between">
                <Link href={`/practice/results/${feedback.attemptId}`} className="btn-secondary">
                  <Icon as={AudioLines} />
                  View detailed analysis
                </Link>
                <button onClick={nextQuestion} className="btn-primary">
                  {index + 1 >= questions.length ? "Finish" : "Next question"}
                  <Icon as={ArrowRight} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
