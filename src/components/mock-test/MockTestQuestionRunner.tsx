"use client";

import { useEffect, useRef, useState } from "react";
import { useMicLevel } from "@/hooks/useMicLevel";
import { getModeByCategory, isVoiceCategory } from "@/lib/practice-taxonomy";
import { uploadRecording } from "@/lib/upload-recording-client";
import { StimulusView } from "@/components/questions/StimulusView";
import { ArrowRight, Check, Mic, Play, RotateCcw, Square } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { questionInstruction } from "@/components/questions/question-instruction";
import type { Stimulus } from "@/lib/question-stimulus";

interface TemplateSection {
  order: number;
  category: string;
  difficulty: string;
  questionCount: number;
}

interface Question {
  id: string;
  category: string;
  difficulty: string;
  type: string;
  prompt: string;
  passage: string | null;
  stimulus?: Stimulus;
  options: string[] | null;
  timeLimitSeconds: number;
}

type Phase = "loading-section" | "section-intro" | "answering" | "submitting" | "error" | "all-done";
type RecordingState = "idle" | "recording" | "recorded" | "uploading";

export function MockTestQuestionRunner({
  sections,
  mockTestSessionId,
  micStream,
  onAllSectionsComplete,
}: {
  sections: TemplateSection[];
  mockTestSessionId: string;
  micStream: MediaStream | null;
  onAllSectionsComplete: () => void;
}) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading-section");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [responseText, setResponseText] = useState("");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [answeredCount, setAnsweredCount] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef(0);
  const questionStartRef = useRef(Date.now());
  const micLevel = useMicLevel(recordingState === "recording" ? micStream : null);

  const section = sections[sectionIndex];
  const currentQuestion = questions[questionIndex];
  const totalQuestions = sections.reduce((sum, s) => sum + s.questionCount, 0);

  useEffect(() => {
    if (!section) {
      setPhase("all-done");
      onAllSectionsComplete();
      return;
    }
    setPhase("section-intro");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIndex]);

  useEffect(() => {
    if (phase !== "answering" || !currentQuestion) return;
    setSecondsLeft(currentQuestion.timeLimitSeconds);
    questionStartRef.current = Date.now();

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          if (recorderRef.current?.state === "recording") {
            stopRecording();
          } else {
            submitAnswer(true);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, questionIndex]);

  async function startSection() {
    setPhase("loading-section");
    setError(null);
    try {
      const res = await fetch(
        `/api/practice/questions?category=${section.category}&difficulty=${section.difficulty}&count=${section.questionCount}`
      );
      const data = await res.json();
      if (!res.ok || !data.questions?.length) {
        setError(data.error || "No questions available for this section.");
        setPhase("error");
        return;
      }
      setQuestions(data.questions);
      setQuestionIndex(0);
      setResponseText("");
      setRecordingState("idle");
      setPhase("answering");
    } catch {
      setError("Network error loading this section.");
      setPhase("error");
    }
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
      submitAnswer(false, blob);
    };
    recorder.start();
    recorderRef.current = recorder;
    recordStartRef.current = Date.now();
    setRecordingState("recording");
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function submitAnswer(timedOut: boolean, recordingBlob?: Blob) {
    if (!currentQuestion) return;
    setPhase("submitting");
    setRecordingState("uploading");

    const timeTakenSeconds = Math.round((Date.now() - questionStartRef.current) / 1000);

    try {
      let recordingId: string | undefined;
      if (recordingBlob) {
        const durationSeconds = Math.max(1, Math.round((Date.now() - recordStartRef.current) / 1000));
        recordingId = await uploadRecording(recordingBlob, durationSeconds);
      }

      const attemptRes = await fetch("/api/practice/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          responseText: recordingId ? undefined : timedOut ? responseText || "" : responseText,
          recordingId,
          timeTakenSeconds,
          mockTestSessionId,
        }),
      });
      const attemptData = await attemptRes.json();
      if (!attemptRes.ok) throw new Error(attemptData.error || "Couldn't save your answer.");

      setAnsweredCount((c) => c + 1);
      advance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    } finally {
      setRecordingState("idle");
    }
  }

  function advance() {
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex((i) => i + 1);
      setResponseText("");
      setPhase("answering");
    } else {
      setSectionIndex((i) => i + 1);
    }
  }

  if (phase === "all-done") return null;

  if (phase === "error") {
    return (
      <div className="text-center text-white">
        <p role="alert" className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
        <button onClick={() => setPhase("answering")} className="btn-dark mt-4">
          <Icon as={RotateCcw} />
          Continue
        </button>
      </div>
    );
  }

  if (phase === "section-intro") {
    const modeDef = getModeByCategory(section.category);
    return (
      <div className="text-center text-white">
        <span className="badge" style={{ backgroundColor: "rgba(255,255,255,.1)", color: "#cbd5cf" }}>
          Section {sectionIndex + 1} of {sections.length}
        </span>
        <h2 className="mt-3 font-display text-xl font-bold">{modeDef?.label ?? section.category}</h2>
        <p className="mt-2 text-sm text-slate-300">{modeDef?.description}</p>
        <p className="mt-1 text-xs text-slate-400">{section.questionCount} question{section.questionCount === 1 ? "" : "s"}</p>
        <button onClick={startSection} className="btn-primary btn-lg mt-6">
          <Icon as={Play} />
          Start section
        </button>
      </div>
    );
  }

  if (phase === "loading-section" || !currentQuestion) {
    return (
      <div className="text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  const voice = isVoiceCategory(currentQuestion.category);
  const isChoice = currentQuestion.options && currentQuestion.options.length > 0;

  const modeDef = getModeByCategory(currentQuestion.category);
  const isLastQuestion = sectionIndex + 1 >= sections.length && questionIndex + 1 >= questions.length;

  return (
    <div className="w-full max-w-xl">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold text-slate-200">{modeDef?.label ?? section.category}</span>
        <span
          className={`font-mono text-sm font-semibold ${secondsLeft <= 10 ? "text-red-400" : "text-slate-300"}`}
        >
          {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${(answeredCount / Math.max(1, totalQuestions)) * 100}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          Question {questionIndex + 1} of {questions.length} in this section
        </span>
        <span>
          {answeredCount}/{totalQuestions} overall
        </span>
      </div>

      <div className="mt-4 rounded-lg bg-white p-6 text-ink-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-700">
          {questionInstruction({ ...currentQuestion, isVoice: voice, isChoice: !!isChoice })}
        </p>
        {/* Only the parsed stimulus is ever shown - never the raw passage. */}
        <StimulusView stimulus={currentQuestion.stimulus} resetKey={currentQuestion.id} />
        <h3 className="font-display text-lg font-bold leading-snug">{currentQuestion.prompt}</h3>

        {!voice ? (
          isChoice ? (
            <div className="mt-4 space-y-2">
              {currentQuestion.options!.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setResponseText(opt)}
                  className={`block w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 ${
                    responseText === opt ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={4}
              placeholder="Type your response..."
              className="input-field mt-4"
            />
          )
        ) : (
          <div className="mt-4">
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
                <button onClick={stopRecording} className="btn-danger mt-3">
                  <Icon as={Square} />
                  {isLastQuestion ? "Stop & finish" : "Stop & next"}
                </button>
              </div>
            )}
            {recordingState === "uploading" && (
              <button type="button" data-loading="true" className="btn-secondary">
                Saving your answer...
              </button>
            )}
          </div>
        )}

        {!voice && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => submitAnswer(false)}
              disabled={!responseText.trim()}
              data-loading={phase === "submitting" || undefined}
              className="btn-primary"
            >
              {phase === "submitting" ? "Saving..." : isLastQuestion ? "Submit & finish" : "Submit & next"}
              <Icon as={isLastQuestion ? Check : ArrowRight} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
